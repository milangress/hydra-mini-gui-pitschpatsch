export class Logger {
    static isEnabled = true;

    private static getCallerInfo(): string {
        const error = new Error();
        const stack = error.stack?.split('\n')[3] || ''; // Skip logger frames
        const match = stack.match(/at\s+(?:.*\s+\()?(.+):(\d+):(\d+)/);
        if (match) {
            const url = (document?.currentScript as HTMLScriptElement)?.src || 'http://localhost:3000/hydra-pitschpatsch.js'
            const [, , line] = match;
            return url + ':' + line;
        }
        return '[unknown source]';
    }

    static log(...args: unknown[]): void {
        if (this.isEnabled) {
            const source = this.getCallerInfo();
            console.log(source, ...args);
        }
    }

    static error(...args: unknown[]): void {
        if (this.isEnabled) {
            const source = this.getCallerInfo();
            console.error(source, ...args);
        }
    }

    static setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
    }
} 