// GUI utility functions and helpers
export class GUIUtils {
    // Function group management
    static getFunctionId(val) {
        return `${val.functionName}_line${val.lineNumber}_pos${val.functionStartCh}`;
    }

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

    // GUI element creation
    static createFolder(parent, { title, expanded = false }) {
        return parent.addFolder({
            title,
            expanded
        });
    }

    static createBinding(folder, obj, key, options = {}) {
        return folder.addBinding(obj, key, {
            readonly: false,
            ...options
        });
    }

    static createReadOnlyBinding(folder, obj, key, options = {}) {
        return this.createBinding(folder, obj, key, {
            ...options,
            readonly: true
        });
    }

    static createButton(folder, { title, label, onClick }) {
        return folder.addButton({
            title,
            label
        }).on('click', onClick);
    }

    static clearFolder(folder) {
        if (!folder) return;
        folder.children.slice().forEach(child => child.dispose());
    }

    static createMessageBinding(folder, message, options = {}) {
        const obj = { message };
        return this.createReadOnlyBinding(folder, obj, 'message', options);
    }

    static createErrorBinding(folder, message) {
        const controller = this.createMessageBinding(folder, message);
        controller.element.classList.add('error-message');
        return controller;
    }

    static createCodeBinding(folder, code) {
        return this.createReadOnlyBinding(folder, { code }, 'code', {
            multiline: true,
            rows: 5
        });
    }
} 