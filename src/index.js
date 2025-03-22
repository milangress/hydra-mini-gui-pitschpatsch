import { HydraMiniGUI } from './hydra-pitschpatsch.js';
import { loadDependencies } from './utils/dependencies.js';
import { Logger } from './utils/logger.js';

// Wrap everything in a self-executing block
(async () => {
    try {
        await loadDependencies(); // Await the dependencies
        window._hydraGui = new HydraMiniGUI();
        Logger.log('HydraMiniGUI initialized!');
    } catch (error) {
        Logger.error('Error initializing HydraMiniGUI:', error);
    }
})(); 