import { Pane as TweakPane, TabPageApi } from 'tweakpane';

export interface Pane extends TweakPane {
    addFolder: (config: FolderConfig) => TweakpaneFolder;
    addTab: (config: TabConfig) => TweakpaneTab;
}

export interface TweakpaneConfig {
    title?: string;
    container?: HTMLElement;
}

export interface FolderConfig {
    title: string;
    expanded?: boolean;
}

export interface BindingOptions {
    readonly?: boolean;
    min?: number;
    max?: number;
    step?: number;
    multiline?: boolean;
    rows?: number;
    [key: string]: any;
}

export interface ButtonConfig {
    title?: string;
    label?: string;
}

export interface TabConfig {
    pages: Array<{ title: string }>;
}

export interface TweakpaneFolder {
    addBinding: (obj: any, key: string, options?: BindingOptions) => TweakpaneController;
    addButton: (config: ButtonConfig) => TweakpaneController;
    addFolder: (config: FolderConfig) => TweakpaneFolder;
    children: TweakpaneController[];
    element: HTMLElement;
}

export interface TweakpaneController {
    on: (event: string, callback: () => void) => TweakpaneController;
    element: HTMLElement;
    dispose: () => void;
}

export interface TweakpaneTab extends TabPageApi {
    pages: Array<{ title: string }>;
} 