import { Pane } from 'tweakpane';

/**
 * Adapter for Tweakpane-specific operations
 */
export class TweakpaneAdapter {
    constructor() {
        this.pane = null;
    }

    /**
     * Creates a new Tweakpane instance
     */
    createPane(config) {
        this.pane = new Pane(config);
        return this.pane;
    }

    /**
     * Creates a folder in the pane
     */
    createFolder(parent, { title, expanded = false }) {
        return parent.addFolder({
            title,
            expanded
        });
    }

    /**
     * Creates a binding in the pane
     */
    createBinding(folder, obj, key, options = {}) {
        return folder.addBinding(obj, key, {
            readonly: false,
            ...options
        });
    }

    /**
     * Creates a read-only binding
     */
    createReadOnlyBinding(folder, obj, key, options = {}) {
        return this.createBinding(folder, obj, key, {
            ...options,
            readonly: true
        });
    }

    /**
     * Creates a button in the pane
     */
    createButton(folder, { title, label, onClick }) {
        return folder.addButton({
            title,
            label
        }).on('click', onClick);
    }

    /**
     * Clears a folder's contents
     */
    clearFolder(folder) {
        if (!folder) return;
        folder.children.slice().forEach(child => child.dispose());
    }

    /**
     * Creates a message binding
     */
    createMessageBinding(folder, message, options = {}) {
        const obj = { message };
        return this.createReadOnlyBinding(folder, obj, 'message', options);
    }

    /**
     * Creates an error message binding
     */
    createErrorBinding(folder, message) {
        const controller = this.createMessageBinding(folder, message);
        controller.element.classList.add('error-message');
        return controller;
    }

    /**
     * Creates a code binding
     */
    createCodeBinding(folder, code) {
        return this.createReadOnlyBinding(folder, { code }, 'code', {
            multiline: true,
            rows: 5
        });
    }

    /**
     * Creates tabs in the pane
     */
    createTabs(titles) {
        if (!this.pane) return null;
        return this.pane.addTab({
            pages: titles.map(title => ({ title }))
        });
    }

    /**
     * Disposes of the pane
     */
    cleanup() {
        if (this.pane) {
            this.pane.dispose();
            this.pane = null;
        }
    }
} 