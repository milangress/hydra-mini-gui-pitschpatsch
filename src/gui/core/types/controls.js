/**
 * @typedef {Object} ControlConfig
 * @property {string} name - The name of the control
 * @property {any} value - The current value
 * @property {any} defaultValue - The default value
 * @property {Function} onChange - Callback for value changes
 * @property {ControlOptions} options - Additional control options
 */

/**
 * @typedef {Object} BaseControlOptions
 * @property {string} [label] - Label to display
 * @property {boolean} [readonly] - Whether the control is read-only
 */

/**
 * @typedef {Object} NumberControlOptions
 * @property {string} [label] - Label to display
 * @property {number} [min] - Minimum value
 * @property {number} [max] - Maximum value
 * @property {number} [step] - Step value
 * @property {'number' | 'select'} [type] - Type of number control
 * @property {any[]} [values] - Values for select type
 */

/**
 * @typedef {Object} PointControlOptions
 * @property {string} [label] - Label to display
 * @property {Object} x - X axis options
 * @property {number} x.min - Minimum X value
 * @property {number} x.max - Maximum X value
 * @property {number} x.step - X step value
 * @property {Object} y - Y axis options
 * @property {number} y.min - Minimum Y value
 * @property {number} y.max - Maximum Y value
 * @property {number} y.step - Y step value
 * @property {'normal' | 'centered' | 'extended'} [mode] - Point mapping mode
 */

/**
 * @typedef {Object} ColorControlOptions
 * @property {string} [label] - Label to display
 * @property {'float' | 'rgb'} [type] - Color value type
 */

/**
 * @typedef {BaseControlOptions | NumberControlOptions | PointControlOptions | ColorControlOptions} ControlOptions
 */

/**
 * @typedef {Object} ControlBinding
 * @property {Object} binding - The Tweakpane binding object
 * @property {Object} controller - The Tweakpane controller
 * @property {any} originalValue - The original value
 * @property {boolean} [isColor] - Whether this is a color control
 * @property {string} [colorComponent] - The color component (r,g,b)
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