import { expect, test, describe, beforeEach } from "bun:test";
import { CodeFormatter } from "../code-formatter.js";
import { Parser } from 'acorn';

// Mock Hydra instance
const mockHydra = {
    o: Array(4).fill({ label: null }),
    s: Array(4).fill({ label: null })
};

describe("CodeFormatter", () => {
    let formatter;
    
    beforeEach(() => {
        formatter = new CodeFormatter(mockHydra);
    });

    describe("_formatNumber", () => {
        test("should format numbers < 1 with 3 decimal places", () => {
            expect(formatter._formatNumber(0.123456)).toBe("0.123");
            expect(formatter._formatNumber(0.100)).toBe("0.1");
        });

        test("should format numbers < 10 with 2 decimal places", () => {
            expect(formatter._formatNumber(1.23456)).toBe("1.23");
            expect(formatter._formatNumber(9.5000)).toBe("9.5");
        });

        test("should round numbers >= 10", () => {
            expect(formatter._formatNumber(10.6)).toBe("11");
            expect(formatter._formatNumber(100.1)).toBe("100");
        });

        test("should handle special numbers", () => {
            expect(formatter._formatNumber(NaN)).toBe("NaN");
            expect(formatter._formatNumber(Infinity)).toBe("Infinity");
            expect(formatter._formatNumber(-Infinity)).toBe("-Infinity");
        });

        test("should handle negative numbers", () => {
            expect(formatter._formatNumber(-0.123456)).toBe("-0.123");
            expect(formatter._formatNumber(-1.23456)).toBe("-1.23");
            expect(formatter._formatNumber(-10.6)).toBe("-11");
        });
    });

    describe("generateCode", () => {
        test("should preserve formatting in simple code", () => {
            const code = "osc(10).out()";
            const ast = Parser.parse(code, { locations: true, ecmaVersion: 'latest' });
            const valueMap = new Map([[0, 20]]);

            const result = formatter.generateCode(ast, code, valueMap);
            expect(result).toBe("osc(20).out()");
        });

        test("should handle multi-line code with indentation", () => {
            const code = "osc(10)\n  .color(0.5)\n  .out()";
            const ast = Parser.parse(code, { locations: true, ecmaVersion: 'latest' });
            const valueMap = new Map([[0, 20], [1, 0.8]]);

            const result = formatter.generateCode(ast, code, valueMap);
            expect(result).toBe("osc(20)\n  .color(0.8)\n  .out()");
        });

        test("should handle arrow function replacements", () => {
            const code = "osc(10).out()";
            const ast = Parser.parse(code, { locations: true, ecmaVersion: 'latest' });
            const valueMap = new Map([[0, "() => freq_value"]]);

            const result = formatter.generateCode(ast, code, valueMap);
            expect(result).toBe("osc(() => freq_value).out()");
        });

        test("should preserve comments", () => {
            const code = "// Oscillator\nosc(10).out()";
            const ast = Parser.parse(code, { locations: true, ecmaVersion: 'latest' });
            const valueMap = new Map([[0, 20]]);

            const result = formatter.generateCode(ast, code, valueMap);
            expect(result).toInclude("// Oscillator");
        });

        test("should handle invalid code gracefully", () => {
            const code = "osc(10).out()";
            const ast = Parser.parse(code, { locations: true, ecmaVersion: 'latest' });
            
            // Test with invalid valueMap
            const result1 = formatter.generateCode(ast, code, null);
            expect(result1).toBe(code);

            // Test with invalid AST
            const result2 = formatter.generateCode(null, code, new Map());
            expect(result2).toBe(code);
        });
    });

    describe("_analyzeCodeStructure", () => {
        test("should identify all numeric values", () => {
            const code = "osc(10, 0.5).color(1).out()";
            const structure = formatter._analyzeCodeStructure(code);
            
            expect(structure.numbers).toHaveLength(3);
            expect(structure.numbers[0].value).toBe(10);
            expect(structure.numbers[1].value).toBe(0.5);
            expect(structure.numbers[2].value).toBe(1);
        });

        test("should track indentation", () => {
            const code = "osc(10)\n  .color(1)\n    .out()";
            const structure = formatter._analyzeCodeStructure(code);
            
            expect(structure.indentation.get(0)).toBe("");
            expect(structure.indentation.get(1)).toBe("  ");
            expect(structure.indentation.get(2)).toBe("    ");
        });

        test("should identify source and output references", () => {
            const code = "s0.mult(o1).out(o2)";
            const structure = formatter._analyzeCodeStructure(code);
            
            expect(structure.identifiers).toHaveLength(3);
            expect(structure.identifiers[0].value).toBe("s0");
            expect(structure.identifiers[1].value).toBe("o1");
            expect(structure.identifiers[2].value).toBe("o2");
        });

        test("should track dot operator positions", () => {
            const code = "osc(10).color(1).out()";
            const structure = formatter._analyzeCodeStructure(code);
            
            const dots = structure.dotOperators.get(0);
            expect(dots).toHaveLength(2);
            expect(dots[0]).toBe(code.indexOf("."));
            expect(dots[1]).toBe(code.lastIndexOf("."));
        });
    });
}); 