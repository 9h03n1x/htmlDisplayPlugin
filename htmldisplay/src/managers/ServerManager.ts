import express from 'express';
import { Server } from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';

// Blocked system paths for security
const BLOCKED_PATHS_WINDOWS = [
    'C:\\Windows',
    'C:\\Program Files',
    'C:\\Program Files (x86)',
    'C:\\ProgramData',
    'C:\\Users\\All Users',
];

const BLOCKED_PATHS_UNIX = [
    '/etc',
    '/usr',
    '/var',
    '/bin',
    '/sbin',
    '/lib',
    '/root',
    '/sys',
    '/proc',
];

export class ServerManager {
    private static instance: ServerManager;
    private app: express.Express;
    private server: Server | null = null;
    private wss: WebSocketServer | null = null;
    private port: number = 0;
    private activeActions: Map<string, { type: 'direct' | 'file', content: string }> = new Map();
    private activeConnections: Map<string, WebSocket> = new Map();
    private connectionListeners: ((actionId: string, isConnected: boolean) => void)[] = [];

    private constructor() {
        this.app = express();
        this.setupRoutes();
    }

    /**
     * Validates that a file path is safe to serve.
     * Prevents path traversal attacks and blocks access to system directories.
     */
    private isPathSafe(filePath: string): boolean {
        try {
            // Normalize and resolve the path to handle any ../ segments
            const normalizedPath = path.normalize(path.resolve(filePath));

            // Check if the file exists
            if (!fs.existsSync(normalizedPath)) {
                return false;
            }

            // Check if it's a file (not a directory)
            const stats = fs.statSync(normalizedPath);
            if (!stats.isFile()) {
                return false;
            }

            // Check against blocked system paths
            const blockedPaths = process.platform === 'win32' ? BLOCKED_PATHS_WINDOWS : BLOCKED_PATHS_UNIX;
            const upperPath = normalizedPath.toUpperCase();

            for (const blockedPath of blockedPaths) {
                if (upperPath.startsWith(blockedPath.toUpperCase())) {
                    console.warn(`[Security] Blocked access to system path: ${normalizedPath}`);
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('[Security] Error validating path:', error);
            return false;
        }
    }

    /**
     * Validates that a static asset path is within the allowed base directory.
     */
    private isStaticPathSafe(requestedPath: string, baseDir: string): boolean {
        try {
            const resolvedBase = path.resolve(baseDir);
            const resolvedPath = path.resolve(baseDir, requestedPath);

            // Ensure the resolved path starts with the base directory (prevents path traversal)
            if (!resolvedPath.startsWith(resolvedBase)) {
                console.warn(`[Security] Path traversal attempt blocked: ${requestedPath}`);
                return false;
            }

            return this.isPathSafe(resolvedPath);
        } catch (error) {
            console.error('[Security] Error validating static path:', error);
            return false;
        }
    }

    public static getInstance(): ServerManager {
        if (!ServerManager.instance) {
            ServerManager.instance = new ServerManager();
        }
        return ServerManager.instance;
    }

    public onConnectionChange(listener: (actionId: string, isConnected: boolean) => void) {
        this.connectionListeners.push(listener);
    }

    private notifyConnectionChange(actionId: string, isConnected: boolean) {
        this.connectionListeners.forEach(listener => listener(actionId, isConnected));
    }

    private setupRoutes() {
        // Static file serving for local HTML assets (CSS, JS, images)
        // Express 5 uses *paramName syntax for wildcards
        this.app.get('/static/:actionId/*filePath', (req, res) => {
            const actionId = req.params.actionId;
            const data = this.activeActions.get(actionId);

            if (!data || data.type !== 'file') {
                return res.status(404).send('Action not found or not a file-based action.');
            }

            // Get the base directory of the HTML file
            const baseDir = path.dirname(data.content);
            // Get the requested file path from the wildcard parameter
            // Express 5 wildcard params use *paramName syntax
            const requestedFile = (req.params as Record<string, string>).filePath || '';

            // Security check: ensure the path is safe
            if (!this.isStaticPathSafe(requestedFile, baseDir)) {
                return res.status(403).send('Access denied.');
            }

            const fullPath = path.resolve(baseDir, requestedFile);
            res.sendFile(fullPath);
        });

        // Main HTML content route
        this.app.get('/view/:actionId', (req, res) => {
            const actionId = req.params.actionId;
            const data = this.activeActions.get(actionId);

            if (!data) {
                return res.status(404).send('Action not found or content not configured.');
            }

            let htmlContent = '';
            let baseDir = '';

            if (data.type === 'direct') {
                htmlContent = data.content;
            } else if (data.type === 'file') {
                // Security check: validate the file path
                if (!this.isPathSafe(data.content)) {
                    return res.status(403).send('Access denied: Invalid or unsafe file path.');
                }

                try {
                    htmlContent = fs.readFileSync(data.content, 'utf-8');
                    baseDir = path.dirname(data.content);
                } catch (error) {
                    console.error('Error reading file:', error);
                    return res.status(500).send('Error reading file.');
                }
            }

            // Rewrite relative paths to use our static file route (for file-based content)
            if (data.type === 'file' && baseDir) {
                htmlContent = this.rewriteRelativePaths(htmlContent, actionId);
            }

            // Inject WebSocket script
            const injectedHtml = this.injectClientScript(htmlContent, actionId);
            res.send(injectedHtml);
        });
    }

    /**
     * Rewrites relative paths in HTML to use the static file serving route.
     * This allows CSS, JS, and images to be loaded correctly.
     */
    private rewriteRelativePaths(html: string, actionId: string): string {
        const staticPrefix = `/static/${actionId}/`;

        // Rewrite src attributes (for scripts, images, etc.)
        // Matches src="..." that don't start with http, https, data:, or /
        html = html.replace(
            /(\s(?:src|href)=["'])(?!(?:https?:|data:|\/|#))([^"']+)(["'])/gi,
            `$1${staticPrefix}$2$3`
        );

        // Rewrite url() in inline styles
        html = html.replace(
            /(url\(["']?)(?!(?:https?:|data:|\/))([^"')]+)(["']?\))/gi,
            `$1${staticPrefix}$2$3`
        );

        return html;
    }

    private injectClientScript(html: string, actionId: string): string {
        const script = `
        <script>
            (function() {
                const ws = new WebSocket('ws://localhost:${this.port}?actionId=${actionId}');
                ws.onmessage = (event) => {
                    if (event.data === 'close') {
                        window.close();
                    }
                };
                // Optional: Close window if server disconnects (plugin stops)
                ws.onclose = () => {
                    // console.log('Disconnected from plugin');
                };
            })();
        </script>
        `;
        
        // Insert before </body> if exists, otherwise append
        if (html.includes('</body>')) {
            return html.replace('</body>', `${script}</body>`);
        } else {
            return html + script;
        }
    }

    public async start(): Promise<number> {
        if (this.server) {
            return this.port;
        }

        return new Promise((resolve, reject) => {
            this.server = this.app.listen(0, () => {
                const addr = this.server?.address();
                if (addr && typeof addr !== 'string') {
                    this.port = addr.port;
                    console.log(`Server started on port ${this.port}`);
                    
                    // Initialize WebSocket Server
                    // Note: this.server is guaranteed to be non-null here since we're in the listen callback
                    this.wss = new WebSocketServer({ server: this.server! });
                    this.wss.on('connection', (ws, req) => {
                        const url = new URL(req.url || '', `http://localhost:${this.port}`);
                        const actionId = url.searchParams.get('actionId');
                        
                        if (actionId) {
                            this.activeConnections.set(actionId, ws);
                            this.notifyConnectionChange(actionId, true);
                            
                            ws.on('close', () => {
                                this.activeConnections.delete(actionId);
                                this.notifyConnectionChange(actionId, false);
                            });
                        }
                    });

                    resolve(this.port);
                } else {
                    reject(new Error('Failed to get server port'));
                }
            });
        });
    }

    public registerContent(actionId: string, type: 'direct' | 'file', content: string) {
        this.activeActions.set(actionId, { type, content });
    }

    public getBaseUrl(): string {
        return `http://localhost:${this.port}`;
    }

    public hasConnection(actionId: string): boolean {
        const ws = this.activeConnections.get(actionId);
        return !!ws && ws.readyState === WebSocket.OPEN;
    }

    public closeWindow(actionId: string) {
        const ws = this.activeConnections.get(actionId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send('close');
            ws.close();
            this.activeConnections.delete(actionId);
        }
    }
}
