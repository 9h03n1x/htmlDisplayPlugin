import express from 'express';
import { Server } from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';

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
        this.app.get('/view/:actionId', (req, res) => {
            const actionId = req.params.actionId;
            const data = this.activeActions.get(actionId);

            if (!data) {
                return res.status(404).send('Action not found or content not configured.');
            }

            let htmlContent = '';
            if (data.type === 'direct') {
                htmlContent = data.content;
            } else if (data.type === 'file') {
                if (fs.existsSync(data.content)) {
                    htmlContent = fs.readFileSync(data.content, 'utf-8');
                } else {
                    return res.status(404).send('File not found.');
                }
            }

            // Inject WebSocket script
            const injectedHtml = this.injectClientScript(htmlContent, actionId);
            res.send(injectedHtml);
        });
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
                    this.wss = new WebSocketServer({ server: this.server });
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
