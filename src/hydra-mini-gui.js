// hydra-mini-gui.js
// A plugin for Hydra that creates a GUI for controlling numeric values

// Get Hydra instance. Moved to top since it's needed earlier.
const getHydra = () => {
    console.log('getting hydra');
    const whereami = window.location?.href?.includes("hydra.ojack.xyz")
        ? "editor"
        : window.atom?.packages
            ? "atom"
            : "idk";
    if (whereami === "editor") {
        console.log('got hydra from editor', window.hydraSynth);
        return window.hydraSynth;
    }
    if (whereami === "atom") {
        console.log('got hydra from atom', global.atom.packages.loadedPackages["atom-hydra"]);
        return global.atom.packages.loadedPackages["atom-hydra"]
            .mainModule.main.hydra;
    }
    let _h = [
        window.hydraSynth,
        window._hydra,
        window.hydra,
        window.h,
        window.H,
        window.hy
    ].find(h => h?.regl);

    console.log('got hydra', _h);
    return _h;
};

// Wait for lil-gui to be available
const waitForGUI = () => {
    return new Promise((resolve) => {
        const check = () => {
            if (window.lil?.GUI) {
                resolve();
            } else {
                setTimeout(check, 100);
            }
        };
        check();
    });
};

export class HydraMiniGUI {
    constructor() {
        this.hydra = getHydra(); // Get hydra instance here
        this.gui = null;
        this.controls = new Map();
        this.currentCode = "";
        this.currentEvalCode = ""; // Store the current state for evaluation
        this.valuePositions = [];
        this.lastEvalRange = null; // Track the last evaluated code range
        this.isUpdating = false; // Add flag to prevent recursive updates
        this._updateTimeout = null; // Add debounce timer
        this.setupGUI();
        this.hookIntoEval();
        this.hookIntoHydraEditor();
    }

    // just for debugging
    hookIntoEval() {
        console.log('hooking into eval');
        // Store the original window.eval
        const originalEval = window.eval;
        
        // Replace window.eval with our interceptor
        window.eval = (code) => {
            // Log the code being evaluated
            console.log('window.eval:', code);
            
            // Call the original eval with the code
            return originalEval.call(window, code);
        };
    }

    hookIntoHydraEditor() {
        console.log('hooking into hydra editor');
        const waitForEditor = setInterval(() => {
            if (window.cm) {
                clearInterval(waitForEditor);
                console.log('got editor');

                // Get the CodeMirror instance
                const cm = window.cm;

                // Add getCurrentBlock function
                const getCurrentBlock = () => {
                    const pos = cm.getCursor();
                    let startline = pos.line;
                    let endline = pos.line;

                    // Search backwards for the start of the block (empty line or start of document)
                    while (startline > 0) {
                        const line = cm.getLine(startline - 1);
                        if (line === undefined || line.trim() === '') {
                            break;
                        }
                        startline--;
                    }

                    // Search forwards for the end of the block (empty line or end of document)
                    while (endline < cm.lineCount() - 1) {
                        const line = cm.getLine(endline + 1);
                        if (line === undefined || line.trim() === '') {
                            break;
                        }
                        endline++;
                    }

                    // Include the current line
                    endline++;

                    const pos1 = { line: startline, ch: 0 };
                    const pos2 = { line: endline, ch: 0 };
                    const str = cm.getRange(pos1, pos2);

                    console.log('Found block:', {
                        start: pos1,
                        end: pos2,
                        text: str
                    });

                    return {
                        start: pos1,
                        end: pos2,
                        text: str
                    };
                };

                // No need for interceptCode function, logic moved inside key handling

                // These are the key combinations that can trigger code evaluation
                const evalKeys = {
                    'Ctrl-Enter': 'editor: eval line',
                    'Alt-Enter': 'editor: eval block',
                    'Shift-Ctrl-Enter': 'editor: eval all'
                };

                // Hook into CodeMirror's key handler to track positions
                const originalExtraKeys = cm.options.extraKeys || {};
                Object.entries(evalKeys).forEach(([key, action]) => {
                    if (originalExtraKeys[key]) {
                        const originalHandler = originalExtraKeys[key];
                        originalExtraKeys[key] = () => {
                            // Get the appropriate range based on the action
                            let range;
                            if (action === 'editor: eval block') {
                                const block = getCurrentBlock();
                                range = { start: block.start, end: block.end };
                            } else if (action === 'editor: eval line') {
                                const line = cm.getCursor().line;
                                range = {
                                    start: { line, ch: 0 },
                                    end: { line: line + 1, ch: 0 }
                                };
                            } else if (action === 'editor: eval all') {
                                range = {
                                    start: { line: 0, ch: 0 },
                                    end: { line: cm.lineCount(), ch: 0 }
                                };
                            }

                            // Store the range and get its code
                            this.lastEvalRange = range;
                            const rangeCode = cm.getRange(range.start, range.end);
                            this.currentCode = rangeCode;
                            this.currentEvalCode = rangeCode;

                            // Update GUI before evaluation
                            this.updateGUI();

                            console.log('lastEvalRange', this.lastEvalRange);

                            // Let Hydra's handler do its thing
                            originalHandler();
                        };
                    }
                });

                // Update CodeMirror options with our wrapped key handlers
                cm.setOption('extraKeys', originalExtraKeys);


                console.log('Successfully hooked into Hydra editor');
            }
        }, 100);
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

        // Wait for CodeMirror to be ready and get initial code
        const waitForEditor = setInterval(() => {
            if (window.cm) {
                clearInterval(waitForEditor);
                // Get initial code without filtering
                const allLines = window.cm.getValue().split('\n');
                this.currentCode = allLines.join('\n');
                this.currentEvalCode = this.currentCode; // Initialize eval code
                this.lastEvalRange = {
                    start: { line: 0, ch: 0 },
                    end: { line: allLines.length, ch: 0 }
                };
                this.updateGUI();
            }
        }, 100);
    }

