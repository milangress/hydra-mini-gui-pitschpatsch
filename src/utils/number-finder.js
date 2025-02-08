// Number finding functionality

export function findNumbers(code) {
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