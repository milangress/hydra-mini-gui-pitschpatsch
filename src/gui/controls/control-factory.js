import { ColorControl } from './color-control.js';
import { PointControl } from './point-control.js';
import { NumberControl } from './number-control.js';

/**
 * Factory for creating appropriate control types based on parameter information
 */
export class ControlFactory {
    /**
     * Creates appropriate controls for a group of parameters
     * @param {Object} folder - The folder to add controls to
     * @param {Array} params - Array of parameter information
     * @param {Function} onValueChange - Callback for value changes
     * @returns {Map} Map of control information keyed by control name
     */
    static createControls(folder, params, onValueChange) {
        const controls = new Map();
        const handledParams = new Set();

        // First check for RGB color parameters
        const paramNames = params.map(p => p.paramName);
        if (paramNames.includes('r') && paramNames.includes('g') && paramNames.includes('b')) {
            const colorParams = params.filter(p => ['r', 'g', 'b'].includes(p.paramName));
            const colorControl = new ColorControl(folder, colorParams, onValueChange);
            const controlInfos = colorControl.create();
            
            controlInfos.forEach((info, i) => {
                controls.set(`value${colorParams[i].index}`, info);
                handledParams.add(colorParams[i].controlName);
            });
        }

        // Then look for X/Y pairs
        params.forEach(param => {
            if (handledParams.has(param.controlName)) return;

            // Check for standard X/Y pairs (endsWith X/Y)
            if (param.paramName.endsWith('X') || param.paramName.endsWith('x')) {
                const baseParam = param.paramName.slice(0, -1);
                const yParam = params.find(p => 
                    p.paramName === baseParam + 'Y' || 
                    p.paramName === baseParam + 'y'
                );
                
                if (yParam) {
                    const pointControl = new PointControl(
                        folder,
                        { x: param, y: yParam },
                        baseParam.toLowerCase(),
                        onValueChange
                    );
                    const [xInfo, yInfo] = pointControl.create();
                    
                    controls.set(`value${param.index}`, xInfo);
                    controls.set(`value${yParam.index}`, yInfo);
                    handledParams.add(param.controlName);
                    handledParams.add(yParam.controlName);
                    return;
                }
            }
            
            // Check for Mult pairs
            if (param.paramName === 'xMult') {
                const yParam = params.find(p => p.paramName === 'yMult');
                if (yParam) {
                    const pointControl = new PointControl(
                        folder,
                        { x: param, y: yParam },
                        'mult',
                        onValueChange
                    );
                    const [xInfo, yInfo] = pointControl.create();
                    
                    controls.set(`value${param.index}`, xInfo);
                    controls.set(`value${yParam.index}`, yInfo);
                    handledParams.add(param.controlName);
                    handledParams.add(yParam.controlName);
                    return;
                }
            }
            
            // Check for Speed pairs
            if (param.paramName === 'speedX') {
                const yParam = params.find(p => p.paramName === 'speedY');
                if (yParam) {
                    const pointControl = new PointControl(
                        folder,
                        { x: param, y: yParam },
                        'speed',
                        onValueChange
                    );
                    const [xInfo, yInfo] = pointControl.create();
                    
                    controls.set(`value${param.index}`, xInfo);
                    controls.set(`value${yParam.index}`, yInfo);
                    handledParams.add(param.controlName);
                    handledParams.add(yParam.controlName);
                    return;
                }
            }
        });

        // Handle remaining parameters as basic number/option controls
        params.forEach(param => {
            if (!handledParams.has(param.controlName)) {
                const numberControl = new NumberControl(folder, param, onValueChange);
                const controlInfo = numberControl.create();
                controls.set(`value${param.index}`, controlInfo);
            }
        });

        return controls;
    }
} 