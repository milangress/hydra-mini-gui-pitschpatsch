// Number finding functionality using AST parsing
import { Parser } from 'acorn';
import { makeTraveler } from 'astravel';

export function findNumbers(code) {
    if (!code) return [];

    console.log('%c Finding numbers in code:', 'background: #222; color: #bada55');
    console.log(code);

    try {
        // Parse code to AST
        const ast = Parser.parse(code, {
            locations: true,
            ecmaVersion: 'latest'
        });

        const matches = [];
        let currentIndex = 0;

        // Create AST traveler to find numeric literals
        const traveler = makeTraveler({
            go: function(node, state) {
                if (node.type === 'Literal' && typeof node.value === 'number') {
                    // Skip numbers in loadScript lines
                    const line = code.split('\n')[node.loc.start.line - 1];
                    if (!line || !line.includes('loadScript')) {
                        // Get context around the number
                        const lineStart = node.loc.start.line - 1;
                        const lines = code.split('\n');
                        const lineContent = lines[lineStart];
                        const beforeNumber = lineContent.substring(Math.max(0, node.loc.start.column - 20), node.loc.start.column);
                        const afterNumber = lineContent.substring(node.loc.end.column, Math.min(lineContent.length, node.loc.end.column + 20));

                        // Find function context
                        let functionName = 'unknown';
                        let paramCount = 0;

                        // Look for parent CallExpression
                        let parent = state.parents[state.parents.length - 1];
                        if (parent && parent.type === 'CallExpression' && parent.callee) {
                            if (parent.callee.type === 'MemberExpression' && parent.callee.property) {
                                functionName = parent.callee.property.name;
                                // Count parameters up to this argument
                                paramCount = parent.arguments.findIndex(arg => arg === node);
                                if (paramCount === -1) paramCount = parent.arguments.length;
                            }
                        }

                        console.log(`%c Found number ${node.value} in function "${functionName}" as parameter ${paramCount}:`, 'color: #FFA500', {
                            lineNumber: lineStart,
                            characterPosition: node.loc.start.column,
                            length: node.loc.end.column - node.loc.start.column,
                            absolutePosition: currentIndex,
                            lineContent,
                            beforeNumber,
                            afterNumber,
                            functionName,
                            parameterIndex: paramCount
                        });

                        matches.push({
                            value: node.value,
                            lineNumber: lineStart,
                            ch: node.loc.start.column,
                            length: node.loc.end.column - node.loc.start.column,
                            index: currentIndex++
                        });
                    }
                }
                // Call the parent's `go` method with updated parent stack
                const oldParents = state.parents;
                state.parents = [...oldParents, node];
                this.super.go.call(this, node, state);
                state.parents = oldParents;
            }
        });

        // Find all numbers in the AST
        traveler.go(ast, { parents: [] });

        console.log('\n%c All matches:', 'background: #222; color: #bada55', matches);
        return matches;
    } catch (error) {
        console.error('Error parsing code:', error);
        return [];
    }
} 