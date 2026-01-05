# HTMLDisplay Stream Deck Plugin

This plugin allows you to display custom HTML content in a minimalist popup window or your default browser.

## Features

*   **Direct Input:** Paste HTML code directly into the Property Inspector.
*   **Local File:** Select an HTML file from your computer.
*   **Smart Preview:** Automatically generates a key icon based on your HTML content.
*   **Display Modes:** Choose between a clean popup window or your standard browser.

## Usage

1.  Drag the **Show HTML** action to a key.
2.  In the Property Inspector:
    *   Select **Content Source**: "Direct Input" or "Local File".
    *   Enter your HTML or select a file.
    *   Choose **Window Mode**.
3.  Press the key to open the content.

## Smart Previews

To set a custom icon for your key, add the following meta tag to your HTML:

```html
<meta name="sd-preview" content="./icon.png">
```

*   **Direct Input:** The content must be a base64 string (e.g., `data:image/png;base64,...`).
*   **Local File:** The content can be a relative path to an image file next to your HTML file.

If no meta tag is found, the plugin will generate a simple text preview.

## Development

1.  Install dependencies: `npm install`
2.  Build the plugin: `npm run build`
3.  Watch for changes: `npm run watch`
