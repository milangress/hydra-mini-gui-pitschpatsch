/**
 * @typedef {Object} ControlConfig
 * @property {string} name - The name of the control
 * @property {any} value - The current value
 * @property {any} defaultValue - The default value
 * @property {Function} onChange - Callback for value changes
 * @property {Object} options - Additional control options
 */

/**
 * @typedef {Object} ControlOptions
 * @property {number} [min] - Minimum value for number controls
 * @property {number} [max] - Maximum value for number controls
 * @property {number} [step] - Step value for number controls
 * @property {string} [label] - Label to display
 * @property {boolean} [readonly] - Whether the control is read-only
 */

/**
 * @typedef {Object} ControlBinding
 * @property {Object} binding - The Tweakpane binding object
 * @property {Object} controller - The Tweakpane controller
 * @property {any} originalValue - The original value
 * @property {boolean} [isColor] - Whether this is a color control
 * @property {string} [colorComponent] - The color component (r,g,b,a)
 * @property {boolean} [isPoint] - Whether this is a point control
 * @property {string} [pointKey] - The point key (point, pos, etc)
 * @property {string} [pointComponent] - The point component (x,y)
 * @property {boolean} [mapPoint] - Whether to map point values
 */

/**
 * @typedef {Object} ControlParameter
 * @property {string} functionName - Name of the function
 * @property {string} paramName - Name of the parameter
 * @property {string} paramType - Type of the parameter
 * @property {any} value - Current value
 * @property {any} paramDefault - Default value
 * @property {number} index - Parameter index
 * @property {number} parameterIndex - Parameter order in function
 */ 