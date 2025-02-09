/**
 * @typedef {Object} ParameterGroup
 * @property {'color' | 'point' | 'number'} type - The type of parameter group
 * @property {import('./controls.js').ControlParameter[]} params - The parameters in this group
 * @property {Object} metadata - Additional information about the group
 * @property {string} [metadata.label] - Display label for the group
 * @property {string} [metadata.pattern] - Pattern type (e.g., 'xy', 'rgb', 'speed')
 */

/**
 * @typedef {Object} ColorGroup
 * @property {'color'} type - Always 'color' for color groups
 * @property {import('./controls.js').ControlParameter[]} params - The RGB parameters
 * @property {Object} metadata
 * @property {string} metadata.pattern - 'rgb'
 */

/**
 * @typedef {Object} PointGroup
 * @property {'point'} type - Always 'point' for point groups
 * @property {import('./controls.js').ControlParameter[]} params - The X/Y parameters
 * @property {Object} metadata
 * @property {string} metadata.pattern - One of: 'xy', 'mult', 'speed'
 * @property {string} metadata.label - Base name for the point control
 */

/**
 * @typedef {Object} NumberGroup
 * @property {'number'} type - Always 'number' for number groups
 * @property {import('./controls.js').ControlParameter[]} params - Single parameter
 * @property {Object} metadata
 * @property {string} metadata.label - Name for the number control
 */ 