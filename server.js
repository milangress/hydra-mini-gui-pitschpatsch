// Simple Bun server for development
const code = `await loadScript("http://localhost:3000/hydra-mini-gui.js")

osc(40,0.1,0.8)
  .rotate(0.5)
  .out()`;

const encodedCode = btoa(code);
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
        // Serve the bundled file
        return new Response(Bun.file('./dist/hydra-mini-gui.js'), {
            headers: {
                'Content-Type': 'application/javascript',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            }
        });
    },
});

console.log(`
Server running at http://localhost:${server.port}

Copy this URL to test in Hydra:
${hydraUrl}

Code being loaded:
${code}
`); 