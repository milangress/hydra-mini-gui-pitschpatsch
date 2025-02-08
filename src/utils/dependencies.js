export const loadDependencies = async () => {
    // Import lil-gui if not already present
    if (!window.lil?.GUI) {
        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/lil-gui@0.20.0/dist/lil-gui.umd.min.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    // lil-gui is already loaded or has been loaded at this point.
    // No need to wait with a check loop.
    return;
}; 