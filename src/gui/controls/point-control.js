import { BaseControl } from './base-control.js';

/**
 * Control for handling X/Y parameter pairs
 * Supports different mapping modes based on parameter defaults
 */
export class PointControl extends BaseControl {
    constructor(folder, pointParams, baseName, onValueChange) {
        // Use the X parameter's info as base
        super(folder, pointParams.x, onValueChange);
        this.pointParams = pointParams;
        this.baseName = baseName;
        this.originalValues = {
            x: pointParams.x.value,
            y: pointParams.y.value
        };
        this.mapPoint = this._determineMapping();
    }

    /**
     * Determines the mapping mode based on parameter defaults
     * @private
     */
    _determineMapping() {
        const defaultX = this.pointParams.x.paramDefault;
        const defaultY = this.pointParams.y.paramDefault;

        if (defaultX === 0.5 || defaultY === 0.5) {
            return {
                mode: 'centered',
                config: {
                    x: { min: -0.5, max: 0.5, step: 0.01 },
                    y: { min: -0.5, max: 0.5, step: 0.01 }
                },
                toDisplay: (val) => val * 2 - 0.5,
                fromDisplay: (val) => (val + 0.5) / 2
            };
        } else if (defaultX === 1 || defaultY === 1) {
            return {
                mode: 'extended',
                config: {
                    x: { min: 0, max: 30, step: 0.1 },
                    y: { min: 0, max: 30, step: 0.1 }
                },
                toDisplay: (val) => val,
                fromDisplay: (val) => val
            };
        } else {
            return {
                mode: 'normal',
                config: {
                    x: { min: 0, max: 1, step: 0.01 },
                    y: { min: 0, max: 1, step: 0.01 }
                },
                toDisplay: (val) => val,
                fromDisplay: (val) => val
            };
        }
    }

    create() {
        const displayX = this.mapPoint.toDisplay(this.originalValues.x);
        const displayY = this.mapPoint.toDisplay(this.originalValues.y);

        this.binding = {
            [this.baseName]: {
                x: displayX,
                y: displayY
            }
        };

        this.controller = this.folder.addBinding(this.binding, this.baseName, this.mapPoint.config);

        this.controller.on('change', (ev) => {
            const { x, y } = ev.value;
            const hydraX = this.mapPoint.fromDisplay(x);
            const hydraY = this.mapPoint.fromDisplay(y);
            this.onValueChange(this.pointParams.x.index, hydraX);
            this.onValueChange(this.pointParams.y.index, hydraY);
        });

        // Return control info for both parameters
        return [
            {
                controller: this.controller,
                binding: this.binding,
                isPoint: true,
                pointComponent: 'x',
                pointKey: this.baseName,
                mapPoint: this.mapPoint.mode === 'centered',
                originalValue: this.originalValues.x
            },
            {
                controller: this.controller,
                binding: this.binding,
                isPoint: true,
                pointComponent: 'y',
                pointKey: this.baseName,
                mapPoint: this.mapPoint.mode === 'centered',
                originalValue: this.originalValues.y
            }
        ];
    }

    updateValue(newValue, component) {
        if (this.binding) {
            const displayValue = this.mapPoint.toDisplay(newValue);
            this.binding[this.baseName][component] = displayValue;
            this.refresh();
        }
    }

    reset() {
        if (this.binding) {
            this.binding[this.baseName] = {
                x: this.mapPoint.toDisplay(this.originalValues.x),
                y: this.mapPoint.toDisplay(this.originalValues.y)
            };
            this.refresh();
        }
    }

    getValue(component) {
        if (!this.binding) return null;
        const displayValue = this.binding[this.baseName][component];
        return this.mapPoint.fromDisplay(displayValue);
    }
} 