import { DOMAdapter } from '../dom-adapter.js';
import { DEFAULT_GUI_STYLES } from '../../core/types/styles.js';

describe('DOMAdapter', () => {
    let adapter;
    let mockDocument;
    let mockElement;
    let mockHead;
    
    beforeEach(() => {
        // Setup mock DOM elements and methods
        mockElement = {
            style: {},
            classList: {
                add: jest.fn()
            },
            setAttribute: jest.fn(),
            remove: jest.fn(),
            appendChild: jest.fn()
        };
        
        mockHead = {
            appendChild: jest.fn()
        };
        
        mockDocument = {
            createElement: jest.fn(() => mockElement),
            getElementById: jest.fn(),
            head: mockHead,
            body: {
                appendChild: jest.fn()
            }
        };
        
        // Mock global document
        global.document = mockDocument;
        
        adapter = new DOMAdapter();
    });
    
    afterEach(() => {
        delete global.document;
        jest.clearAllMocks();
    });
    
    describe('createElement', () => {
        test('creates element with styles', () => {
            const element = adapter.createElement('div', {
                style: { color: 'red', fontSize: '12px' }
            });
            
            expect(mockDocument.createElement).toHaveBeenCalledWith('div');
            expect(element.style).toEqual({
                color: 'red',
                fontSize: '12px'
            });
        });
        
        test('creates element with classes', () => {
            adapter.createElement('div', {
                classes: ['class1', 'class2']
            });
            
            expect(mockElement.classList.add).toHaveBeenCalledWith('class1');
            expect(mockElement.classList.add).toHaveBeenCalledWith('class2');
        });
        
        test('creates element with attributes', () => {
            adapter.createElement('div', {
                attributes: { id: 'test', 'data-test': 'value' }
            });
            
            expect(mockElement.setAttribute).toHaveBeenCalledWith('id', 'test');
            expect(mockElement.setAttribute).toHaveBeenCalledWith('data-test', 'value');
        });
        
        test('returns null when document is undefined', () => {
            delete global.document;
            const element = adapter.createElement('div');
            expect(element).toBeNull();
        });
    });
    
    describe('mountContainer', () => {
        test('mounts to editor container when available', () => {
            const editorContainer = { appendChild: jest.fn() };
            mockDocument.getElementById.mockReturnValue(editorContainer);
            
            adapter.mountContainer(mockElement);
            
            expect(mockDocument.getElementById).toHaveBeenCalledWith('editor-container');
            expect(editorContainer.appendChild).toHaveBeenCalledWith(mockElement);
        });
        
        test('mounts to body when editor container not available', () => {
            mockDocument.getElementById.mockReturnValue(null);
            
            adapter.mountContainer(mockElement);
            
            expect(mockDocument.body.appendChild).toHaveBeenCalledWith(mockElement);
        });
        
        test('does nothing when document is undefined', () => {
            delete global.document;
            adapter.mountContainer(mockElement);
            expect(mockElement.appendChild).not.toHaveBeenCalled();
        });
    });
    
    describe('removeExistingGUI', () => {
        test('removes existing GUI element', () => {
            const existingGui = { remove: jest.fn() };
            mockDocument.getElementById.mockReturnValue(existingGui);
            
            adapter.removeExistingGUI();
            
            expect(mockDocument.getElementById).toHaveBeenCalledWith('hydra-mini-gui');
            expect(existingGui.remove).toHaveBeenCalled();
        });
        
        test('does nothing when no GUI exists', () => {
            mockDocument.getElementById.mockReturnValue(null);
            
            adapter.removeExistingGUI();
            
            expect(mockElement.remove).not.toHaveBeenCalled();
        });
    });
    
    describe('setupContainer', () => {
        test('creates and mounts container with layout', () => {
            const layout = {
                zIndex: '9999',
                position: { top: '50px', right: '10px' }
            };
            
            const container = adapter.setupContainer(layout);
            
            expect(container).toBe(mockElement);
            expect(container.style).toEqual({
                zIndex: '9999',
                position: 'fixed',
                top: '50px',
                right: '10px'
            });
            expect(container.classList.add).toHaveBeenCalledWith('hydra-ui');
            expect(container.setAttribute).toHaveBeenCalledWith('id', 'hydra-mini-gui');
        });
        
        test('returns null when document is undefined', () => {
            delete global.document;
            const container = adapter.setupContainer({});
            expect(container).toBeNull();
        });
    });
    
    describe('applyStyles', () => {
        test('applies default styles', () => {
            adapter.applyStyles();
            
            expect(mockDocument.createElement).toHaveBeenCalledWith('style');
            expect(mockElement.setAttribute).toHaveBeenCalledWith('id', 'hydra-mini-gui-styles');
            expect(mockElement.textContent).toBe(Object.values(DEFAULT_GUI_STYLES).join('\n'));
            expect(mockHead.appendChild).toHaveBeenCalledWith(mockElement);
        });
        
        test('applies custom styles', () => {
            const customStyles = {
                custom: '.custom { color: blue; }'
            };
            
            adapter.applyStyles(customStyles);
            
            const expectedStyles = { ...DEFAULT_GUI_STYLES, ...customStyles };
            expect(mockElement.textContent).toBe(Object.values(expectedStyles).join('\n'));
        });
        
        test('removes existing styles before applying new ones', () => {
            const existingStyle = { remove: jest.fn() };
            mockDocument.getElementById.mockReturnValue(existingStyle);
            
            adapter.applyStyles();
            
            expect(existingStyle.remove).toHaveBeenCalled();
        });
        
        test('does nothing when document is undefined', () => {
            delete global.document;
            adapter.applyStyles();
            expect(mockDocument.createElement).not.toHaveBeenCalled();
        });
    });
    
    describe('removeStyles', () => {
        test('removes style element', () => {
            const styleElement = { remove: jest.fn() };
            mockDocument.getElementById.mockReturnValue(styleElement);
            
            adapter.removeStyles();
            
            expect(mockDocument.getElementById).toHaveBeenCalledWith('hydra-mini-gui-styles');
            expect(styleElement.remove).toHaveBeenCalled();
            expect(adapter.styleElement).toBeNull();
        });
        
        test('does nothing when no style element exists', () => {
            mockDocument.getElementById.mockReturnValue(null);
            
            adapter.removeStyles();
            
            expect(mockElement.remove).not.toHaveBeenCalled();
        });
        
        test('does nothing when document is undefined', () => {
            delete global.document;
            adapter.removeStyles();
            expect(mockDocument.getElementById).not.toHaveBeenCalled();
        });
    });
    
    describe('cleanup', () => {
        test('removes container and styles', () => {
            adapter.container = mockElement;
            adapter.styleElement = mockElement;
            
            adapter.cleanup();
            
            expect(mockElement.remove).toHaveBeenCalledTimes(2);
            expect(adapter.container).toBeNull();
            expect(adapter.styleElement).toBeNull();
        });
        
        test('does nothing when no elements exist', () => {
            adapter.cleanup();
            expect(mockElement.remove).not.toHaveBeenCalled();
        });
    });
}); 