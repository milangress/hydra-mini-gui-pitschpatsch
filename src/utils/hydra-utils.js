// Utility functions for Hydra integration
import { Logger } from "./logger.js";

// Get Hydra instance
export const getHydra = () => {
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
        Logger.log('got hydra from atom', global.atom.packages.loadedPackages["atom-hydra"]);
        return global.atom.packages.loadedPackages["atom-hydra"]
            .mainModule.main.hydra;
    }
    let _h = [
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
export const waitForGUI = () => {
    return new Promise((resolve) => {
        const check = () => {
            if (window.lil?.GUI) {
                resolve();
            } else {
                setTimeout(check, 100);
            }
        };
        check();
    });
}; 