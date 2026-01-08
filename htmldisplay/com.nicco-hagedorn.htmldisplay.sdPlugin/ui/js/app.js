// Helper to get value from SDPI select component
function getSelectValue(element) {
    if (!element) return null;
    // SDPI v3 components: try multiple ways to get the value
    // 1. Direct value property (works after component is initialized)
    if (element.value !== undefined && element.value !== '') return element.value;
    // 2. Check for internal select element in light DOM
    const innerSelect = element.querySelector('select');
    if (innerSelect) return innerSelect.value;
    // 3. Check shadowRoot for select
    if (element.shadowRoot) {
        const shadowSelect = element.shadowRoot.querySelector('select');
        if (shadowSelect) return shadowSelect.value;
    }
    // 4. Check data attribute
    if (element.dataset && element.dataset.value) return element.dataset.value;
    // 5. Check for selected option
    const selectedOption = element.querySelector('option[selected]');
    if (selectedOption) return selectedOption.value;
    return null;
}

// Update visibility based on source type
window.updateSourceVisibility = function(eventOrValue) {
    const sourceTypeSelect = document.getElementById('sourceType');
    const directInputGroup = document.getElementById('directInputGroup');
    const fileInputGroup = document.getElementById('fileInputGroup');

    if (!directInputGroup || !fileInputGroup) return;

    let source = null;

    // Handle different ways the value might come in
    if (typeof eventOrValue === 'string') {
        source = eventOrValue;
    } else if (eventOrValue && eventOrValue.detail && eventOrValue.detail.value !== undefined) {
        source = eventOrValue.detail.value;
    } else if (eventOrValue && eventOrValue.target) {
        source = eventOrValue.target.value || getSelectValue(eventOrValue.target);
    } else {
        source = getSelectValue(sourceTypeSelect);
    }

    console.log('[HTMLDisplay] Source visibility update:', source);

    if (source === 'direct') {
        directInputGroup.classList.remove('hidden');
        fileInputGroup.classList.add('hidden');
    } else if (source === 'file') {
        directInputGroup.classList.add('hidden');
        fileInputGroup.classList.remove('hidden');
    }
}

// Update visibility based on window mode
window.updateWindowModeVisibility = function(eventOrValue) {
    const windowModeSelect = document.getElementById('windowMode');
    const popupSizeGroup = document.getElementById('popupSizeGroup');

    if (!popupSizeGroup) return;

    let mode = null;

    if (typeof eventOrValue === 'string') {
        mode = eventOrValue;
    } else if (eventOrValue && eventOrValue.detail && eventOrValue.detail.value !== undefined) {
        mode = eventOrValue.detail.value;
    } else if (eventOrValue && eventOrValue.target) {
        mode = eventOrValue.target.value || getSelectValue(eventOrValue.target);
    } else {
        mode = getSelectValue(windowModeSelect);
    }

    console.log('[HTMLDisplay] Window mode visibility update:', mode);

    if (mode === 'popup') {
        popupSizeGroup.classList.remove('hidden');
    } else if (mode === 'browser') {
        popupSizeGroup.classList.add('hidden');
    }
}

// Attach event listeners to SDPI select component
function attachSelectListener(element, callback) {
    if (!element) return;

    // Listen on the custom element itself
    element.addEventListener('change', callback);
    element.addEventListener('input', callback);

    // Try to find and listen on internal select (light DOM)
    const innerSelect = element.querySelector('select');
    if (innerSelect) {
        innerSelect.addEventListener('change', callback);
    }

    // Use MutationObserver to watch for value changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' &&
                (mutation.attributeName === 'value' || mutation.attributeName === 'data-value')) {
                callback();
            }
        });
    });
    observer.observe(element, { attributes: true, subtree: true });

    // Wait for shadowRoot and attach listener there too
    const checkShadow = setInterval(() => {
        if (element.shadowRoot) {
            clearInterval(checkShadow);
            const shadowSelect = element.shadowRoot.querySelector('select');
            if (shadowSelect) {
                shadowSelect.addEventListener('change', (e) => {
                    callback(e.target.value);
                });
            }
        }
    }, 50);

    // Stop checking after 2 seconds
    setTimeout(() => clearInterval(checkShadow), 2000);
}

// Initialize listeners once components are ready
document.addEventListener('DOMContentLoaded', () => {
    const refreshPreviewBtn = document.getElementById('refreshPreview');
    const sourceTypeSelect = document.getElementById('sourceType');
    const windowModeSelect = document.getElementById('windowMode');

    // Attach listeners
    attachSelectListener(sourceTypeSelect, window.updateSourceVisibility);
    attachSelectListener(windowModeSelect, window.updateWindowModeVisibility);

    // Initial update after SDPI components initialize
    const initUpdates = () => {
        window.updateSourceVisibility();
        window.updateWindowModeVisibility();
    };

    // Try multiple times to catch initialization
    setTimeout(initUpdates, 100);
    setTimeout(initUpdates, 300);
    setTimeout(initUpdates, 500);
    setTimeout(initUpdates, 1000);

    if (refreshPreviewBtn) {
        refreshPreviewBtn.addEventListener('click', () => {
            if (window.$SD) {
                window.$SD.sendToPlugin({ event: 'refreshPreview' });
            }
        });
    }
});
