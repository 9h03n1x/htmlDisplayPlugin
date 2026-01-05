const sourceTypeSelect = document.getElementById('sourceType');
const directInputGroup = document.getElementById('directInputGroup');
const fileInputGroup = document.getElementById('fileInputGroup');
const windowModeSelect = document.getElementById('windowMode');
const popupSizeGroup = document.getElementById('popupSizeGroup');
const refreshPreviewBtn = document.getElementById('refreshPreview');

// Separate functions to avoid cross-contamination of state
window.updateSourceVisibility = function() {
    const sourceTypeSelect = document.getElementById('sourceType');
    const directInputGroup = document.getElementById('directInputGroup');
    const fileInputGroup = document.getElementById('fileInputGroup');

    // Reverting to standard logic: if value is 'direct', show direct group.
    // If this was failing before, it might be due to initialization timing, but this is the correct logic.
    const source = sourceTypeSelect.value;
    if (source === 'direct') {
        directInputGroup.classList.remove('hidden');
        fileInputGroup.classList.add('hidden');
    } else {
        directInputGroup.classList.add('hidden');
        fileInputGroup.classList.remove('hidden');
    }
}

window.updateWindowModeVisibility = function() {
    const windowModeSelect = document.getElementById('windowMode');
    const popupSizeGroup = document.getElementById('popupSizeGroup');

    const mode = windowModeSelect.value;
    if (mode === 'popup') {
        popupSizeGroup.classList.remove('hidden');
    } else {
        popupSizeGroup.classList.add('hidden');
    }
}

// Initialize listeners once components are ready
document.addEventListener('DOMContentLoaded', () => {
    const refreshPreviewBtn = document.getElementById('refreshPreview');
    const sourceTypeSelect = document.getElementById('sourceType');
    const windowModeSelect = document.getElementById('windowMode');

    // Wait for SDPI components to initialize values
    setTimeout(() => {
        window.updateSourceVisibility();
        window.updateWindowModeVisibility();
    }, 100);

    // Add listeners for both change and input events to be safe
    sourceTypeSelect.addEventListener('change', window.updateSourceVisibility);
    sourceTypeSelect.addEventListener('input', window.updateSourceVisibility);
    windowModeSelect.addEventListener('change', window.updateWindowModeVisibility);
    windowModeSelect.addEventListener('input', window.updateWindowModeVisibility);

    refreshPreviewBtn.addEventListener('click', () => {
        // Send a message to the plugin to regenerate the preview
        if (window.$SD) {
            window.$SD.sendToPlugin({
                event: 'refreshPreview'
            });
        }
    });
});
