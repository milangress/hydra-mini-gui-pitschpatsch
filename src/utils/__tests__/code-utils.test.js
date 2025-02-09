import { expect, test, describe } from "bun:test";
import { removeLoadScriptLines, extractFunctionNameFromCode } from '../code-utils.js';

describe('code-utils', () => {
    describe('removeLoadScriptLines', () => {
        test('should remove loadScript lines', () => {
            const code = `loadScript('test.js')
osc(60).out()
loadScript('test2.js', 100)`;
            const result = removeLoadScriptLines(code);
            expect(result).toBe('osc(60).out()');
        });

        test('should remove await loadScript lines', () => {
            const code = `await loadScript('test.js')
osc(60).out()
await loadScript('test2.js')`;
            const result = removeLoadScriptLines(code);
            expect(result).toBe('osc(60).out()');
        });

        test('should handle mixed loadScript and await loadScript', () => {
            const code = `loadScript('test.js')
await loadScript('test2.js')
osc(60).out()
noise(0.5).out()
await loadScript('test3.js')`;
            const result = removeLoadScriptLines(code);
            expect(result).toBe('osc(60).out()\nnoise(0.5).out()');
        });

        test('should handle empty or null input', () => {
            expect(removeLoadScriptLines('')).toBe('');
            expect(removeLoadScriptLines(null)).toBe(null);
        });

        test('should preserve indentation and spacing', () => {
            const code = `  loadScript('test.js')
  osc(60)
    .color(1,0.5,0)
    .out()
  await loadScript('test2.js')`;
            const result = removeLoadScriptLines(code);
            expect(result).toBe('  osc(60)\n    .color(1,0.5,0)\n    .out()');
        });
    });

    describe('extractFunctionNameFromCode', () => {
        // ... existing tests if any ...
    });
}); 