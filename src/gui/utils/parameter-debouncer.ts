/**
 * Utility class for debouncing parameter updates
 */
export class ParameterUpdateDebouncer {
    private timeout: number | null = null;
    private lastParameterMap: Map<number, number | string> | null = null;
    private lastCode: string | null = null;
    private lastEvalRange: any | null = null;

    /**
     * Schedules an update with debouncing
     * @param callback - Function to call after debounce
     * @param currentParams - Current parameter map
     * @param code - Current code
     * @param evalRange - Current eval range
     * @returns void
     */
    scheduleUpdate(
        callback: () => void,
        currentParams: Map<number, number | string>,
        code: string | null,
        evalRange: any | null
    ): void {
        // Cancel existing timeout
        if (this.timeout !== null) {
            window.clearTimeout(this.timeout);
            this.timeout = null;
        }

        // Check if code or eval range changed
        if (code !== this.lastCode || evalRange !== this.lastEvalRange) {
            this.lastCode = code;
            this.lastEvalRange = evalRange;
            return; // Cancel update if code context changed
        }

        // Store current parameter map
        this.lastParameterMap = new Map(currentParams);

        // Schedule new update
        this.timeout = window.setTimeout(() => {
            // Verify parameters haven't changed during timeout
            if (this.lastParameterMap && this.mapEquals(this.lastParameterMap, currentParams)) {
                callback();
            }
        }, 1000); // 1 second debounce
    }

    /**
     * Compare two parameter maps for equality
     */
    private mapEquals(
        map1: Map<number, number | string>,
        map2: Map<number, number | string>
    ): boolean {
        if (map1.size !== map2.size) return false;
        for (const [key, value] of map1) {
            if (!map2.has(key) || map2.get(key) !== value) return false;
        }
        return true;
    }

    /**
     * Cleanup any pending timeouts
     */
    cleanup(): void {
        if (this.timeout !== null) {
            window.clearTimeout(this.timeout);
            this.timeout = null;
        }
    }
} 