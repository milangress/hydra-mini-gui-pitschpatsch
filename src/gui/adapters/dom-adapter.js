import { DEFAULT_GUI_STYLES } from '../core/types/styles.js';
import { DraggablePane } from '../core/draggable-pane.js';

/**
 * Handles all DOM-specific operations
 */
export class DOMAdapter {
    constructor() {
        this.container = null;
        this.styleElement = null;
        this.draggablePane = null;
    }

    /**
     * Creates a DOM element with given properties
     */
    createElement(type, properties = {}) {
        if (typeof document === 'undefined') return null;

        const element = document.createElement(type);
        if (properties.style) {
            Object.assign(element.style, properties.style);
        }
        if (properties.classes) {
            properties.classes.forEach(c => element.classList.add(c));
        }
        if (properties.attributes) {
            Object.entries(properties.attributes).forEach(([key, value]) => 
                element.setAttribute(key, value)
            );
        }
        return element;
    }

    /**
     * Mounts the GUI container to the DOM
     */
    mountContainer(container) {
        if (typeof document === 'undefined') return;

        const editorContainer = document.getElementById('editor-container');
        if (editorContainer) {
            editorContainer.appendChild(container);
            return;
        }
        document.body.appendChild(container);
    }

    /**
     * Removes existing GUI from the DOM
     */
    removeExistingGUI() {
        if (typeof document === 'undefined') return;
        
        const existingGui = document.getElementById('hydra-mini-gui');
        if (existingGui) {
            existingGui.remove();
        }
    }

    /**
     * Creates and mounts the GUI container
     */
    setupContainer(layout) {
        if (typeof document === 'undefined') return null;

        this.removeExistingGUI();

        this.container = this.createElement('div', {
            style: {
                zIndex: layout.zIndex,
                position: 'fixed',
                ...layout.position
            },
            classes: ['hydra-ui'],
            attributes: {
                id: 'hydra-mini-gui'
            }
        });

        this.mountContainer(this.container);
        this.applyStyles();
        
        // Initialize draggable functionality
        this.draggablePane = new DraggablePane(this.container);
        
        return this.container;
    }

    /**
     * Applies styles to the document
     */
    applyStyles(customStyles = {}) {
        if (typeof document === 'undefined') return;
        
        // Remove existing styles
        this.removeStyles();

        // Create style element
        this.styleElement = this.createElement('style', {
            attributes: {
                id: 'hydra-mini-gui-styles'
            }
        });

        // Combine default and custom styles
        const styles = { ...DEFAULT_GUI_STYLES, ...customStyles };
        this.styleElement.textContent = Object.values(styles).join('\n');

        // Add to document
        document.head?.appendChild(this.styleElement);
    }

    /**
     * Removes styles from the document
     */
    removeStyles() {
        if (typeof document === 'undefined') return;
        
        const existingStyle = document.getElementById('hydra-mini-gui-styles');
        if (existingStyle) {
            existingStyle.remove();
        }
        this.styleElement = null;
    }

    /**
     * Cleans up DOM elements
     */
    cleanup() {
        if (this.draggablePane) {
            this.draggablePane.cleanup();
            this.draggablePane = null;
        }
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this.removeStyles();
    }
} 