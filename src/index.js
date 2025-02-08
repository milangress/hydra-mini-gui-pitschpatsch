import { HydraMiniGUI } from './hydra-mini-gui.js';
import { loadDependencies } from './utils/dependencies.js';

// Wrap everything in a self-executing block
(async () => {
    try {
        await loadDependencies(); // Await the dependencies
        window._hydraGui = new HydraMiniGUI();
        console.log('HydraMiniGUI initialized!');
    } catch (error) {
        console.error('Error initializing HydraMiniGUI:', error);
    }
})(); 