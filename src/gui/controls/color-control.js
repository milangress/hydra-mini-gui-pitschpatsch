import { BaseControl } from './base-control.js';

/**
 * Control for handling RGB color parameters
 * Groups r, g, b parameters into a single color picker
 */
export class ColorControl extends BaseControl {
    constructor(folder, colorParams, onValueChange) {
        // Use the first parameter's info as base
        super(folder, colorParams[0], onValueChange);
        this.colorParams = colorParams;
        this.originalValues = {
            r: colorParams.find(p => p.paramName === 'r').value,
            g: colorParams.find(p => p.paramName === 'g').value,
            b: colorParams.find(p => p.paramName === 'b').value
        };
    }

    create() {
        this.binding = {
            color: {
                r: this.originalValues.r,
                g: this.originalValues.g,
                b: this.originalValues.b
            }
        };

        this.controller = this.folder.addBinding(this.binding, 'color', {
            rgb: { type: 'float' }
        });

        this.controller.on('change', (ev) => {
            const { r, g, b } = ev.value;
            this.colorParams.forEach(param => {
                if (param.paramName === 'r') this.onValueChange(param.index, r);
                if (param.paramName === 'g') this.onValueChange(param.index, g);
                if (param.paramName === 'b') this.onValueChange(param.index, b);
            });
        });

        // Return control info for each parameter
        return this.colorParams.map(param => ({
            controller: this.controller,
            binding: this.binding,
            isColor: true,
            colorComponent: param.paramName,
            originalValue: this.originalValues[param.paramName]
        }));
    }

    updateValue(newValue, component) {
        if (this.binding) {
            this.binding.color[component] = newValue;
            this.refresh();
        }
    }

    reset() {
        if (this.binding) {
            this.binding.color = { ...this.originalValues };
            this.refresh();
        }
    }

    getValue(component) {
        return this.binding?.color[component];
    }
} 