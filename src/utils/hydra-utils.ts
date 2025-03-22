// Utility functions for Hydra integration
import { Logger } from "./logger";
import { guiReady } from "../state/signals";

interface HydraInstance {
    regl: unknown;
}

declare global {
    interface Window {
        hydraSynth?: HydraInstance;
        _hydra?: HydraInstance;
        hydra?: HydraInstance;
        h?: HydraInstance;
        H?: HydraInstance;
        hy?: HydraInstance;
        atom?: {
            packages: {
                loadedPackages: {
                    "atom-hydra": {
                        mainModule: {
                            main: {
                                hydra: HydraInstance;
                            };
                        };
                    };
                };
            };
        };
        lil?: {
            GUI: unknown;
        };
    }
}

// Get Hydra instance
export const getHydra = (): HydraInstance | undefined => {
    Logger.log('getting hydra');
    const whereami = window.location?.href?.includes("hydra.ojack.xyz")
        ? "editor"
        : window.atom?.packages
            ? "atom"
            : "idk";
    
    if (whereami === "editor") {
        Logger.log('got hydra from editor', window.hydraSynth);
        return window.hydraSynth;
    }
    
    if (whereami === "atom") {
        Logger.log('got hydra from atom', window.atom?.packages.loadedPackages["atom-hydra"]);
        return window.atom?.packages.loadedPackages["atom-hydra"]
            ?.mainModule.main.hydra;
    }
    
    const _h = [
        window.hydraSynth,
        window._hydra,
        window.hydra,
        window.h,
        window.H,
        window.hy
    ].find(h => h?.regl);

    Logger.log('got hydra', _h);
    return _h;
};

// Wait for lil-gui to be available
export const waitForGUI = (): Promise<void> => {
    return new Promise((resolve) => {
        const check = () => {
            if (window.lil?.GUI) {
                resolve();
                guiReady.value = true;
            } else {
                setTimeout(check, 100);
            }
        };
        check();
    });
}; 