import { BaseControl } from './base-control.js';

/**
 * Control for handling basic numeric parameters and options
 */
export class NumberControl extends BaseControl {
    constructor(folder, valueInfo, onValueChange) {
        super(folder, valueInfo, onValueChange);
        this.originalValue = valueInfo.value;
        this.controlName = `value${valueInfo.index}`;
    }

    create() {
        this.binding = { [this.controlName]: this.originalValue };

        if (this.valueInfo.type === 'number') {
            this.controller = this.folder.addBinding(this.binding, this.controlName, {
                label: this.valueInfo.paramName
            });
        } else {
            // Handle option/select type parameters
            this.controller = this.folder.addBinding(this.binding, this.controlName, {
                label: this.valueInfo.paramName,
                options: this.valueInfo.options.reduce((acc, opt) => {
                    acc[opt] = opt;
                    return acc;
                }, {})
            });
        }

        this.controller.on('change', (ev) => {
            this.onValueChange(this.valueInfo.index, ev.value);
        });

        this._addTestAttributes();

        return {
            controller: this.controller,
            binding: this.binding,
            originalValue: this.originalValue
        };
    }

    updateValue(newValue) {
        if (this.binding) {
            this.binding[this.controlName] = newValue;
            this.refresh();
        }
    }

    reset() {
        if (this.binding) {
            this.binding[this.controlName] = this.originalValue;
            this.refresh();
        }
    }

    getValue() {
        return this.binding?.[this.controlName];
    }
} 