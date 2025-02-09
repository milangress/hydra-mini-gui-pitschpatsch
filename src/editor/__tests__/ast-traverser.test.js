import { expect, test, describe, beforeEach } from "bun:test";
import { ASTTraverser } from "../ast/ast-traverser.js";
import { Parser } from 'acorn';

// Mock Hydra instance with transform definitions
const mockHydra = {
    generator: {
        glslTransforms: {
            osc: {
                inputs: [
                    { name: "frequency", type: "float", default: 60 },
                    { name: "sync", type: "float", default: 0.1 },
                    { name: "offset", type: "float", default: 0.0 }
                ]
            },
            color: {
                inputs: [
                    { name: "r", type: "float", default: 1 },
                    { name: "g", type: "float", default: 1 },
                    { name: "b", type: "float", default: 1 }
                ]
            }
        }
    },
    o: Array(4).fill({ label: null }),
    s: Array(4).fill({ label: null })
};

describe("ASTTraverser", () => {
    let traverser;
    
    beforeEach(() => {
        traverser = new ASTTraverser(mockHydra);
    });

    describe("_getFunctionNameFromAST", () => {
        test("should handle standalone function calls", () => {
            const code = "osc(10)";
            const ast = Parser.parse(code, { locations: true, ecmaVersion: 'latest' });
            const node = ast.body[0].expression.arguments[0];
            const parents = [ast.body[0].expression];

            const result = traverser._getFunctionNameFromAST(node, parents);
            expect(result).toMatchObject({
                name: "osc",
                startCh: 0
            });
        });

        test("should handle method chains", () => {
            const code = "osc(10).color(1).out()";
            const ast = Parser.parse(code, { locations: true, ecmaVersion: 'latest' });
            // Get the literal node (10) in osc(10)
            const node = ast.body[0].expression.callee.object.callee.object.arguments[0];
            const parents = [
                ast.body[0].expression.callee.object.callee.object, // osc(10)
                ast.body[0].expression.callee.object, // osc(10).color(1)
                ast.body[0].expression // osc(10).color(1).out()
            ];

            const result = traverser._getFunctionNameFromAST(node, parents);
            expect(result).toMatchObject({
                name: "osc",
                startCh: expect.any(Number)
            });
        });

        test("should handle nested function calls", () => {
            const code = "solid(1).add(osc(10), 0.5)";
            const ast = Parser.parse(code, { locations: true, ecmaVersion: 'latest' });
            // Get the literal node (10) inside osc(10)
            const oscNode = ast.body[0].expression.arguments[0].arguments[0];
            const parents = [
                ast.body[0].expression.arguments[0], // osc(10)
                ast.body[0].expression // solid(1).add(osc(10), 0.5)
            ];

            const result = traverser._getFunctionNameFromAST(oscNode, parents);
            expect(result.name).toBe("osc");
        });
    });

    describe("_getParameterCount", () => {
        test("should return correct parameter index", () => {
            const code = "color(1, 0.5, 0.8)";
            const ast = Parser.parse(code, { locations: true, ecmaVersion: 'latest' });
            const secondParam = ast.body[0].expression.arguments[1];
            const parents = [ast.body[0].expression];

            const result = traverser._getParameterCount(secondParam, parents);
            expect(result).toBe(1); // 0-based index
        });

        test("should handle no parent call expression", () => {
            const code = "42";
            const ast = Parser.parse(code, { locations: true, ecmaVersion: 'latest' });
            const node = ast.body[0].expression;

            const result = traverser._getParameterCount(node, []);
            expect(result).toBe(0);
        });
    });

    describe("findValues", () => {
        test("should find all numeric values with correct metadata", () => {
            const code = "osc(60).color(1, 0.5, 0.8).out()";
            const ast = Parser.parse(code, { locations: true, ecmaVersion: 'latest' });
            
            const values = traverser.findValues(ast, code);
            
            expect(values).toHaveLength(4);
            expect(values[0]).toMatchObject({
                value: 60,
                type: "number",
                functionName: "osc",
                parameterIndex: 0,
                paramName: "frequency"
            });
            expect(values[1]).toMatchObject({
                value: 1,
                type: "number",
                functionName: "color",
                parameterIndex: 0,
                paramName: "r"
            });
        });

        test("should handle source and output references", () => {
            const code = "s0.mult(o1, 0.5).out(o2)";
            const ast = Parser.parse(code, { locations: true, ecmaVersion: 'latest' });
            
            const values = traverser.findValues(ast, code);
            
            expect(values).toHaveLength(4); // s0, o1, 0.5, o2
            expect(values[0]).toMatchObject({
                value: "s0",
                type: "source"
            });
            expect(values[1]).toMatchObject({
                value: "o1",
                type: "output"
            });
        });

        test("should handle complex nested expressions", () => {
            const code = "solid(1).add(osc(10).color(0.5), 0.8).out()";
            const ast = Parser.parse(code, { locations: true, ecmaVersion: 'latest' });
            
            const values = traverser.findValues(ast, code);
            
            expect(values).toHaveLength(4); // 1, 10, 0.5, 0.8
            expect(values.map(v => v.value)).toEqual([1, 10, 0.5, 0.8]);
            expect(values.map(v => v.functionName)).toEqual([
                "solid", "osc", "color", "add"
            ]);
        });

        test("should handle invalid or empty code", () => {
            expect(traverser.findValues(null, "")).toHaveLength(0);
            expect(traverser.findValues(null, "invalid code")).toHaveLength(0);
        });

        test("should ignore numbers in loadScript", () => {
            const code = "loadScript('test.js', 100)";
            const ast = Parser.parse(code, { locations: true, ecmaVersion: 'latest' });
            
            const values = traverser.findValues(ast, code);
            expect(values).toHaveLength(0);
        });
    });
}); 