import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, DidReceiveSettingsEvent, SendToPluginEvent } from "@elgato/streamdeck";

// Define JsonValue type locally since it's not exported from @elgato/streamdeck
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
import open, { apps } from 'open';
import { ServerManager } from "../managers/ServerManager";
import { ImageGenerator } from "../utils/ImageGenerator";
import { marked } from 'marked';

type MarkdownSettings = {
    sourceType: 'direct' | 'file';
    markdownContent?: string;
    filePath?: string;
    windowMode: 'popup' | 'browser';
    windowWidth?: string;
    windowHeight?: string;
    theme?: 'light' | 'dark';
};

@action({ UUID: "com.nicco-hagedorn.htmldisplay.markdown" })
export class MarkdownAction extends SingletonAction<MarkdownSettings> {
    
    private listenerInitialized = false;
    private settingsCache: Map<string, MarkdownSettings> = new Map();

    private ensureListener() {
        if (this.listenerInitialized) return;
        this.listenerInitialized = true;

        const server = ServerManager.getInstance();
        server.onConnectionChange(async (actionId: string, connected: boolean) => {
            const settings = this.settingsCache.get(actionId);
            if (settings) {
                await this.updateImage(actionId, settings, connected);
            }
        });
    }

    override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, MarkdownSettings>) {
        const payload = ev.payload as { event?: string };
        if (payload.event === 'refreshPreview') {
            const actionId = ev.action.id;
            const settings = this.settingsCache.get(actionId);
            if (settings) {
                await this.updateImage(actionId, settings);
            }
        }
    }

    override async onWillAppear(ev: WillAppearEvent<MarkdownSettings>) {
        this.settingsCache.set(ev.action.id, ev.payload.settings);
        await this.updateContent(ev.action.id, ev.payload.settings);
        await this.updateImage(ev.action.id, ev.payload.settings);
    }

    override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<MarkdownSettings>) {
        this.settingsCache.set(ev.action.id, ev.payload.settings);
        await this.updateContent(ev.action.id, ev.payload.settings);
        await this.updateImage(ev.action.id, ev.payload.settings);
    }

	    override async onKeyDown(ev: KeyDownEvent<MarkdownSettings>) {
        this.settingsCache.set(ev.action.id, ev.payload.settings);
        const settings = ev.payload.settings;
	        const server = ServerManager.getInstance();
	        await server.start();

        this.ensureListener();

        if (server.hasConnection(ev.action.id)) {
            server.closeWindow(ev.action.id);
            return;
        }

	        const url = `${server.getBaseUrl()}/view/${ev.action.id}`;
	        const width = parseInt(settings.windowWidth || '800');
	        const height = parseInt(settings.windowHeight || '600');
	        const isMac = process.platform === 'darwin';

	        try {
	            if (settings.windowMode === 'browser' || isMac) {
	                // On macOS we always fall back to the system browser for maximum compatibility
	                await open(url);
	            } else {
	                await open(url, {
	                    app: {
	                        name: apps.chrome,
	                        arguments: [`--app=${url}`, `--window-size=${width},${height}`]
	                    }
	                });
	            }
	        } catch (error) {
	            console.error('[MarkdownAction] Failed to open popup/browser window, falling back to default browser:', error);
	            try {
	                await open(url);
	            } catch (fallbackError) {
	                console.error('[MarkdownAction] Fallback open() also failed:', fallbackError);
	            }
	        }
    }

    private async updateContent(actionId: string, settings: MarkdownSettings) {
        const server = ServerManager.getInstance();
        await server.start();

        const html = this.convertMarkdownToHtml(settings);

        // Register the rendered HTML content with the server
        server.registerContent(actionId, 'direct', html);
    }

    private convertMarkdownToHtml(settings: MarkdownSettings): string {
        const markdown = settings.markdownContent || '# Hello Markdown';
        const theme = settings.theme || 'dark';
        const renderedContent = marked.parse(markdown) as string;

        const bgColor = theme === 'dark' ? '#1e1e1e' : '#ffffff';
        const textColor = theme === 'dark' ? '#f0f0f0' : '#333333';
        const codeColor = theme === 'dark' ? '#2d2d2d' : '#f4f4f4';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="sd-preview" content="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNDQiIGhlaWdodD0iMTQ0IiB2aWV3Qm94PSIwIDAgMTQ0IDE0NCI+PHJlY3Qgd2lkdGg9IjE0NCIgaGVpZ2h0PSIxNDQiIHJ4PSIxNiIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjcyIiB5PSI4NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjcwIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk08L3RleHQ+PHRleHQgeD0iNzIiIHk9IjEyMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7ihpM8L3RleHQ+PC9zdmc+">
    <title>Markdown View</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: ${bgColor}; color: ${textColor}; padding: 2rem; line-height: 1.6; }
        pre, code { background: ${codeColor}; padding: 0.2em 0.4em; border-radius: 4px; }
        pre { padding: 1em; overflow-x: auto; }
        h1, h2, h3 { border-bottom: 1px solid ${theme === 'dark' ? '#444' : '#ddd'}; padding-bottom: 0.3em; }
        a { color: #58a6ff; }
        blockquote { border-left: 4px solid #444; padding-left: 1em; margin-left: 0; color: #888; }
    </style>
</head>
<body>${renderedContent}</body>
</html>`;
    }

    private async updateImage(actionId: string, settings: MarkdownSettings, connected?: boolean) {
        // Use the ImageGenerator with the rendered HTML content
        const image = await ImageGenerator.generatePreview('direct', this.convertMarkdownToHtml(settings), connected ?? false);

        // @ts-ignore
        for (const action of streamDeck.actions) {
            if (action.id === actionId) {
                await action.setImage(image);
            }
        }
    }
}

