import type { TweakpaneFolder } from '../../adapters/types';

export interface HydraSynth {
    stats: {
        fps: number;
    };
    time: number;
    hush: () => void;
}

export interface HydraInstance {
    synth: HydraSynth;
}

export interface SettingsFolders {
    controls: TweakpaneFolder | null;
    stats: TweakpaneFolder | null;
    defaults: TweakpaneFolder | null;
    codeMonitor: TweakpaneFolder | null;
    errors: TweakpaneFolder | null;
}

export interface SettingsCallbacks {
    onReset: (() => void) | null;
    onSetDefault: ((index: number, defaultValue: any) => void) | null;
} 