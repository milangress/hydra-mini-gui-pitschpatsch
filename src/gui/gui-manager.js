// GUI management functionality

export class GUIManager {
    constructor(hydra) {
        this.hydra = hydra;
        this.gui = null;
        this.controls = new Map();
    }

    setupGUI() {
        console.log('setting up gui');
        // If GUI already exists, don't recreate it
        if (this.gui) return;

        if (!window.lil?.GUI) {
            console.error('lil-gui not loaded');
            return;
        }

        // Create the GUI
        this.gui = new window.lil.GUI({ title: 'Hydra Controls' });

        // Style the GUI container to work with Hydra
        const container = this.gui.domElement;
        container.style.zIndex = '9999';
        container.style.position = 'fixed';
        container.style.top = '10px';
        container.style.right = '10px';
        container.classList.add('hydra-ui'); // Add Hydra's UI class
        container.setAttribute('id', 'hydra-mini-gui'); // Add specific ID

        // Find Hydra's editor container and add our GUI to it
        const editorContainer = document.getElementById('editor-container');
        if (editorContainer) {
            editorContainer.appendChild(container);
        } else {
            // Fallback: create our own container that looks like Hydra's
            const ourContainer = document.createElement('div');
            ourContainer.setAttribute('id', 'hydra-mini-gui-container');
            ourContainer.classList.add('hydra-ui');
            ourContainer.style.position = 'fixed';
            ourContainer.style.zIndex = '9998';
            ourContainer.style.top = '0';
            ourContainer.style.right = '0';
            document.body.appendChild(ourContainer);
            ourContainer.appendChild(container);
        }

        // Force the GUI to be visible
        this.gui.show();
        this.gui._closed = false;
        container.style.display = '';

        // Add a placeholder until we have real controls
        this.gui.add({ message: 'Waiting for code...' }, 'message').disable();

        // Create a mutation observer to watch for DOM changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // If our GUI was removed, re-add it
                if ([...mutation.removedNodes].includes(container)) {
                    console.log('GUI was removed, re-adding');
                    const parent = container.parentElement || editorContainer || document.body;
                    parent.appendChild(container);
                    this.gui.show();
                    this.gui._closed = false;
                    container.style.display = '';
                }
            });
        });

        // Start observing the document with the configured parameters
        observer.observe(document.body, { childList: true, subtree: true });
    }

    updateGUI(currentCode, valuePositions, onValueChange) {
        console.log('updating gui', !this.gui, 'current code:', currentCode);
        if (!this.gui) {
            this.setupGUI();
            return;
        }

        // Store the GUI's current state
        const wasOpen = this.gui._closed === false;
        const guiPosition = {
            left: this.gui.domElement.style.left,
            top: this.gui.domElement.style.top,
            right: this.gui.domElement.style.right
        };

        // Clear ALL existing GUI elements (controllers and folders)
        // First destroy all folders
        this.gui.folders.slice().forEach(folder => {
            folder.destroy();
        });
        // Then destroy any remaining controllers
        while (this.gui.controllers.length) {
            this.gui.controllers[0].destroy();
        }
        this.controls.clear();

        // Find numbers and create controls
        const numbers = valuePositions;

        if (numbers.length === 0) {
            // Add a placeholder if no numbers found
            this.gui.add({ message: 'No numbers in current code' }, 'message').disable();
        } else {
            // Group numbers by their function and line number
            const functionGroups = new Map(); // Map of functionId -> array of {value, index, paramName}
            const values = {};
            let currentFunctionId = null;
            let currentParams = [];
            let lastLineNumber = -1;

            numbers.forEach((num, i) => {
                const name = `value${i}`;
                values[name] = num.value;

                // Get the line content before the number to find the function
                const line = currentCode.split('\n')[num.lineNumber];
                const beforeNumber = line.substring(0, num.ch);

                // Find all function calls in the chain up to this number
                const functionCalls = [...beforeNumber.matchAll(/\.?([a-zA-Z]+)\s*\(/g)];
                // Get the last function call before this number
                const lastFunction = functionCalls[functionCalls.length - 1];
                const functionName = lastFunction ? lastFunction[1] : 'unknown';

                // Count parameters for this specific function call
                let paramCount = 0;
                if (lastFunction) {
                    const functionStart = lastFunction.index + lastFunction[0].length;
                    const textAfterFunction = beforeNumber.slice(functionStart);
                    // Count commas before our number to determine which parameter we are
                    paramCount = (textAfterFunction.match(/,/g) || []).length;
                }

                // Create a unique ID for this function instance based on line number AND character position
                const functionPosition = lastFunction ? lastFunction.index : 0;
                const functionId = `${functionName}_line${num.lineNumber}_pos${functionPosition}`;

                // Get transform info for parameter name
                const transform = this.hydra?.generator?.glslTransforms?.[functionName];
                const paramName = transform?.inputs?.[paramCount]?.name || `val${paramCount + 1}`;

                // Add to the function group
                if (!functionGroups.has(functionId)) {
                    functionGroups.set(functionId, {
                        name: functionName,
                        line: num.lineNumber,
                        position: functionPosition,
                        params: []
                    });
                }
                functionGroups.get(functionId).params.push({
                    value: num.value,
                    index: i,
                    paramName,
                    controlName: name,
                    paramCount
                });
            });

            // Sort function groups by line number and then by position within the line
            const sortedGroups = Array.from(functionGroups.entries())
                .sort(([, a], [, b]) => {
                    if (a.line !== b.line) {
                        return a.line - b.line;
                    }
                    return a.position - b.position;
                });

            // Create folders for each function instance
            let instanceCounts = new Map(); // Track instances of each function name
            for (const [functionId, group] of sortedGroups) {
                // Create a display name with instance number if needed
                const count = instanceCounts.get(group.name) || 0;
                const displayName = count === 0 ? group.name : `${group.name} ${count + 1}`;
                instanceCounts.set(group.name, count + 1);

                const folder = this.gui.addFolder(displayName);

                // Sort parameters by their position in the function call
                group.params.sort((a, b) => a.paramCount - b.paramCount);

                group.params.forEach(param => {
                    const controller = folder.add(values, param.controlName)
                        .name(param.paramName)
                        .onChange((value) => {
                            onValueChange(param.index, value);
                        });

                    // Set min/max based on value magnitude
                    const magnitude = Math.abs(param.value);
                    if (magnitude > 0 && magnitude < 1) {
                        controller.min(0).max(1).step(0.01);
                    } else if (magnitude < 10) {
                        controller.min(-10).max(10).step(0.1);
                    } else {
                        controller.min(-100).max(100).step(1);
                    }

                    this.controls.set(param.controlName, { controller, originalValue: param.value });
                });

                // Open folders by default
                folder.open();
            }
        }

        // Force GUI to be visible
        this.gui.domElement.style.display = '';
        this.gui.domElement.style.visibility = 'visible';
        this.gui.domElement.style.opacity = '1';

        // Restore GUI state
        if (wasOpen) {
            this.gui.open();
            this.gui._closed = false;
        }

        // Restore position if it was moved
        if (guiPosition.left) this.gui.domElement.style.left = guiPosition.left;
        if (guiPosition.top) this.gui.domElement.style.top = guiPosition.top;
        if (guiPosition.right) this.gui.domElement.style.right = guiPosition.right;

        // Ensure the GUI is in a good position if not already positioned
        if (!guiPosition.left && !guiPosition.right) {
            this.gui.domElement.style.right = '10px';
            this.gui.domElement.style.top = '10px';
        }
    }
} 