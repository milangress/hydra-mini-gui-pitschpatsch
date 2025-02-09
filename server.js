// Simple Bun server for development
const code = `await loadScript("http://localhost:3000/hydra-mini-gui.js")

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