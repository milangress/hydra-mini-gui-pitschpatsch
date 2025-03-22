export interface SettingsConfig {
    isLoggingEnabled: boolean;
    currentCode: string;
    defaultValues: any[];
}

export interface SettingsCallbacks {
    onReset: () => void;
    onSetDefault: (index: number, defaultValue: any) => void;
    onHush: () => void;
}

export interface SettingsFolders {
    controls: any; // Tweakpane folder
    stats: any; // Tweakpane folder
    defaults: any; // Tweakpane folder
    codeMonitor: any; // Tweakpane folder
    errors: any; // Tweakpane folder
} 