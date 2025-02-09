/**
 * Base class for all GUI controls
 * Defines the interface that all control types must implement
 */
export class BaseControl {
    constructor(folder, valueInfo, onValueChange) {
        this.folder = folder;
        this.valueInfo = valueInfo;
        this.onValueChange = onValueChange;
        this.controller = null;
        this.binding = null;
    }

    /**
     * Creates the control in the GUI
     * @returns {Object} The created control information
     */
    create() {
        throw new Error('create() must be implemented by subclass');
    }

    /**
     * Updates the control's value
     * @param {*} newValue The new value to set
     */
    updateValue(newValue) {
        throw new Error('updateValue() must be implemented by subclass');
    }

    /**
     * Resets the control to its original value
     */
    reset() {
        throw new Error('reset() must be implemented by subclass');
    }

    /**
     * Disposes of the control
     */
    dispose() {
        if (this.controller) {
            this.controller.dispose();
        }
    }

    /**
     * Refreshes the control's display
     */
    refresh() {
        if (this.controller) {
            this.controller.refresh();
        }
    }

    /**
     * Gets the control's current value
     */
    getValue() {
        throw new Error('getValue() must be implemented by subclass');
    }

    /**
     * Adds test attributes to the control's element
     * @protected
     */
    _addTestAttributes() {
        if (this.controller?.element) {
            requestAnimationFrame(() => {
                this.controller.element.setAttribute('data-hydra-param', this.valueInfo.paramName);
                const input = this.controller.element.querySelector('input');
                if (input) {
                    input.setAttribute('data-hydra-input', this.valueInfo.paramName);
                }
            });
        }
    }
} 