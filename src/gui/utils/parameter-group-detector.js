/**
 * Pure functions for detecting and grouping related parameters
 */
export class ParameterGroupDetector {
    /**
     * Detects all parameter groups from a list of parameters
     * @param {import('../core/types/controls.js').ControlParameter[]} params 
     * @returns {import('../core/types/parameter-groups.js').ParameterGroup[]}
     */
    static detectGroups(params) {
        const handledParams = new Set();
        const groups = [];

        // First detect color groups (RGB)
        const colorGroups = this.detectColorGroups(params, handledParams);
        groups.push(...colorGroups);

        // Then detect point groups (X/Y pairs)
        const pointGroups = this.detectPointGroups(params, handledParams);
        groups.push(...pointGroups);

        // Finally, handle remaining parameters as number groups
        const numberGroups = this.detectRemainingNumbers(params, handledParams);
        groups.push(...numberGroups);

        return groups;
    }

    /**
     * Detects RGB color parameter groups
     * @private
     */
    static detectColorGroups(params, handledParams) {
        const groups = [];
        const paramNames = params.map(p => p.paramName);

        if (paramNames.includes('r') && paramNames.includes('g') && paramNames.includes('b')) {
            const colorParams = params.filter(p => ['r', 'g', 'b'].includes(p.paramName));
            
            groups.push({
                type: 'color',
                params: colorParams,
                metadata: {
                    pattern: 'rgb'
                }
            });

            colorParams.forEach(p => handledParams.add(p.controlName));
        }

        return groups;
    }

    /**
     * Detects point parameter groups (X/Y pairs)
     * @private
     */
    static detectPointGroups(params, handledParams) {
        const groups = [];

        params.forEach(param => {
            if (handledParams.has(param.controlName)) return;

            let pointGroup = null;

            // Check standard X/Y pairs
            if (param.paramName.endsWith('X') || param.paramName.endsWith('x')) {
                const baseParam = param.paramName.slice(0, -1);
                const yParam = params.find(p => 
                    p.paramName === baseParam + 'Y' || 
                    p.paramName === baseParam + 'y'
                );
                
                if (yParam) {
                    pointGroup = {
                        type: 'point',
                        params: [param, yParam],
                        metadata: {
                            pattern: 'xy',
                            label: baseParam.toLowerCase()
                        }
                    };
                }
            }
            // Check Mult pairs
            else if (param.paramName === 'xMult') {
                const yParam = params.find(p => p.paramName === 'yMult');
                if (yParam) {
                    pointGroup = {
                        type: 'point',
                        params: [param, yParam],
                        metadata: {
                            pattern: 'mult',
                            label: 'mult'
                        }
                    };
                }
            }
            // Check Speed pairs
            else if (param.paramName === 'speedX') {
                const yParam = params.find(p => p.paramName === 'speedY');
                if (yParam) {
                    pointGroup = {
                        type: 'point',
                        params: [param, yParam],
                        metadata: {
                            pattern: 'speed',
                            label: 'speed'
                        }
                    };
                }
            }

            if (pointGroup) {
                groups.push(pointGroup);
                pointGroup.params.forEach(p => handledParams.add(p.controlName));
            }
        });

        return groups;
    }

    /**
     * Creates number groups for remaining parameters
     * @private
     */
    static detectRemainingNumbers(params, handledParams) {
        return params
            .filter(param => !handledParams.has(param.controlName))
            .map(param => ({
                type: 'number',
                params: [param],
                metadata: {
                    label: param.paramName
                }
            }));
    }
} 