// Simple Bun server for development
import { code as allFuncCode } from './hydraTestPageAllFunc.js';

const defaultCode = `await loadScript("http://localhost:3000/hydra-pitschpatsch.js")

osc(82,0.09,0.89999)
  .rotate(0.5)
  .out()

osc(400,1.02).scroll(0).out()

src(o0)
  .modulate(
    osc(6,0,1.5).modulate(noise(3).sub(gradient()),1)
    .brightness(-0.5)
  ,0.003)
  .layer(
  osc(30,0.1,1.5).mask(shape(4,0.3,0))
  ).out(o0)

var epsilon=0.003
var func = () => noise(9.9,0.35)
solid(3.45,0,255).layer(func().luma(-epsilon,0)).out(o0)
`;

// osc(5, 1.65, -0.021)
//     .kaleid([2,3.3,5,7,8,9,10].fast(0.1))
//     .color(0.5, 0.81)
//     .colorama(0.4)
//     .rotate(0.009,()=>Math.sin(time)* -0.001 )
//     .modulateRotate(o0,()=>Math.sin(time) * 0.003)
//     .modulate(o0, 0.9)
//     .scale(0.9)
//     .out(o0)

const code = process.env.TEST_MODE === 'allFunc' ? allFuncCode : defaultCode;

// Helper function to properly encode the code for URL - matching Hydra's implementation
function encodeForHydraURL(code) {
  return btoa(encodeURIComponent(code));
}

const encodedCode = encodeForHydraURL(code);
const hydraUrl = `https://hydra.ojack.xyz/?code=${encodedCode}`;

// Build the bundle
const build = await Bun.build({
    entrypoints: ['./src/index.js'],
    outdir: './dist',
});

if (!build.success) {
    console.error('Build failed:', build.logs);
    process.exit(1);
}

const server = Bun.serve({
    port: 3000,
    fetch(req) {
        const url = new URL(req.url);
        
        // Serve demo.html at the root
        if (url.pathname === '/' || url.pathname === '/index.html') {
            return new Response(Bun.file('./dist/demo.html'), {
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
if (process.env.TEST_MODE === 'allFunc') {
    // Use the system's default command to open URLs based on the platform
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    Bun.spawn([cmd, hydraUrl]);
} 