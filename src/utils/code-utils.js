/**
 * Utility functions for code analysis and manipulation
 */

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