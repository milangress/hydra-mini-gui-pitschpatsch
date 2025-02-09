import { TweakpaneAdapter } from '../tweakpane-adapter.js';
import { Pane } from 'tweakpane';

// Mock Tweakpane
jest.mock('tweakpane');

describe('TweakpaneAdapter', () => {
    let adapter;
    let mockPane;
    let mockFolder;
    let mockBinding;
    let mockButton;
    
    beforeEach(() => {
        mockBinding = {
            element: { classList: { add: jest.fn() } }
        };
        
        mockButton = {
            on: jest.fn(() => mockButton)
        };
        
        mockFolder = {
            addFolder: jest.fn(() => mockFolder),
            addBinding: jest.fn(() => mockBinding),
            addButton: jest.fn(() => mockButton),
            children: [{ dispose: jest.fn() }]
        };
        
        mockPane = {
            addFolder: jest.fn(() => mockFolder),
            addBinding: jest.fn(() => mockBinding),
            addButton: jest.fn(() => mockButton),
            addTab: jest.fn(() => ({ pages: [] })),
            dispose: jest.fn()
        };
        
        Pane.mockImplementation(() => mockPane);
        
        adapter = new TweakpaneAdapter();
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    describe('createPane', () => {
        test('creates new Tweakpane instance', () => {
            const config = { title: 'Test' };
            const pane = adapter.createPane(config);
            
            expect(Pane).toHaveBeenCalledWith(config);
            expect(pane).toBe(mockPane);
            expect(adapter.pane).toBe(mockPane);
        });
    });
    
    describe('createFolder', () => {
        test('creates folder with title and expanded state', () => {
            const parent = mockPane;
            const config = { title: 'Test', expanded: true };
            
            adapter.createFolder(parent, config);
            
            expect(parent.addFolder).toHaveBeenCalledWith({
                title: 'Test',
                expanded: true
            });
        });
    });
    
    describe('createBinding', () => {
        test('creates binding with options', () => {
            const folder = mockFolder;
            const obj = { value: 1 };
            const key = 'value';
            const options = { min: 0, max: 1 };
            
            adapter.createBinding(folder, obj, key, options);
            
            expect(folder.addBinding).toHaveBeenCalledWith(obj, key, {
                readonly: false,
                min: 0,
                max: 1
            });
        });
    });
    
    describe('createReadOnlyBinding', () => {
        test('creates read-only binding', () => {
            const folder = mockFolder;
            const obj = { value: 1 };
            const key = 'value';
            
            adapter.createReadOnlyBinding(folder, obj, key);
            
            expect(folder.addBinding).toHaveBeenCalledWith(obj, key, {
                readonly: true
            });
        });
    });
    
    describe('createButton', () => {
        test('creates button with click handler', () => {
            const folder = mockFolder;
            const config = {
                title: 'Test',
                label: 'Click me',
                onClick: jest.fn()
            };
            
            adapter.createButton(folder, config);
            
            expect(folder.addButton).toHaveBeenCalledWith({
                title: 'Test',
                label: 'Click me'
            });
            expect(mockButton.on).toHaveBeenCalledWith('click', config.onClick);
        });
    });
    
    describe('clearFolder', () => {
        test('disposes all children in folder', () => {
            const folder = mockFolder;
            
            adapter.clearFolder(folder);
            
            expect(folder.children[0].dispose).toHaveBeenCalled();
        });
        
        test('does nothing if folder is null', () => {
            adapter.clearFolder(null);
            expect(mockFolder.children[0].dispose).not.toHaveBeenCalled();
        });
    });
    
    describe('createMessageBinding', () => {
        test('creates read-only message binding', () => {
            const folder = mockFolder;
            const message = 'Test message';
            
            adapter.createMessageBinding(folder, message);
            
            expect(folder.addBinding).toHaveBeenCalledWith(
                { message },
                'message',
                { readonly: true }
            );
        });
    });
    
    describe('createErrorBinding', () => {
        test('creates error message binding with error class', () => {
            const folder = mockFolder;
            const message = 'Error message';
            
            adapter.createErrorBinding(folder, message);
            
            expect(mockBinding.element.classList.add).toHaveBeenCalledWith('error-message');
        });
    });
    
    describe('createCodeBinding', () => {
        test('creates multiline code binding', () => {
            const folder = mockFolder;
            const code = 'console.log("test");';
            
            adapter.createCodeBinding(folder, code);
            
            expect(folder.addBinding).toHaveBeenCalledWith(
                { code },
                'code',
                {
                    readonly: true,
                    multiline: true,
                    rows: 5
                }
            );
        });
    });
    
    describe('createTabs', () => {
        test('creates tabs with titles', () => {
            adapter.pane = mockPane;
            const titles = ['Tab 1', 'Tab 2'];
            
            adapter.createTabs(titles);
            
            expect(mockPane.addTab).toHaveBeenCalledWith({
                pages: [
                    { title: 'Tab 1' },
                    { title: 'Tab 2' }
                ]
            });
        });
        
        test('returns null if no pane exists', () => {
            adapter.pane = null;
            const result = adapter.createTabs(['Tab 1']);
            expect(result).toBeNull();
        });
    });
    
    describe('cleanup', () => {
        test('disposes pane and resets state', () => {
            adapter.pane = mockPane;
            
            adapter.cleanup();
            
            expect(mockPane.dispose).toHaveBeenCalled();
            expect(adapter.pane).toBeNull();
        });
        
        test('does nothing if no pane exists', () => {
            adapter.pane = null;
            adapter.cleanup();
            expect(mockPane.dispose).not.toHaveBeenCalled();
        });
    });
}); 