import { expect, test, describe, beforeEach, mock } from "bun:test";
import { CodeValueManager } from "../code-value-manager.js";

// Mock window and CodeMirror
const mockWindow = {
    cm: {
        getRange: (start, end) => "",
        startOperation: () => {},
        endOperation: () => {},
        replaceRange: (text, start, end) => {}
    }
};

// Mock Hydra instance
const mockHydra = {
    eval: () => {},  // Simple function to be mocked later
    generator: {
        glslTransforms: {
            osc: {
                inputs: [
                    { name: "frequency", type: "float", default: 60 },
                    { name: "sync", type: "float", default: 0.1 },
                    { name: "offset", type: "float", default: 0.0 }
                ]
            },
            rotate: {
                inputs: [
                    { name: "angle", type: "float", default: 0 }
                ]
            }
        }
    },
    o: Array(4).fill({ label: null }),
    s: Array(4).fill({ label: null })
};

describe("CodeValueManager", () => {
    let manager;
    
    beforeEach(() => {
        // Reset mocks and create fresh instance
        global.window = mockWindow;
        mockHydra.eval = mock(() => {});  // Create new mock for each test
        manager = new CodeValueManager(mockHydra);
    });

    describe("findValues", () => {
        test("should find numeric values in simple code", () => {
            const code = "osc(10).out()";
            const values = manager.findValues(code);
            
            expect(values).toHaveLength(1);
            expect(values[0]).toMatchObject({
                value: 10,
                type: "number",
                functionName: "osc",
                parameterIndex: 0
            });
        });

        test("should handle method chains", () => {
            const code = "osc(60).color(1, 0.5).out()";
            const values = manager.findValues(code);
            
            expect(values).toHaveLength(3);
            expect(values[0].value).toBe(60);
            expect(values[1].value).toBe(1);
            expect(values[2].value).toBe(0.5);
        });

        test("should handle negative numbers", () => {
            const code = "osc(-10).color(-1).out()";
            const values = manager.findValues(code);
            
            expect(values).toHaveLength(2);
            expect(values[0].value).toBe(-10);
            expect(values[1].value).toBe(-1);
        });

        test("should find source and output references", () => {
            const code = "s0.mult(o1).out(o2)";
            const values = manager.findValues(code);
            
            expect(values).toHaveLength(3);
            expect(values[0]).toMatchObject({ value: "s0", type: "source" });
            expect(values[1]).toMatchObject({ value: "o1", type: "output" });
            expect(values[2]).toMatchObject({ value: "o2", type: "output" });
        });
    });

    describe("updateValue", () => {
        test("should update a simple numeric value", async () => {
            mock.module("../code-formatter.js", () => ({
                generateCode: (ast, code, valueMap) => "osc(20).out()"
            }));

            const code = "osc(10).out()";
            const values = manager.findValues(code);

            manager.updateValue(0, 20, values, { 
                start: { line: 0, ch: 0 }, 
                end: { line: 0, ch: code.length } 
            });

            // Wait for debounce
            await new Promise(resolve => setTimeout(resolve, 2100));
            
            expect(mockHydra.eval).toHaveBeenCalled();
        });

        test("should handle arrow function conversion", async () => {
            const code = "osc(10).out()";
            const values = manager.findValues(code);

            manager.updateValue(0, 20, values, {
                start: { line: 0, ch: 0 },
                end: { line: 0, ch: code.length }
            });

            // First update should create arrow function
            expect(mockHydra.eval).toHaveBeenCalledWith(expect.stringContaining("() =>"));

            // Wait for debounce
            await new Promise(resolve => setTimeout(resolve, 2100));
        });

        test("should handle evaluation errors gracefully", async () => {
            const code = "osc(10).out()";
            const values = manager.findValues(code);
            mockHydra.eval = mock(() => { throw new Error("Eval failed"); });

            // Should not throw
            expect(() => {
                manager.updateValue(0, 20, values, {
                    start: { line: 0, ch: 0 },
                    end: { line: 0, ch: code.length }
                });
            }).not.toThrow();

            // Wait for debounce
            await new Promise(resolve => setTimeout(resolve, 2100));
        });
    });

    describe("variable name generation", () => {
        test("should generate unique names for different parameters of same function", () => {
            const code = "osc(10, 0.5, 0)";
            const values = manager.findValues(code);
            
            // Get variable names for each parameter
            const names = values.map(v => manager._generateVariableName(v));
            
            // Check all names are unique
            const uniqueNames = new Set(names);
            expect(uniqueNames.size).toBe(names.length);
            
            // Check names contain parameter info
            expect(names[0]).toInclude("freq");
            expect(names[1]).toInclude("sync");
            expect(names[2]).toInclude("offset");
        });

        test("should generate unique names for nested function calls", () => {
            const code = "osc(10).rotate(6.22).out()";
            const values = manager.findValues(code);
            
            // Get variable names for each value
            const names = values.map(v => manager._generateVariableName(v));
            
            // Check all names are unique
            const uniqueNames = new Set(names);
            expect(uniqueNames.size).toBe(names.length);
            
            // Check names contain function context
            expect(names[0]).toInclude("osc");
            expect(names[1]).toInclude("rotate");
        });

        test("should handle multiple parameters in complex chains", () => {
            const code = "osc(10, 0.5).rotate(6.22).out()";
            const values = manager.findValues(code);
            
            // Get variable names for each value
            const names = values.map(v => manager._generateVariableName(v));
            
            // Check all names are unique
            const uniqueNames = new Set(names);
            expect(uniqueNames.size).toBe(names.length);
            
            // Verify each name includes its parameter context
            expect(names[0]).toInclude("osc_freq");
            expect(names[1]).toInclude("osc_sync");
            expect(names[2]).toInclude("rotate_angle");
        });
    });
}); 