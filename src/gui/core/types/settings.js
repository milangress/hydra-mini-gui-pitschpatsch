/**
 * @typedef {Object} SettingsConfig
 * @property {boolean} isLoggingEnabled - Whether logging is enabled
 * @property {string} currentCode - Current code being monitored
 * @property {Object[]} defaultValues - Array of default values for parameters
 */

/**
 * @typedef {Object} SettingsCallbacks
 * @property {Function} onReset - Callback for resetting all values
 * @property {Function} onSetDefault - Callback for setting a value to its default
 * @property {Function} onHush - Callback for hushing the synth
 */

/**
 * @typedef {Object} SettingsFolders
 * @property {Object} controls - Controls folder configuration
 * @property {Object} stats - Statistics folder configuration
 * @property {Object} defaults - Defaults folder configuration
 * @property {Object} codeMonitor - Code monitor folder configuration
 * @property {Object} errors - Errors folder configuration
 */ 