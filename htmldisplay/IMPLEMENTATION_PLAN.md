# Implementation Plan - HTMLDisplay Plugin

This plan outlines the steps to build the HTMLDisplay Stream Deck plugin, aligned with the PRD and the documentation found in `docs/streamdeck-kb`.

## Phase 1: Project Setup & Dependencies

**Goal:** Prepare the environment with necessary libraries for server handling, image generation, and file operations.

1.  **Install Dependencies:**
    *   `express` (or `fastify`/`http`): For the local web server to serve HTML content.
    *   `open`: To open URLs in the default browser or as an app window.
    *   `cheerio`: For robust HTML parsing (to extract `<meta>` tags) without a full DOM.
    *   `node-canvas` (or `canvas`): For server-side image rendering (Live Preview). *Note: This might require build tools. Alternative: `jimp` or pure SVG generation if `canvas` is too heavy.*
    *   `uuid`: For generating unique session IDs if needed.

2.  **Update Manifest:**
    *   Ensure `manifest.json` points to the correct `PropertyInspectorPath` (`ui/index.html`).
    *   Verify permissions (if any specific OS permissions are needed, though standard Node.js plugins usually have broad access).

## Phase 2: Property Inspector (UI)

**Goal:** Create the configuration interface using `sdpi-components` as recommended in `docs/.../property-inspector-templates.md`.

1.  **Create `ui/index.html`:**
    *   Import `sdpi-components`.
    *   **Source Selection:** `<sdpi-select>` for "Direct Input" vs "Local File".
    *   **Content Input:**
        *   `<sdpi-textarea>` for Direct Input (hidden if File selected).
        *   `<sdpi-file>` for Local File (hidden if Direct selected).
    *   **Display Options:**
        *   `<sdpi-select>` for "Window Mode" (Popup vs Browser).
        *   `<sdpi-textfield>` for Width/Height (only for Popup).
    *   **Preview:**
        *   Add a "Refresh Preview" button (using `<sdpi-button>`).
        *   Add an info label explaining the `<meta name="sd-preview">` feature.

2.  **Logic (`ui/js/app.js` or inline):**
    *   Handle visibility toggling between Direct/File inputs based on the dropdown.
    *   Send settings to the plugin backend when changed.

## Phase 3: Core Plugin Logic (Backend)

**Goal:** Implement the server, action handling, and image generation in `src/plugin.ts` and helper classes.

1.  **Server Manager (`src/managers/ServerManager.ts`):**
    *   Create a singleton class to manage the Express server.
    *   **Start/Stop:** Start on a random available port (0) or a fixed range.
    *   **Routes:**
        *   `GET /view/:actionId`: Serves the HTML content for a specific action instance.
        *   **Direct Input:** Wraps the user's HTML string in a basic template.
        *   **File Input:** Serves the file from the disk.
    *   **Security:** Ensure we only serve files explicitly selected by the user.

2.  **Image Generator (`src/utils/ImageGenerator.ts`):**
    *   **Meta-Tag Parser:** Use `cheerio` to load the HTML and look for `<meta name="sd-preview" content="...">`.
        *   If found, resolve the path (relative to the HTML file or absolute) and load the image.
    *   **Live Renderer (Fallback):**
        *   If no meta tag, use `canvas` to draw a simple preview (e.g., text on a background).
        *   *Optimization:* If `canvas` is too complex to install, generate an SVG string and convert it to base64 (Stream Deck supports SVG).

3.  **Action Implementation (`src/actions/display-action.ts`):**
    *   **`onWillAppear`:**
        *   Read settings.
        *   Call `ImageGenerator` to get the preview image.
        *   `ev.action.setImage(image)`.
    *   **`onDidReceiveSettings`:**
        *   Re-run image generation and update the key.
    *   **`onKeyDown`:**
        *   **Step 1:** Ensure Server is running.
        *   **Step 2:** Construct the URL (e.g., `http://localhost:12345/view/action-uuid`).
        *   **Step 3:** Open the Window.
            *   **Browser Mode:** `open(url)`.
            *   **Popup Mode:** `open(url, { app: { name: 'chrome', arguments: ['--app=' + url, '--window-size=800,600'] } })`.

## Phase 4: Integration & Testing

1.  **Manual Testing:**
    *   Test "Direct Input" with simple HTML (`<h1>Hello</h1>`).
    *   Test "Local File" with a complex HTML file (including CSS/JS assets).
    *   Test "Popup" vs "Browser" modes.
    *   Test the `<meta>` tag preview feature.

2.  **Refinement:**
    *   Handle port conflicts.
    *   Ensure the popup window behaves consistently on Windows (user's OS).

## Phase 5: Documentation

1.  **Update README:** Instructions on how to use the `<meta>` tag and the different modes.
