// hydra-mini-gui.js
// A plugin for Hydra that creates a GUI for controlling numeric values

{
    // Import lil-gui if not already present
    if (!window.lil?.GUI) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/lil-gui@0.20.0/dist/lil-gui.umd.min.js';
        document.head.appendChild(script);
    }

    // Get Hydra instance
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

    class HydraMiniGUI {
        constructor() {
            this.hydra = getHydra();
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
                        
                        // Search backwards for the start of the block
                        while (startline > 0 && cm.getLine(startline) !== '') {
                            startline--;
                        }
                        
                        // Search forwards for the end of the block
                        while (endline < cm.lineCount() && cm.getLine(endline) !== '') {
                            endline++;
                        }
                        
                        const pos1 = { line: startline, ch: 0 };
                        const pos2 = { line: endline, ch: 0 };
                        const str = cm.getRange(pos1, pos2);
                        
                        return {
                            start: pos1,
                            end: pos2,
                            text: str
                        };
                    };
                    
                    // Create a wrapper function to intercept code execution
                    const interceptCode = (code, range) => {
                        console.log('Intercepted code:', code);
                        if (!this.isUpdating) { // Only update if not already updating
                            // Get just the code from the range
                            const rangeCode = cm.getRange(range.start, range.end);
                            this.currentCode = rangeCode;
                            this.currentEvalCode = rangeCode;
                            this.lastEvalRange = range;
                            
                            // Update the GUI to show only controls for this range
                            this.updateGUI();
                        }
                    };

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
            
            console.log('Finding numbers in code:');
            console.log(code);
            
            // Split the code into lines to track line numbers
            const lines = code.split('\n');
            let currentPos = 0;

            // Only process lines within the last eval range if it exists
            const startLine = this.lastEvalRange?.start?.line ?? 0;
            const endLine = this.lastEvalRange?.end?.line ?? lines.length;
            
            lines.forEach((line, lineNum) => {
                // Skip lines outside our range
                if (lineNum < startLine || lineNum >= endLine) {
                    currentPos += line.length + 1; // Still need to track position
                    return;
                }

                console.log(`Scanning line ${lineNum}: "${line}"`);
                while ((match = numberRegex.exec(line)) !== null) {
                    // For the first line, check if the number is after the start character
                    if (lineNum === startLine && match.index < (this.lastEvalRange?.start?.ch ?? 0)) {
                        continue;
                    }
                    // For the last line, check if the number is before the end character
                    if (lineNum === endLine - 1 && match.index >= (this.lastEvalRange?.end?.ch ?? line.length)) {
                        continue;
                    }

                    const value = parseFloat(match[0]);
                    console.log(`Found number ${value} at:`, {
                        lineNumber: lineNum,
                        characterPosition: match.index,
                        length: match[0].length,
                        absolutePosition: currentPos + match.index,
                        lineContent: line,
                        beforeNumber: line.substring(Math.max(0, match.index - 20), match.index),
                        afterNumber: line.substring(match.index + match[0].length, match.index + match[0].length + 20)
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
            
            console.log('All matches:', matches);
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
                // Group numbers by their transform
                const transformGroups = new Map(); // Map of transform name -> array of {value, index, paramName}
                const values = {};
                
                numbers.forEach((num, i) => {
                    const name = `value${i}`;
                    values[name] = num.value;
                    
                    // Get transform info
                    const paramInfo = this.guessParameter(this.currentCode, num.index);
                    const [transformName, paramName] = paramInfo.split('.');
                    
                    if (!transformGroups.has(transformName)) {
                        transformGroups.set(transformName, []);
                    }
                    transformGroups.get(transformName).push({
                        value: num.value,
                        index: i,
                        paramName,
                        controlName: name
                    });
                });

                // Create folders for each transform
                for (const [transformName, params] of transformGroups) {
                    const folder = this.gui.addFolder(transformName);
                    
                    params.forEach(param => {
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
                lineContent: cm.getLine(pos.lineNumber),
                beforeNumber: cm.getLine(pos.lineNumber).substring(Math.max(0, pos.ch - 20), pos.ch),
                afterNumber: cm.getLine(pos.lineNumber).substring(pos.ch + pos.length, pos.ch + pos.length + 20)
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
                        if (i === pos.lineNumber) {
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
                
                // Evaluate immediately with our stored code
                if (this.hydra?.eval) {
                    this.hydra.eval(wrappedCode);
                }

                // Debounce the editor update
                this._updateTimeout = setTimeout(() => {
                    // Use the line number and character position directly
                    const from = {
                        line: pos.lineNumber,
                        ch: pos.ch
                    };
                    const to = {
                        line: pos.lineNumber,
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
} 