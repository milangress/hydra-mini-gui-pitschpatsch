import { build } from "bun";
import { copyFile } from "node:fs/promises";
import { join } from "node:path";
import pkg from "./package.json";

const banner = `/*!
 * ${pkg.name} v${pkg.version}
 * ${pkg.description}
 * 
 * @author ${pkg.author}
 * @license ${pkg.license}
 * @repository ${pkg.repository.url}
 */
`;

const coolifyUrl = Bun.env.COOLIFY_URL || 'http://localhost:3000';
const footer = `//# sourceMappingURL=http://${coolifyUrl}/hydra-pitschpatsch.js.map`;

const depoyBuild = {
    drop: ["console", "debugger", "Logger"],
    minify: true,
}

export async function runBuild() {
    try {

        const htmlBuild = await Bun.build({
            entrypoints: ["./index.html"],
            outdir: "./dist",
            naming: "index.html",
            env: 'inline',
            minify: false,
            target: 'browser'
        });
        // Build the JS bundle
        const result = await build({
            entrypoints: ["hydra-pitschpatsch.js"],
            outdir: "./dist",
            sourcemap: "linked",
            
            target: 'browser',
            define: {
                // Add package info to the bundle
                __PKG_VERSION__: JSON.stringify(pkg.version),
                __PKG_NAME__: JSON.stringify(pkg.name)
            },
            banner,
            footer,
        });

        if (!result.success) {
            console.error("Build failed:", result.logs);
            process.exit(1);
        }
        for (const output of result.outputs) {
            console.log(output.path);
        }
        for (const output of htmlBuild.outputs) {
            console.log(output.path);
        }

        console.log("Build completed successfully!");
    } catch (error) {
        console.error("Build failed:", error);
        process.exit(1);
    }
}

runBuild(); 