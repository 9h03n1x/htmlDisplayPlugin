# Product Requirements Document: HTMLDisplay Stream Deck Plugin

## 1. Product Overview
**Product Name:** HTMLDisplay  
**Version:** 1.0.0  
**Purpose:** A Stream Deck plugin that allows users to display custom HTML content for tutorial, informational, or utility purposes. It supports opening content in a minimalist popup window or the default browser, with flexible content sourcing and smart key preview generation.

## 2. User Stories
*   **As a user**, I want to paste a snippet of HTML code directly into the Stream Deck software so I can quickly display a note or cheat sheet without creating a file.
*   **As a user**, I want to link to a local HTML file so I can display complex, multi-file web pages (with CSS/JS).
*   **As a user**, I want the content to open in a clean, borderless popup window by default so it looks like a dedicated widget.
*   **As a user**, I want the option to open content in my default browser if I need full browser features (bookmarks, extensions).
*   **As a user**, I want the key icon to automatically reflect the content of the HTML (via a meta tag or live rendering) so I can easily identify the button's function.

## 3. Functional Requirements

### 3.1. Action: "Show HTML"
*   **Trigger:** Key Down (Standard Press).
*   **Behavior:** Opens the configured HTML content.
*   **Toggle Behavior:** If the popup is already open, pressing the key again should bring it to focus (or optionally close it - TBD during implementation).

### 3.2. Property Inspector (Settings)
The Property Inspector (PI) will have the following sections:

#### A. Content Source
*   **Source Selector:** Dropdown [ `Direct Input` | `Local File` ]
*   **Direct Input Mode:** A multi-line text area for pasting HTML code.
*   **Local File Mode:** A file picker to select an `.html` file from the local disk.

#### B. Display Options
*   **Window Mode:** Dropdown [ `Minimalist Popup` (Default) | `Default Browser` ]
*   **Window Dimensions:** (Only for Popup mode) Inputs for `Width` and `Height` (e.g., 800x600).

#### C. Preview Options
*   **Preview Strategy:** Information label explaining how the icon is generated.
*   **Refresh Button:** A button to force-regenerate the preview icon based on the current HTML content.

### 3.3. Display Logic
*   **Minimalist Popup (Default):**
    *   The plugin will spin up a lightweight local web server (e.g., using `express` or standard `http` module) to serve the content.
    *   The window will be opened using a method that minimizes browser chrome (e.g., `window.open` with specific flags or a helper executable if necessary).
*   **Default Browser:**
    *   Uses the system's default handler to open the URL/File.

### 3.4. Smart Preview Logic (The "Cool" Feature)
The plugin determines the key image in the following priority order:
1.  **Meta-Tag Extraction:** The plugin parses the HTML source. If it finds `<meta name="sd-preview" content="path/to/image.png">`, it resolves that path and sets it as the key image.
2.  **Live Rendering:** If no meta-tag is found, the plugin attempts to render the HTML content onto a canvas and downscale it to 72x72px (best for simple "Direct Input" HTML).
3.  **Default Icon:** If neither above works, the default plugin icon is used.

## 4. Technical Requirements
*   **Language:** TypeScript
*   **Runtime:** Node.js (Stream Deck SDK v2)
*   **Server:** A lightweight internal HTTP server is required to serve local files properly to the popup window (avoiding `file://` protocol restrictions where possible).
*   **Parsing:** Need a robust way to parse HTML strings for the `<meta>` tag without executing scripts (e.g., regex or a lightweight DOM parser).

## 5. Future Considerations (v1.1+)
*   "Capture Current View" button in Property Inspector.
*   Support for Markdown rendering.
*   Hot-reloading the popup when HTML changes.
