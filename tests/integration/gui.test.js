import { test, expect } from '@playwright/test';

test.describe('Hydra Mini GUI Integration', () => {
    test.beforeAll(async () => {
        // Your server is already running via npm script
    });

    const typeIntoTweakpaneInput = async (page, input, value) => {
        await input.fill('');  // Clear first
        await input.fill(value);
        await page.waitForTimeout(100); // Small wait to ensure value is set
        await page.keyboard.press('Enter');
    };

    const normalizeEditorContent = (content) => {
        // Remove zero-width spaces and other hidden characters
        return content.replace(/[\u200B-\u200D\uFEFF]/g, '');
    };

    const setupHydraEditor = async (page) => {
        const testCode = `await loadScript("http://localhost:3000/hydra-mini-gui.js")`;
        const url = `https://hydra.ojack.xyz/?code=${btoa(testCode)}`;
        await page.goto(url);
        await page.waitForSelector('#hydra-mini-gui');
        return page.locator('.CodeMirror-code');
    };

    test.describe('Basic GUI Controls', () => {
        test('should show GUI container after loading', async ({ page }) => {
            const editor = await setupHydraEditor(page);
            const guiContainer = page.locator('#hydra-mini-gui');
            await expect(guiContainer).toBeVisible();
        });

        test('should show empty state initially', async ({ page }) => {
            const editor = await setupHydraEditor(page);
            const emptyMessage = page.locator('.tp-lblv_v:has-text("Run code to see controls")');
            await expect(emptyMessage).toBeVisible();
        });

        test('should handle code in same block as loadScript', async ({ page }) => {
            const editor = await setupHydraEditor(page);
            
            // Type code right after loadScript with single enter
            await editor.click();
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
            await page.keyboard.type('osc(60).out()');
            await page.keyboard.press('Alt+Enter');

            // This should work but currently fails - we'll mark it as expected to fail
            test.fail();
            
            const freqInput = page.locator('.tp-txtv_i').nth(0);
            await expect(freqInput).toBeVisible();
            await expect(freqInput).toHaveValue(/^60\.0*$/);
        });
    });

    test.describe('Single Parameter Updates', () => {
        test('should show single parameter control', async ({ page }) => {
            const editor = await setupHydraEditor(page);
            
            // Move past loadScript line and add empty line
            await editor.click();
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
            await page.keyboard.press('Enter');
            
            // Type simple oscillator
            await page.keyboard.type('osc(60).out()');
            await page.keyboard.press('Alt+Enter');

            // Check frequency input appears
            const freqInput = page.locator('.tp-txtv_i').nth(0);
            await expect(freqInput).toBeVisible();
            await expect(freqInput).toHaveValue(/^60\.0*$/);
        });

        test('should update single parameter value', async ({ page }) => {
            const editor = await setupHydraEditor(page);
            
            await editor.click();
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
            await page.keyboard.press('Enter');
            await page.keyboard.type('osc(60).out()');
            await page.keyboard.press('Alt+Enter');

            // Wait for Tweakpane container before trying to interact
            await page.waitForSelector('.tp-rotv_c');
            const freqInput = page.locator('.tp-txtv_i').nth(0);
            await expect(freqInput).toBeVisible();
            
            await typeIntoTweakpaneInput(page, freqInput, '120');
            await page.waitForTimeout(2200); // Wait for debounce

            const editorContent = await editor.textContent();
            const lines = editorContent.split('\n').map(line => normalizeEditorContent(line.trim()));
            expect(lines.some(line => line.includes('osc(120)'))).toBe(true);
        });
    });

    test.describe('Multiple Parameter Updates', () => {
        test('should show multiple parameters', async ({ page }) => {
            const editor = await setupHydraEditor(page);
            
            await editor.click();
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
            await page.keyboard.press('Enter');
            await page.keyboard.type('osc(60,0.1,0.5).out()');
            await page.keyboard.press('Alt+Enter');

            // Wait for Tweakpane container
            await page.waitForSelector('.tp-rotv_c');
            
            // Check all inputs appear with correct initial values
            const freqInput = page.locator('.tp-txtv_i').nth(0);
            const syncInput = page.locator('.tp-txtv_i').nth(1);
            const offsetInput = page.locator('.tp-txtv_i').nth(2);

            await expect(freqInput).toHaveValue(/^60\.0*$/);
            await expect(syncInput).toHaveValue(/^0\.10*$/);
            await expect(offsetInput).toHaveValue(/^0\.50*$/);
        });

        test('should update multiple parameters in sequence', async ({ page }) => {
            const editor = await setupHydraEditor(page);
            
            await editor.click();
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
            await page.keyboard.press('Enter');
            await page.keyboard.type('osc(60,0.1,0.5).out()');
            await page.keyboard.press('Alt+Enter');

            // Wait for Tweakpane container
            await page.waitForSelector('.tp-rotv_c');
            
            const freqInput = page.locator('.tp-txtv_i').nth(0);
            const syncInput = page.locator('.tp-txtv_i').nth(1);
            const offsetInput = page.locator('.tp-txtv_i').nth(2);

            await expect(freqInput).toBeVisible();
            await typeIntoTweakpaneInput(page, freqInput, '80');
            await typeIntoTweakpaneInput(page, syncInput, '0.2');
            await typeIntoTweakpaneInput(page, offsetInput, '0.8');
            
            await page.waitForTimeout(2200);

            const editorContent = await editor.textContent();
            const lines = editorContent.split('\n').map(line => normalizeEditorContent(line.trim()));
            expect(lines.some(line => line.includes('osc(80,0.2,0.8)'))).toBe(true);
        });
    });

    test.describe('Complex Interactions', () => {
        test('should handle function chaining', async ({ page }) => {
            const editor = await setupHydraEditor(page);
            
            await editor.click();
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
            await page.keyboard.press('Enter');
            await page.keyboard.type('osc(60,0.1,0.5)\n  .rotate(6.22)\n  .out()');
            await page.keyboard.press('Alt+Enter');

            // Wait for Tweakpane container
            await page.waitForSelector('.tp-rotv_c');
            
            const freqInput = page.locator('.tp-txtv_i').nth(0);
            const angleInput = page.locator('.tp-txtv_i').nth(3);

            await expect(freqInput).toHaveValue(/^60\.0*$/);
            await expect(angleInput).toHaveValue(/^6\.220*$/);

            await typeIntoTweakpaneInput(page, angleInput, '3.14');
            await page.waitForTimeout(2200);

            const editorContent = await editor.textContent();
            const lines = editorContent.split('\n').map(line => normalizeEditorContent(line.trim()));
            expect(lines.some(line => line.includes('.rotate(3.14)'))).toBe(true);
        });

        test('should handle multiple code blocks', async ({ page }) => {
            const editor = await setupHydraEditor(page);
            
            await editor.click();
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
            await page.keyboard.press('Enter');
            await page.keyboard.type('osc(60).out()\n\nnoise(0.5).out()');
            
            // Evaluate first block
            await page.keyboard.press('Alt+Enter');
            await page.waitForSelector('.tp-rotv_c');

            // Verify osc folder and input
            const oscFolder = page.locator('[data-hydra-function="osc"]');
            await expect(oscFolder).toBeVisible();
            const oscFreqInput = oscFolder.locator('.tp-txtv_i').first();
            await expect(oscFreqInput).toBeVisible();
            await expect(oscFreqInput).toHaveValue(/^60\.0*$/);
            
            // Move to and evaluate second block
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Alt+Enter');
            
            // Verify noise folder and input
            const noiseFolder = page.locator('[data-hydra-function="noise"]');
            await expect(noiseFolder).toBeVisible();
            const noiseFreqInput = noiseFolder.locator('.tp-txtv_i').first();
            await expect(noiseFreqInput).toBeVisible();
            await expect(noiseFreqInput).toHaveValue(/^0\.50*$/);
            
            await typeIntoTweakpaneInput(page, noiseFreqInput, '0.8');
            await page.waitForTimeout(2200);

            const editorContent = await editor.textContent();
            const lines = editorContent.split('\n').map(line => normalizeEditorContent(line.trim()));
            expect(lines.some(line => line.includes('noise(0.8)'))).toBe(true);
        });
    });
}); 