    findNumbers(code) {
        const numberRegex = /-?\d*\.?\d+/g;
        const matches = [];
        let match;

        console.log('%c Finding numbers in code:', 'background: #222; color: #bada55');
        console.log(code);

        // Split the code into lines to track line numbers
        const lines = code.split('\n');
        let currentPos = 0;

        // Process all lines in the current code
        lines.forEach((line, lineNum) => {
            console.log(`\n%c Scanning line ${lineNum}: "${line}"`, 'color: #6495ED');
            while ((match = numberRegex.exec(line)) !== null) {
                // Skip numbers in loadScript lines
                if (line.includes('loadScript')) {
                    continue;
                }

                const value = parseFloat(match[0]);
                const beforeNumber = line.substring(Math.max(0, match.index - 20), match.index);
                const afterNumber = line.substring(match.index + match[0].length, match.index + match[0].length + 20);

                // Find function calls before this number
                const functionCalls = [...beforeNumber.matchAll(/\.?([a-zA-Z]+)\s*\(/g)];
                const lastFunction = functionCalls[functionCalls.length - 1];
                const functionName = lastFunction ? lastFunction[1] : 'unknown';

                // Count parameters
                let paramCount = 0;
                if (lastFunction) {
                    const functionStart = lastFunction.index + lastFunction[0].length;
                    const textAfterFunction = beforeNumber.slice(functionStart);
                    paramCount = (textAfterFunction.match(/,/g) || []).length;
                }

                console.log(`%c Found number ${value} in function "${functionName}" as parameter ${paramCount}:`, 'color: #FFA500', {
                    lineNumber: lineNum,
                    characterPosition: match.index,
                    length: match[0].length,
                    absolutePosition: currentPos + match.index,
                    lineContent: line,
                    beforeNumber,
                    afterNumber,
                    functionCalls,
                    lastFunction: functionName,
                    parameterIndex: paramCount
                });

                matches.push({
                    value: value,
                    lineNumber: lineNum,
                    ch: match.index,
                    length: match[0].length,
                    index: currentPos + match.index
                });
            }
            currentPos += line.length + 1; // +1 for the newline
        });

        console.log('\n%c All matches:', 'background: #222; color: #bada55', matches);
        return matches;
    }

    updateGUI() {
        console.log('updating gui', !this.gui, 'current code:', this.currentCode);
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
        const numbers = this.findNumbers(this.currentCode);
        this.valuePositions = numbers;

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
                const line = this.currentCode.split('\n')[num.lineNumber];
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
                            this.updateValue(param.index, value);
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

    guessParameter(code, position) {
        // Split into lines to get the correct line
        const lines = code.split('\n');
        let currentLine = '';

        for (let i = 0; i < lines.length; i++) {
            if (position < lines[i].length) {
                currentLine = lines[i];
                break;
            }
            position -= lines[i].length + 1; // +1 for newline
        }

        const beforeNumber = currentLine.substring(Math.max(0, position - 20), position);

        // Get all transforms from Hydra
        const transforms = this.hydra?.generator?.glslTransforms || {};

        // Find which transform this number belongs to
        for (const [name, transform] of Object.entries(transforms)) {
            if (beforeNumber.includes(name)) {
                // Found the transform, now find which parameter this is
                const inputs = transform.inputs || [];
                for (let i = 0; i < inputs.length; i++) {
                    const input = inputs[i];
                    // Check if this is the right parameter based on position
                    // Parameters appear in order in the function call
                    const paramPosition = beforeNumber.lastIndexOf(name) + name.length;
                    const commaCount = beforeNumber.slice(paramPosition).split(',').length - 1;
                    if (commaCount === i) {
                        return `${name}.${input.name}`;
                    }
                }
                // If we found the transform but not the exact parameter, return a generic name
                return `${name}.param${commaCount}`;
            }
        }

        // Fallback to a generic name if we couldn't find the transform
        return 'unknown.value';
    }

    updateValue(index, newValue) {
        console.log('Updating value:', {
            index,
            newValue,
            lastEvalRange: this.lastEvalRange
        });

        if (!window.cm || index >= this.valuePositions.length || !this.lastEvalRange) return;

        const pos = this.valuePositions[index];
        const cm = window.cm;

        console.log('Number position info:', {
            value: pos.value,
            lineNumber: pos.lineNumber,
            characterPosition: pos.ch,
            length: pos.length,
            absolutePosition: pos.index,
            lineContent: cm.getLine(pos.lineNumber + this.lastEvalRange.start.line), // Adjust for block start
            beforeNumber: cm.getLine(pos.lineNumber + this.lastEvalRange.start.line).substring(Math.max(0, pos.ch - 20), pos.ch),
            afterNumber: cm.getLine(pos.lineNumber + this.lastEvalRange.start.line).substring(pos.ch + pos.length, pos.ch + pos.length + 20)
        });

        // Set the updating flag
        this.isUpdating = true;

        try {
            // Clear any pending editor updates
            clearTimeout(this._updateTimeout);

            // Get the code within our last eval range
            const allLines = [];
            for (let i = this.lastEvalRange.start.line; i < this.lastEvalRange.end.line; i++) {
                const line = cm.getLine(i);
                if (line && !line.includes('loadScript')) {
                    if (i === (pos.lineNumber + this.lastEvalRange.start.line)) { // Adjust line number
                        // This is the line we're updating
                        allLines.push(
                            line.substring(0, pos.ch) +
                            String(newValue) +
                            line.substring(pos.ch + pos.length)
                        );
                    } else {
                        allLines.push(line);
                    }
                }
            }

            // Store this as our current eval code
            this.currentEvalCode = allLines.join('\n');

            // Wrap the code in an async function
            const wrappedCode = `(async() => {
${this.currentEvalCode}
})().catch(err => console.error(err))`;

            console.log('Final code to evaluate:', wrappedCode);

            // Evaluate but wait for animation frame to ensure DOM is updated
            if (this.hydra?.eval) {
                requestAnimationFrame(() => {
                    this.hydra.eval(wrappedCode);
                });
            }

            // Debounce the editor update
            this._updateTimeout = setTimeout(() => {
                // Use the line number and character position directly
                const from = {
                    line: pos.lineNumber + this.lastEvalRange.start.line, // Adjust for block start
                    ch: pos.ch
                };
                const to = {
                    line: pos.lineNumber + this.lastEvalRange.start.line, // Adjust for block start
                    ch: pos.ch + pos.length
                };

                console.log('Updating editor:', {
                    from,
                    to,
                    newValue
                });

                // Update the code in the editor
                cm.replaceRange(String(newValue), from, to);
            }, 1000); // 1 second debounce for editor updates
        } finally {
            // Always reset the updating flag
            this.isUpdating = false;
        }
    }

    evaluateCode() {
        const code = this.editor.getValue();
        console.log('evaluating code', code);
        try {
            this.hydra.eval(code);
        } catch (error) {
            console.error('Error evaluating code:', error);
        }
    }

    onReplEval() {
        console.log('on repl eval');
    }

    onCodeChange() {
        console.log('on code change');
        clearTimeout(this._updateTimeout);
        this._updateTimeout = setTimeout(() => {
            if (this.editor) {
                this.currentCode = this.editor.getValue();
                console.log('updating gui');
                this.updateGUI();
            }
        }, 500);
    }
}

// Initialize after ensuring lil-gui is loaded
waitForGUI().then(() => {
    window._hydraGui = new HydraMiniGUI();
    console.log('HydraMiniGUI initialized!');
}).catch(error => {
    console.error('Error initializing HydraMiniGUI:', error);
}); 