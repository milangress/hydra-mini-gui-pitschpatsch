/**
 * Utility functions for code analysis and manipulation
 */

/**
 * Remove loadScript lines from code before parsing
 * This handles both regular loadScript and await loadScript
 * @param {string} code - The code to process
 * @returns {string} Code with loadScript lines removed
 */
export function removeLoadScriptLines(code) {
    if (!code) return code;
    return code.split('\n')
        .filter(line => !line.includes('loadScript'))
        .join('\n');
}

/**
 * Extract the function name from code before a value using regex
 * This is a fallback method when AST analysis can't determine the function name
 * @param {string} beforeContent - The code content before the value
 * @returns {string} The function name or 'unknown'
 */
export function extractFunctionNameFromCode(beforeContent) {
    // Find all function calls in the chain up to this value
    const functionCalls = [...beforeContent.matchAll(/\.?([a-zA-Z]+)\s*\(/g)];
    // Get the last function call before this value
    const lastFunction = functionCalls[functionCalls.length - 1];
    return lastFunction ? lastFunction[1] : 'unknown';
}

/**
 * Count parameters before a position in a function call
 * @param {string} textAfterFunction - The text after the function name and before the value
 * @returns {number} The number of parameters before this position
 */
export function countParametersBeforePosition(textAfterFunction) {
    return (textAfterFunction.match(/,/g) || []).length;
} 