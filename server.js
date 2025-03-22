// Simple Bun server for development
import { getCode, makeHydraUrl } from './hydraCodeString.js';
import { runBuild } from './build.js';

const codeWithLoad = getCode(process.env.TEST_MODE);

const hydraUrl = makeHydraUrl(codeWithLoad);

await runBuild();

const server = Bun.serve({
    port: 3000,
    fetch(req) {
        const url = new URL(req.url);
        
        // Serve demo.html at the root
        if (url.pathname === '/' || url.pathname === '/index.html') {
            return new Response(Bun.file('./dist/index.html'), {
                headers: {
                    'Content-Type': 'text/html',
                    'Cache-Control': 'no-cache'
                }
            });
        }
        
        // Serve the bundled JS file
        if (url.pathname === '/hydra-pitschpatsch.js') {
            return new Response(Bun.file('./dist/hydra-pitschpatsch.js'), {
                headers: {
                    'Content-Type': 'application/javascript',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache'
                }
            });
        }
        if (url.pathname === '/hydra-pitschpatsch.js.map') {
            return new Response(Bun.file('./dist/hydra-pitschpatsch.js.map'), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache'
                }
            });
        }
        if (url.pathname === '/hydraCodeString.js') {
            return new Response(Bun.file('./dist/hydraCodeString.js'), {
                headers: {
                    'Content-Type': 'application/javascript',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache'
                }
            });
        }

        // 404 for everything else
        return new Response('Not Found', { status: 404 });
    },
});

console.log(`

Copy this URL to test in Hydra:
${hydraUrl}

Demo page: http://localhost:${server.port}
`);

// If in test mode, automatically open the Hydra URL
if (process.env.TEST_MODE === 'allFunc' || process.env.TEST_MODE === 'special') {
    // Use the system's default command to open URLs based on the platform
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    Bun.spawn([cmd, hydraUrl]);
} 