import { HydraMiniGUI } from './hydra-pitschpatsch';
import { loadDependencies } from './utils/dependencies';
import { Logger } from './utils/logger';

declare global {
    interface Window {
        _hydraGui: HydraMiniGUI;
    }
}

// Wrap everything in a self-executing block
(async () => {
    try {
        await loadDependencies(); // Await the dependencies
        window._hydraGui = new HydraMiniGUI();
        Logger.log('HydraMiniGUI initialized!');
    } catch (error) {
        Logger.error('Error initializing HydraMiniGUI:', error instanceof Error ? error.message : String(error));
    }
})(); 