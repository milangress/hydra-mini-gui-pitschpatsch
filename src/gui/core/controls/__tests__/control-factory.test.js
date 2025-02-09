import { ControlFactory } from '../control-factory.js';
import { ParameterGroupDetector } from '../../../utils/parameter-group-detector.js';
import { ColorControl } from '../color-control.js';
import { PointControl } from '../point-control.js';
import { NumberControl } from '../number-control.js';

// Mock the controls and their bindings
jest.mock('../color-control.js');
jest.mock('../point-control.js');
jest.mock('../number-control.js');
jest.mock('../../../utils/parameter-group-detector.js');

describe('ControlFactory', () => {
    let mockFolder;
    let mockTweakpaneAdapter;
    let mockOnChange;
    
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Setup mock folder and adapter
        mockFolder = {};
        mockTweakpaneAdapter = {};
        mockOnChange = jest.fn();
        
        // Setup mock control bindings
        const mockBinding = {
            binding: {},
            controller: {},
            originalValue: 0
        };
        
        ColorControl.mockImplementation(() => ({
            createBinding: () => [mockBinding, mockBinding, mockBinding]
        }));
        
        PointControl.mockImplementation(() => ({
            createBinding: () => [mockBinding, mockBinding]
        }));
        
        NumberControl.mockImplementation(() => ({
            createBinding: () => mockBinding
        }));
    });
    
    describe('createControls', () => {
        test('creates controls for all parameter groups', () => {
            const params = [
                { paramName: 'r', index: 0 },
                { paramName: 'g', index: 1 },
                { paramName: 'b', index: 2 },
                { paramName: 'posX', index: 3 },
                { paramName: 'posY', index: 4 },
                { paramName: 'frequency', index: 5 }
            ];
            
            const mockGroups = [
                {
                    type: 'color',
                    params: params.slice(0, 3),
                    metadata: { pattern: 'rgb' }
                },
                {
                    type: 'point',
                    params: params.slice(3, 5),
                    metadata: { pattern: 'xy', label: 'pos' }
                },
                {
                    type: 'number',
                    params: [params[5]],
                    metadata: { label: 'frequency' }
                }
            ];
            
            ParameterGroupDetector.detectGroups.mockReturnValue(mockGroups);
            
            const controls = ControlFactory.createControls(
                mockFolder,
                params,
                mockOnChange,
                mockTweakpaneAdapter
            );
            
            expect(ColorControl).toHaveBeenCalled();
            expect(PointControl).toHaveBeenCalled();
            expect(NumberControl).toHaveBeenCalled();
            expect(controls.size).toBe(6); // 3 for color, 2 for point, 1 for number
        });
        
        test('handles empty parameter list', () => {
            ParameterGroupDetector.detectGroups.mockReturnValue([]);
            
            const controls = ControlFactory.createControls(
                mockFolder,
                [],
                mockOnChange,
                mockTweakpaneAdapter
            );
            
            expect(controls.size).toBe(0);
            expect(ColorControl).not.toHaveBeenCalled();
            expect(PointControl).not.toHaveBeenCalled();
            expect(NumberControl).not.toHaveBeenCalled();
        });
    });
    
    describe('createControlForGroup', () => {
        test('creates color control for color group', () => {
            const group = {
                type: 'color',
                params: [
                    { paramName: 'r', index: 0, value: 1, paramDefault: 0 },
                    { paramName: 'g', index: 1, value: 1, paramDefault: 0 },
                    { paramName: 'b', index: 2, value: 1, paramDefault: 0 }
                ],
                metadata: { pattern: 'rgb' }
            };
            
            const bindings = ControlFactory.createControlForGroup(
                group,
                mockFolder,
                mockOnChange,
                mockTweakpaneAdapter
            );
            
            expect(ColorControl).toHaveBeenCalled();
            expect(bindings.size).toBe(3);
        });
        
        test('creates point control for point group', () => {
            const group = {
                type: 'point',
                params: [
                    { paramName: 'posX', index: 0, value: 0.5, paramDefault: 0 },
                    { paramName: 'posY', index: 1, value: 0.5, paramDefault: 0 }
                ],
                metadata: { pattern: 'xy', label: 'pos' }
            };
            
            const bindings = ControlFactory.createControlForGroup(
                group,
                mockFolder,
                mockOnChange,
                mockTweakpaneAdapter
            );
            
            expect(PointControl).toHaveBeenCalled();
            expect(bindings.size).toBe(2);
        });
        
        test('creates number control for number group', () => {
            const group = {
                type: 'number',
                params: [
                    { paramName: 'frequency', index: 0, value: 440, paramDefault: 440 }
                ],
                metadata: { label: 'frequency' }
            };
            
            const bindings = ControlFactory.createControlForGroup(
                group,
                mockFolder,
                mockOnChange,
                mockTweakpaneAdapter
            );
            
            expect(NumberControl).toHaveBeenCalled();
            expect(bindings.size).toBe(1);
        });
    });
}); 