// Value updating functionality

export class ValueUpdater {
    constructor(hydra) {
        this.hydra = hydra;
        this.isUpdating = false;
        this._updateTimeout = null;
    }

    updateValue(index, newValue, valuePositions, lastEvalRange, currentCode) {
        console.log('Updating value:', {
            index,
            newValue,
            lastEvalRange
        });

        if (!window.cm || index >= valuePositions.length || !lastEvalRange) return;

        const pos = valuePositions[index];
        const cm = window.cm;

        console.log('Number position info:', {
            value: pos.value,
            lineNumber: pos.lineNumber,
            characterPosition: pos.ch,
            length: pos.length,
            absolutePosition: pos.index,
            lineContent: cm.getLine(pos.lineNumber + lastEvalRange.start.line), // Adjust for block start
            beforeNumber: cm.getLine(pos.lineNumber + lastEvalRange.start.line).substring(Math.max(0, pos.ch - 20), pos.ch),
            afterNumber: cm.getLine(pos.lineNumber + lastEvalRange.start.line).substring(pos.ch + pos.length, pos.ch + pos.length + 20)
        });

        // Set the updating flag
        this.isUpdating = true;

        try {
            // Clear any pending editor updates
            clearTimeout(this._updateTimeout);

            // Get the code within our last eval range
            const allLines = [];
            for (let i = lastEvalRange.start.line; i < lastEvalRange.end.line; i++) {
                const line = cm.getLine(i);
                if (line && !line.includes('loadScript')) {
                    if (i === (pos.lineNumber + lastEvalRange.start.line)) { // Adjust line number
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

            // Join the lines into a single string
            const currentEvalCode = allLines.join('\n');

            // Wrap the code in an async function
            const wrappedCode = `(async() => {
${currentEvalCode}
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
                    line: pos.lineNumber + lastEvalRange.start.line, // Adjust for block start
                    ch: pos.ch
                };
                const to = {
                    line: pos.lineNumber + lastEvalRange.start.line, // Adjust for block start
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

            return currentEvalCode;
        } finally {
            // Always reset the updating flag
            this.isUpdating = false;
        }
    }
} 