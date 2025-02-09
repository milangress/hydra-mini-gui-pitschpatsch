import { ParameterUtils } from '../parameter-utils.js';

describe('ParameterUtils', () => {
    describe('getFunctionId', () => {
        test('creates unique function ID', () => {
            const val = {
                functionName: 'osc',
                lineNumber: 1,
                functionStartCh: 0
            };
            
            expect(ParameterUtils.getFunctionId(val)).toBe('osc_line1_pos0');
        });
    });
    
    describe('groupByFunction', () => {
        test('groups values by function', () => {
            const values = [
                {
                    functionName: 'osc',
                    lineNumber: 1,
                    functionStartCh: 0,
                    value: 440
                },
                {
                    functionName: 'osc',
                    lineNumber: 1,
                    functionStartCh: 0,
                    value: 0.5
                }
            ];
            
            const groups = ParameterUtils.groupByFunction(values);
            expect(groups.size).toBe(1);
            
            const group = groups.get('osc_line1_pos0');
            expect(group.name).toBe('osc');
            expect(group.params).toHaveLength(2);
        });
        
        test('applies filter function', () => {
            const values = [
                {
                    functionName: 'osc',
                    lineNumber: 1,
                    functionStartCh: 0,
                    value: 440
                },
                {
                    functionName: 'sin',
                    lineNumber: 2,
                    functionStartCh: 0,
                    value: 0.5
                }
            ];
            
            const groups = ParameterUtils.groupByFunction(values, val => val.functionName === 'osc');
            expect(groups.size).toBe(1);
            
            const group = groups.get('osc_line1_pos0');
            expect(group.name).toBe('osc');
            expect(group.params).toHaveLength(1);
        });
    });
    
    describe('sortAndCountInstances', () => {
        test('sorts groups by line and position', () => {
            const groups = new Map([
                ['osc_line2_pos0', { name: 'osc', line: 2, position: 0, params: [{}] }],
                ['sin_line1_pos0', { name: 'sin', line: 1, position: 0, params: [{}] }]
            ]);
            
            const sorted = ParameterUtils.sortAndCountInstances(groups);
            expect(sorted).toHaveLength(2);
            expect(sorted[0].displayName).toBe('sin');
            expect(sorted[1].displayName).toBe('osc');
        });
        
        test('adds instance numbers for duplicate functions', () => {
            const groups = new Map([
                ['osc_line1_pos0', { name: 'osc', line: 1, position: 0, params: [{}] }],
                ['osc_line2_pos0', { name: 'osc', line: 2, position: 0, params: [{}] }]
            ]);
            
            const sorted = ParameterUtils.sortAndCountInstances(groups);
            expect(sorted).toHaveLength(2);
            expect(sorted[0].displayName).toBe('osc');
            expect(sorted[1].displayName).toBe('osc 2');
        });
    });
    
    describe('updateControlValue', () => {
        test('updates regular control value', () => {
            const control = {
                binding: { frequency: 440 },
                controller: { refresh: jest.fn() },
                name: 'frequency'
            };
            
            ParameterUtils.updateControlValue(control, 880);
            expect(control.binding.frequency).toBe(880);
            expect(control.controller.refresh).toHaveBeenCalled();
        });
        
        test('updates color control value', () => {
            const control = {
                binding: { color: { r: 0 } },
                controller: { refresh: jest.fn() },
                isColor: true,
                colorComponent: 'r'
            };
            
            ParameterUtils.updateControlValue(control, 1);
            expect(control.binding.color.r).toBe(1);
            expect(control.controller.refresh).toHaveBeenCalled();
        });
        
        test('updates point control value', () => {
            const control = {
                binding: { point: { x: 0 } },
                controller: { refresh: jest.fn() },
                isPoint: true,
                pointKey: 'point',
                pointComponent: 'x',
                mapPoint: true
            };
            
            ParameterUtils.updateControlValue(control, 1);
            expect(control.binding.point.x).toBe(1.5);
            expect(control.controller.refresh).toHaveBeenCalled();
        });
    });
    
    describe('resetControlValue', () => {
        test('resets regular control value', () => {
            const control = {
                binding: { frequency: 880 },
                controller: { refresh: jest.fn() },
                name: 'frequency',
                originalValue: 440
            };
            
            ParameterUtils.resetControlValue(control);
            expect(control.binding.frequency).toBe(440);
            expect(control.controller.refresh).toHaveBeenCalled();
        });
        
        test('resets color control value', () => {
            const control = {
                binding: { color: { r: 1 } },
                controller: { refresh: jest.fn() },
                isColor: true,
                colorComponent: 'r',
                originalValue: 0
            };
            
            ParameterUtils.resetControlValue(control);
            expect(control.binding.color.r).toBe(0);
            expect(control.controller.refresh).toHaveBeenCalled();
        });
        
        test('resets point control value', () => {
            const control = {
                binding: { point: { x: 1.5 } },
                controller: { refresh: jest.fn() },
                isPoint: true,
                pointKey: 'point',
                pointComponent: 'x',
                mapPoint: true,
                originalValue: 0
            };
            
            ParameterUtils.resetControlValue(control);
            expect(control.binding.point.x).toBe(-0.5);
            expect(control.controller.refresh).toHaveBeenCalled();
        });
    });
}); 