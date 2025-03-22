// Unified manager for finding and updating numeric values in code
import { Parser } from 'acorn';
import { ASTTraverser } from './ast/ast-traverser';
import { CodeFormatter } from './code-formatter';
import { Logger } from '../utils/logger';
import { removeLoadScriptLines } from '../utils/code-utils';
import { effect } from '@preact/signals-core';
import { 
    actions, 
    currentCode, 
    currentEvalRange,
    codeToEval,
    staticCode,
} from '../state/signals';
import { HydraInstance } from './ast/types';
import { ValueMatch } from './ast/types';

interface UndoGroup {
    lastUpdate: number;
}

/**
 * Manages the finding and updating of numeric values in Hydra code, handling both static values
 * and dynamic arrow function conversions.
 */
export class CodeValueManager {
    private hydra: HydraInstance;
    private isUpdating: boolean;
    private _updateTimeout: number | null;
    private _undoGroup: UndoGroup | null;
    private _astTraverser: ASTTraverser;
    private _codeFormatter: CodeFormatter;

    /**
     * Creates a new CodeValueManager instance
     * @param hydra - The Hydra instance to use for value management
     */
    constructor(hydra: HydraInstance) {
        this.hydra = hydra;
        this.isUpdating = false;
        this._updateTimeout = null;
        this._undoGroup = null;
        
        this._astTraverser = new ASTTraverser(hydra);
        this._codeFormatter = new CodeFormatter(hydra);

        // Watch for parameter changes and evaluate code
        effect(() => {
            const code = codeToEval.value;
            if (!code || !this.hydra?.eval) return;
            
            try {
                Logger.log('Evaluating code:', code);
                // Try arrow function version first
                this.hydra.eval(code);
                // Update editor with static code
                this._scheduleEditorUpdate();
            } catch (error) {
                Logger.log('Failed Arrow Function Code: ', codeToEval.value);
                Logger.error('Arrow function eval failed:', error);
                
                // Fall back to static version
                try {
                    if (staticCode.value) {
                        Logger.log('Falling back to static code:', staticCode.value);
                        this.hydra.eval(staticCode.value);
                    }
                } catch (fallbackError) {
                    Logger.log('Failed Static Code: ', staticCode.value);
                    Logger.error('Static eval failed:', fallbackError);
                }
            }
        });

        // Watch for code changes to find values
        effect(() => {
            const newCurrentCode = currentCode.value;
            if (!newCurrentCode) return;
            Logger.log('currentCode Signal updated triggering findValues');
            this.findValues(newCurrentCode);
        });
    }

    /**
     * Schedule an update to the editor with debouncing
     * @private
     */
    private _scheduleEditorUpdate(): void {
        if (!window.cm || !currentEvalRange.value) return;

        // Set flag before any updates
        this.isUpdating = true;

        if (this._updateTimeout !== null) {
            clearTimeout(this._updateTimeout);
        }
        
        this._updateTimeout = window.setTimeout(() => {
            try {
                const staticCodeValue = staticCode.value;
                if (staticCodeValue && currentEvalRange.value) {
                    if (!this._undoGroup) {
                        window.cm?.startOperation();
                        this._undoGroup = { lastUpdate: Date.now() };
                    }
                    window.cm?.replaceRange(staticCodeValue, currentEvalRange.value.start, currentEvalRange.value.end);
                    
                    // Re-evaluate on next frame to ensure UI is updated
                    if (this.hydra?.eval) {
                        requestAnimationFrame(() => {
                            if (staticCodeValue && this.hydra?.eval) {
                                this.hydra.eval(staticCodeValue);
                            }
                        });
                    }
                }
            } catch (error) {
                Logger.error('Error updating editor:', error);
            } finally {
                if (this._undoGroup) {
                    window.cm?.endOperation();
                    this._undoGroup = null;
                }
                this.isUpdating = false;
            }
        }, 2000);
    }

    /**
     * Find all numeric values and source/output references in the given code
     * @param code - The code to analyze
     * @returns Found values with their metadata
     */
    findValues(code: string | null): ValueMatch[] {
        if (!code) return [];

        try {
            // Remove loadScript lines before parsing
            const cleanCode = removeLoadScriptLines(code);
            if (!cleanCode) return [];

            const ast = Parser.parse(cleanCode, {
                locations: true,
                ecmaVersion: 'latest'
            });

            const foundValues = this._astTraverser.findValues(ast, cleanCode);
            Logger.log('Found values:', foundValues);
            
            // Update store directly with found values
            actions.currentParameters(foundValues);
            return foundValues;
        } catch (error) {
            Logger.error('Error finding values:', error);
            actions.currentParameters([]);
            return [];
        }
    }
} 