import { ParameterGroupDetector } from '../parameter-group-detector.js';

describe('ParameterGroupDetector', () => {
    describe('detectGroups', () => {
        test('detects all types of groups in correct order', () => {
            const params = [
                { paramName: 'r', controlName: 'r', index: 0 },
                { paramName: 'g', controlName: 'g', index: 1 },
                { paramName: 'b', controlName: 'b', index: 2 },
                { paramName: 'posX', controlName: 'posX', index: 3 },
                { paramName: 'posY', controlName: 'posY', index: 4 },
                { paramName: 'frequency', controlName: 'frequency', index: 5 }
            ];

            const groups = ParameterGroupDetector.detectGroups(params);

            expect(groups).toHaveLength(3);
            expect(groups[0].type).toBe('color');
            expect(groups[1].type).toBe('point');
            expect(groups[2].type).toBe('number');
        });
    });

    describe('detectColorGroups', () => {
        test('detects RGB color group', () => {
            const params = [
                { paramName: 'r', controlName: 'r', index: 0 },
                { paramName: 'g', controlName: 'g', index: 1 },
                { paramName: 'b', controlName: 'b', index: 2 }
            ];
            const handledParams = new Set();

            const groups = ParameterGroupDetector.detectColorGroups(params, handledParams);

            expect(groups).toHaveLength(1);
            expect(groups[0]).toEqual({
                type: 'color',
                params: params,
                metadata: {
                    pattern: 'rgb'
                }
            });
            expect(handledParams.size).toBe(3);
        });

        test('ignores incomplete RGB groups', () => {
            const params = [
                { paramName: 'r', controlName: 'r', index: 0 },
                { paramName: 'g', controlName: 'g', index: 1 }
            ];
            const handledParams = new Set();

            const groups = ParameterGroupDetector.detectColorGroups(params, handledParams);

            expect(groups).toHaveLength(0);
            expect(handledParams.size).toBe(0);
        });
    });

    describe('detectPointGroups', () => {
        test('detects standard X/Y pair', () => {
            const params = [
                { paramName: 'posX', controlName: 'posX', index: 0 },
                { paramName: 'posY', controlName: 'posY', index: 1 }
            ];
            const handledParams = new Set();

            const groups = ParameterGroupDetector.detectPointGroups(params, handledParams);

            expect(groups).toHaveLength(1);
            expect(groups[0]).toEqual({
                type: 'point',
                params: params,
                metadata: {
                    pattern: 'xy',
                    label: 'pos'
                }
            });
        });

        test('detects mult pair', () => {
            const params = [
                { paramName: 'xMult', controlName: 'xMult', index: 0 },
                { paramName: 'yMult', controlName: 'yMult', index: 1 }
            ];
            const handledParams = new Set();

            const groups = ParameterGroupDetector.detectPointGroups(params, handledParams);

            expect(groups).toHaveLength(1);
            expect(groups[0]).toEqual({
                type: 'point',
                params: params,
                metadata: {
                    pattern: 'mult',
                    label: 'mult'
                }
            });
        });

        test('detects speed pair', () => {
            const params = [
                { paramName: 'speedX', controlName: 'speedX', index: 0 },
                { paramName: 'speedY', controlName: 'speedY', index: 1 }
            ];
            const handledParams = new Set();

            const groups = ParameterGroupDetector.detectPointGroups(params, handledParams);

            expect(groups).toHaveLength(1);
            expect(groups[0]).toEqual({
                type: 'point',
                params: params,
                metadata: {
                    pattern: 'speed',
                    label: 'speed'
                }
            });
        });

        test('ignores already handled parameters', () => {
            const params = [
                { paramName: 'posX', controlName: 'posX', index: 0 },
                { paramName: 'posY', controlName: 'posY', index: 1 }
            ];
            const handledParams = new Set(['posX']);

            const groups = ParameterGroupDetector.detectPointGroups(params, handledParams);

            expect(groups).toHaveLength(0);
        });

        test('ignores incomplete pairs', () => {
            const params = [
                { paramName: 'posX', controlName: 'posX', index: 0 }
            ];
            const handledParams = new Set();

            const groups = ParameterGroupDetector.detectPointGroups(params, handledParams);

            expect(groups).toHaveLength(0);
        });
    });

    describe('detectRemainingNumbers', () => {
        test('creates number groups for unhandled parameters', () => {
            const params = [
                { paramName: 'frequency', controlName: 'frequency', index: 0 },
                { paramName: 'amplitude', controlName: 'amplitude', index: 1 },
                { paramName: 'handled', controlName: 'handled', index: 2 }
            ];
            const handledParams = new Set(['handled']);

            const groups = ParameterGroupDetector.detectRemainingNumbers(params, handledParams);

            expect(groups).toHaveLength(2);
            expect(groups[0]).toEqual({
                type: 'number',
                params: [params[0]],
                metadata: {
                    label: 'frequency'
                }
            });
            expect(groups[1]).toEqual({
                type: 'number',
                params: [params[1]],
                metadata: {
                    label: 'amplitude'
                }
            });
        });

        test('returns empty array when all parameters are handled', () => {
            const params = [
                { paramName: 'frequency', controlName: 'frequency', index: 0 }
            ];
            const handledParams = new Set(['frequency']);

            const groups = ParameterGroupDetector.detectRemainingNumbers(params, handledParams);

            expect(groups).toHaveLength(0);
        });
    });
}); 