/**
 * Utility functions for parameter management
 */
export class ParameterUtils {
    /**
     * Gets a unique function ID
     */
    static getFunctionId(val) {
        return `${val.functionName}_line${val.lineNumber}_pos${val.functionStartCh}`;
    }

    /**
     * Groups values by their function
     */
    static groupByFunction(values, filterFn = () => true) {
        const functionGroups = new Map();
        
        values.forEach(val => {
            if (!filterFn(val)) return;

            const functionId = this.getFunctionId(val);
            if (!functionGroups.has(functionId)) {
                functionGroups.set(functionId, {
                    name: val.functionName,
                    line: val.lineNumber,
                    position: val.functionStartCh,
                    params: []
                });
            }
            functionGroups.get(functionId).params.push(val);
        });

        return functionGroups;
    }

    /**
     * Sorts groups and counts instances of each function
     */
    static sortAndCountInstances(functionGroups) {
        const sortedGroups = Array.from(functionGroups.entries())
            .filter(([, group]) => group.params.length > 0)
            .sort(([, a], [, b]) => {
                if (a.line !== b.line) return a.line - b.line;
                return a.position - b.position;
            });

        const instanceCounts = new Map();
        return sortedGroups.map(([functionId, group]) => {
            const count = instanceCounts.get(group.name) || 0;
            const displayName = count === 0 ? group.name : `${group.name} ${count + 1}`;
            instanceCounts.set(group.name, count + 1);
            return { functionId, group, displayName };
        });
    }

    /**
     * Updates a control's value based on its type
     */
    static updateControlValue(control, newValue) {
        if (!control) return;

        if (control.isColor) {
            control.binding.color[control.colorComponent] = newValue;
        } else if (control.isPoint) {
            const mappedValue = control.mapPoint ? newValue * 2 - 0.5 : newValue;
            control.binding[control.pointKey][control.pointComponent] = mappedValue;
        } else {
            control.binding[control.name] = newValue;
        }
        control.controller.refresh();
    }

    /**
     * Resets a control to its original value
     */
    static resetControlValue(control) {
        if (!control?.controller || !control?.binding || control?.originalValue === undefined) {
            return;
        }

        if (control.isColor) {
            control.binding.color[control.colorComponent] = control.originalValue;
        } else if (control.isPoint) {
            const mappedValue = control.mapPoint ? control.originalValue * 2 - 0.5 : control.originalValue;
            control.binding[control.pointKey][control.pointComponent] = mappedValue;
        } else {
            control.binding[control.name] = control.originalValue;
        }
        control.controller.refresh();
    }
} 