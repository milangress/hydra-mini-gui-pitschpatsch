import { Pane as TweakPane } from 'tweakpane';
import type {
    Pane,
    TweakpaneConfig,
    FolderConfig,
    BindingOptions,
    ButtonConfig,
    TweakpaneFolder,
    TweakpaneController,
    TweakpaneTab
} from './types';

/**
 * Adapter for Tweakpane-specific operations
 */
export class TweakpaneAdapter {
    private pane: Pane | null;

    constructor() {
        this.pane = null;
    }

    /**
     * Creates a new Tweakpane instance
     */
    createPane(config: TweakpaneConfig): Pane {
        this.pane = new TweakPane(config) as Pane;
        return this.pane;
    }

    /**
     * Creates a folder in the pane
     */
    createFolder(parent: Pane | TweakpaneFolder, { title, expanded = false }: FolderConfig): TweakpaneFolder {
        return parent.addFolder({
            title,
            expanded
        });
    }

    /**
     * Creates a binding in the pane
     */
    createBinding(folder: TweakpaneFolder, obj: any, key: string, options: BindingOptions = {}): TweakpaneController {
        return folder.addBinding(obj, key, {
            readonly: false,
            ...options
        });
    }

    /**
     * Creates a read-only binding
     */
    createReadOnlyBinding(folder: TweakpaneFolder, obj: any, key: string, options: BindingOptions = {}): TweakpaneController {
        return this.createBinding(folder, obj, key, {
            ...options,
            readonly: true
        });
    }

    /**
     * Creates a button in the pane
     */
    createButton(folder: TweakpaneFolder, { title, label, onClick }: ButtonConfig & { onClick: () => void }): TweakpaneController {
        return folder.addButton({
            title,
            label
        }).on('click', onClick);
    }

    /**
     * Clears a folder's contents
     */
    clearFolder(folder: TweakpaneFolder | null): void {
        if (!folder) return;
        folder.children.slice().forEach(child => child.dispose());
    }

    /**
     * Creates a message binding
     */
    createMessageBinding(folder: TweakpaneFolder, message: string, options: BindingOptions = {}): TweakpaneController {
        const obj = { message };
        return this.createReadOnlyBinding(folder, obj, 'message', options);
    }

    /**
     * Creates an error message binding
     */
    createErrorBinding(folder: TweakpaneFolder, message: string): TweakpaneController {
        const controller = this.createMessageBinding(folder, message);
        controller.element.classList.add('error-message');
        return controller;
    }

    /**
     * Creates a code binding
     */
    createCodeBinding(folder: TweakpaneFolder, code: string): TweakpaneController {
        return this.createReadOnlyBinding(folder, { code }, 'code', {
            multiline: true,
            rows: 5
        });
    }

    /**
     * Creates tabs in the pane
     */
    createTabs(titles: string[]): TweakpaneTab | null {
        if (!this.pane) return null;
        return this.pane.addTab({
            pages: titles.map(title => ({ title }))
        });
    }

    /**
     * Disposes of the pane
     */
    cleanup(): void {
        if (this.pane) {
            this.pane.dispose();
            this.pane = null;
        }
    }
} 