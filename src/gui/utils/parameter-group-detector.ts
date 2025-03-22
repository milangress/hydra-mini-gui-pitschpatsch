import type { HydraParameter } from '../../editor/ast/types';
import type { ParameterGroup, ColorGroup, PointGroup, NumberGroup } from '../core/types/parameter-groups';

/**
 * Pure functions for detecting and grouping related parameters
 */
export class ParameterGroupDetector {
    /**
     * Detects all parameter groups from a list of parameters
     */
    static detectGroups(params: HydraParameter[]): ParameterGroup[] {
        const handledParams = new Set<string>();
        const groups: ParameterGroup[] = [];

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
    private static detectColorGroups(HydraParameter: HydraParameter[], handledParams: Set<string>): ColorGroup[] {
        const groups: ColorGroup[] = [];
        const paramNames = HydraParameter.map(p => p.paramName);

        if (paramNames.includes('r') && paramNames.includes('g') && paramNames.includes('b')) {
            const colorParams = HydraParameter.filter(p => ['r', 'g', 'b'].includes(p.paramName));
            
            groups.push({
                type: 'color',
                params: colorParams,
                metadata: {
                    pattern: 'rgb'
                }
            });

            colorParams.forEach(p => handledParams.add(p.key));
        }

        return groups;
    }

    /**
     * Detects point parameter groups (X/Y pairs)
     * @private
     */
    private static detectPointGroups(params: HydraParameter[], handledParams: Set<string>): PointGroup[] {
        const groups: PointGroup[] = [];

        params.forEach(param => {
            if (handledParams.has(param.key)) return;

            let pointGroup: PointGroup | null = null;

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
                pointGroup.params.forEach(p => handledParams.add(p.key));
            }
        });

        return groups;
    }

    /**
     * Creates number groups for remaining parameters
     * @private
     */
    private static detectRemainingNumbers(HydraParameter: HydraParameter[], handledParams: Set<string>): NumberGroup[] {
        return HydraParameter
            .filter(HydraParameter => !handledParams.has(HydraParameter.key))
            .map(HydraParameter => ({
                type: 'number',
                params: [HydraParameter],
                metadata: {
                    label: HydraParameter.paramName
                }
            }));
    }
} 