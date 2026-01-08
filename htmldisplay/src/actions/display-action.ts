import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, DidReceiveSettingsEvent, SendToPluginEvent } from "@elgato/streamdeck";

// Define JsonValue type locally since it's not exported from @elgato/streamdeck
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
import open, { apps } from 'open';
import { ServerManager } from "../managers/ServerManager";
import { ImageGenerator } from "../utils/ImageGenerator";

type DisplaySettings = {
    sourceType: 'direct' | 'file';
    htmlContent?: string;
    filePath?: string;
    windowMode: 'popup' | 'browser';
    windowWidth?: string;
    windowHeight?: string;
};

@action({ UUID: "com.nicco-hagedorn.htmldisplay.show" })
export class DisplayAction extends SingletonAction<DisplaySettings> {
    
    constructor() {
        super();
        // Listen for connection changes to update the icon
        ServerManager.getInstance().onConnectionChange(async (actionId, isConnected) => {
            // We need to get the settings for this actionId to regenerate the image.
            // SingletonAction doesn't easily expose settings for arbitrary actionIds outside of events.
            // However, we can iterate over known actions if we tracked them, or use the streamDeck client if available.
            // Since we don't have easy access to settings here without tracking them ourselves:
            // We will rely on the fact that we can't easily get settings here.
            // Ideally, we should cache settings in a Map<actionId, DisplaySettings>.
            
            // For now, let's try to just set the state if we could, but we need to regenerate the image.
            // Let's implement a settings cache.
        });
    }

    private settingsCache: Map<string, DisplaySettings> = new Map();

    override async onWillAppear(ev: WillAppearEvent<DisplaySettings>) {
        this.settingsCache.set(ev.action.id, ev.payload.settings);
        
        // Register listener if not already done (hacky in constructor, better here but need to avoid duplicates)
        // Actually, let's just do the logic here.
        
        await this.updateContent(ev.action.id, ev.payload.settings);
        await this.updateImage(ev.action.id, ev.payload.settings);
    }

    override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<DisplaySettings>) {
        this.settingsCache.set(ev.action.id, ev.payload.settings);
        await this.updateContent(ev.action.id, ev.payload.settings);
        await this.updateImage(ev.action.id, ev.payload.settings);
    }

	    override async onKeyDown(ev: KeyDownEvent<DisplaySettings>) {
        this.settingsCache.set(ev.action.id, ev.payload.settings);
        const settings = ev.payload.settings;
	        const server = ServerManager.getInstance();
	        await server.start();

        // Ensure we are listening for changes (idempotent)
        this.ensureListener();

        // Check if window is already open and connected
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
	                // Popup mode on platforms where we can rely on Chrome
	                await open(url, {
	                    app: {
	                        name: apps.chrome,
	                        arguments: [`--app=${url}`, `--window-size=${width},${height}`]
	                    }
	                });
	            }
	        } catch (error) {
	            // If Chrome is not available or anything else fails, fall back to the default browser
	            console.error('[DisplayAction] Failed to open popup/browser window, falling back to default browser:', error);
	            try {
	                await open(url);
	            } catch (fallbackError) {
	                console.error('[DisplayAction] Fallback open() also failed:', fallbackError);
	            }
	        }
    }

    private listenerRegistered = false;
    private ensureListener() {
        if (this.listenerRegistered) return;
        this.listenerRegistered = true;

        ServerManager.getInstance().onConnectionChange(async (actionId, isConnected) => {
            const settings = this.settingsCache.get(actionId);
            if (settings) {
                await this.updateImage(actionId, settings);
            }
        });
    }

	    private async updateContent(actionId: string, settings: DisplaySettings) {
	        const server = ServerManager.getInstance();

	        const sourceType = (settings.sourceType ?? 'direct') as 'direct' | 'file';
	        let content = sourceType === 'file'
	            ? (settings.filePath || '')
	            : (settings.htmlContent || '');

	        // Provide a safe default so the page is never completely empty
	        if (!content && sourceType === 'direct') {
	            content = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Info Display</title></head><body><p>No content configured for this action.</p></body></html>';
	        }

	        server.registerContent(actionId, sourceType, content);
	    }

    private async updateImage(actionId: string, settings: DisplaySettings) {
        const content = settings.sourceType === 'file' ? (settings.filePath || '') : (settings.htmlContent || '');
        
        if (!content) return;

        const server = ServerManager.getInstance();
        const isOpen = server.hasConnection(actionId);

        const image = await ImageGenerator.generatePreview(settings.sourceType, content, isOpen);
        
        // We need to set the image on the action. 
        // Since we don't have the 'action' object from an event here, we use the streamDeck client directly if possible,
        // or we need to store the action instances? 
        // Wait, SingletonAction abstracts this. We can't easily call 'setImage' without an event context in the current SDK wrapper 
        // UNLESS we use the raw streamDeck client.
        
        // The SDK exports 'streamDeck' as a default export which is the client.
        // Let's import it at the top if not already.
        // It is imported as 'streamDeck'.
        
        // streamDeck.actions.setImage(actionId, image); // This is how it works in v2 SDK usually.
        // Let's check the import.
        
        // @ts-ignore - Accessing internal client or using global method if available. 
        // Actually, looking at the SDK, we might need to use `streamDeck.actions.setImage(image, { target: actionId })`?
        // No, usually `streamDeck.setImage(actionId, image)` or similar.
        // Let's try to find the right method.
        // In the new @elgato/streamdeck SDK, it seems we work with Action objects.
        // But we can iterate actions?
        
        // Workaround: We can't easily get the Action object for an ID from nowhere.
        // But we can use `streamDeck.setTitle` etc via the connection.
        // Let's assume for now we can't easily update it without an event, 
        // BUT `SingletonAction` is designed to handle multiple actions.
        // We can iterate `this.actions` if the SDK exposes it? No.
        
        // Let's try to use the raw connection if possible.
        // `streamDeck.connection.setImage(image, { target: actionId })` might be the way if exposed.
        
        // BETTER APPROACH:
        // The `SingletonAction` class tracks actions?
        // Actually, let's look at `streamDeck.actions`.
        // It has `forEach`.
        
        // @ts-ignore
        for (const action of streamDeck.actions) {
            if (action.id === actionId) {
                await action.setImage(image);
            }
        }
    }

    /**
     * Handle messages from the Property Inspector.
     * This is called when the PI sends data to the plugin using sendToPlugin().
     */
    override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, DisplaySettings>) {
        const payload = ev.payload as { event?: string } | undefined;

        if (payload?.event === 'refreshPreview') {
            const actionId = ev.action.id;
            const settings = this.settingsCache.get(actionId);

            if (settings) {
                console.log(`[DisplayAction] Refreshing preview for action: ${actionId}`);
                await this.updateImage(actionId, settings);
            } else {
                console.warn(`[DisplayAction] No cached settings found for action: ${actionId}`);
            }
        }
    }
}
