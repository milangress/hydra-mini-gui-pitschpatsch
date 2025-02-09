export class Logger {
    static isEnabled = true;

    static getCallerInfo() {
        const error = new Error();
        const stack = error.stack.split('\n')[3]; // Skip logger frames
        const match = stack.match(/at\s+(?:.*\s+\()?(.+):(\d+):(\d+)/);
        if (match) {
            const url = document?.currentScript?.src || 'http://localhost:3000/hydra-mini-gui.js'
            const [, file, line, column] = match;
            // return `[${file.split('/').pop()}:${line}]`;
            return url + ':' + line;
        }
        return '[unknown source]';
    }

    static log(...args) {
        if (this.isEnabled) {
            const source = this.getCallerInfo();
            console.log(source, ...args);
        }
    }

    static error(...args) {
        if (this.isEnabled) {
            const source = this.getCallerInfo();
            console.error(source, ...args);
        }
    }

    static setEnabled(enabled) {
        this.isEnabled = enabled;
    }
} 