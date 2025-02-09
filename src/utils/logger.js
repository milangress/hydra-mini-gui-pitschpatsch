export class Logger {
    static isEnabled = true;

    static log(...args) {
        if (this.isEnabled) {
            console.log(...args);
        }
    }

    static error(...args) {
        if (this.isEnabled) {
            console.error(...args);
        }
    }

    static setEnabled(enabled) {
        this.isEnabled = enabled;
    }
} 