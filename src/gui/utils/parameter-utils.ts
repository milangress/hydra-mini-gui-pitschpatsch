import { type HydraParameter } from '../../editor/ast/types';
import { BaseControl } from '../core/controls/base-control';

interface FunctionGroup {
    name: string;
    line: number;
    position: number;
    params: HydraParameter[];
}

interface SortedGroup {
    displayName: string;
    group: FunctionGroup;
}

interface Controller {
    refresh: () => void;
}

interface ColorBinding {
    color: Record<string, unknown>;
}

interface PointBinding {
    [pointKey: string]: {
        [component: string]: unknown;
    };
}

interface ExtendedControl extends BaseControl {
    controller: Controller;
    binding: ColorBinding | PointBinding | Record<string, unknown>;
    originalValue?: unknown;
    isColor?: boolean;
    isPoint?: boolean;
    colorComponent?: string;
    pointKey?: string;
    pointComponent?: string;
    mapPoint?: boolean;
    getName(): string;
}

/**
 * Utility functions for parameter management
 */
export class ParameterUtils {

    /**
     * Groups values by their function
     */
    static groupByFunction<T extends HydraParameter>(values: T[], filterFn: (HydraParameter: T) => boolean = () => true): Map<string, FunctionGroup> {
        const functionGroups = new Map<string, FunctionGroup>();
        
        values.forEach(HydraParameter => {
            if (!filterFn(HydraParameter)) return;

            const functionId = HydraParameter.functionId
            const position = HydraParameter.functionStartCh 
                
            if (!functionGroups.has(functionId)) {
                functionGroups.set(functionId, {
                    name: HydraParameter.functionName,
                    line: HydraParameter.lineNumber,
                    position,
                    params: []
                });
            }
            functionGroups.get(functionId)!.params.push(HydraParameter);
        });

        return functionGroups;
    }

    /**
     * Sorts groups and counts instances of each function
     */
    static sortAndCountInstances(functionGroups: Map<string, FunctionGroup>): SortedGroup[] {
        const sortedGroups = Array.from(functionGroups.entries())
            .filter(([, group]) => group.params.length > 0)
            .sort(([, a], [, b]) => {
                if (a.line !== b.line) return a.line - b.line;
                return a.position - b.position;
            });

        const instanceCounts = new Map<string, number>();
        return sortedGroups.map(([functionId, group]) => {
            const count = instanceCounts.get(group.name) || 0;
            const displayName = count === 0 ? group.name : `${group.name} ${count + 1}`;
            instanceCounts.set(group.name, count + 1);
            return { displayName, group };
        });
    }

    /**
     * Updates a control's value
     */
    static updateControlValue(control: ExtendedControl | undefined, newValue: unknown): void {
        if (!control) return;
        
        if (control.isColor && 'color' in control.binding) {
            (control.binding as ColorBinding).color[control.colorComponent!] = newValue;
        } else if (control.isPoint && control.pointKey && control.pointComponent) {
            const mappedValue = control.mapPoint ? (newValue as number) * 2 - 0.5 : newValue;
            (control.binding as PointBinding)[control.pointKey][control.pointComponent] = mappedValue;
        } else {
            (control.binding as Record<string, unknown>)[control.getName()] = newValue;
        }
        control.controller.refresh();
    }

    /**
     * Resets a control's value to its original value
     */
    static resetControlValue(control: ExtendedControl | undefined): void {
        if (!control?.controller || !control.binding || control.originalValue === undefined) {
            return;
        }

        if (control.isColor && 'color' in control.binding && control.colorComponent) {
            (control.binding as ColorBinding).color[control.colorComponent] = control.originalValue;
        } else if (control.isPoint && control.pointKey && control.pointComponent) {
            const mappedValue = control.mapPoint ? control.originalValue as number * 2 - 0.5 : control.originalValue;
            (control.binding as PointBinding)[control.pointKey][control.pointComponent] = mappedValue;
        } else {
            (control.binding as Record<string, unknown>)[control.getName()] = control.originalValue;
        }
        control.controller.refresh();
    }
} 