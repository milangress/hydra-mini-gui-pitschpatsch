import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/integration',
    webServer: {
        command: 'bun run server.js',
        port: 3000,
        reuseExistingServer: true,
    },
    use: {
        baseURL: 'https://hydra.ojack.xyz',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' },
        }
    ]
}); 