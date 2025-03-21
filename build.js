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

async function runBuild() {
    try {
        // Build the JS bundle
        const result = await build({
            entrypoints: ["./src/index.js"],
            outdir: "./dist",
            naming: {
                entry: "hydra-pitschpatsch.js"
            },
            sourcemap: "linked",
            minify: true,
            define: {
                // Add package info to the bundle
                __PKG_VERSION__: JSON.stringify(pkg.version),
                __PKG_NAME__: JSON.stringify(pkg.name)
            },
            banner
        });

        if (!result.success) {
            console.error("Build failed:", result.logs);
            process.exit(1);
        }

        // Copy the demo HTML file to dist
        await copyFile(
            join(process.cwd(), "src", "demo.html"),
            join(process.cwd(), "dist", "demo.html")
        );

        console.log("Build completed successfully!");
    } catch (error) {
        console.error("Build failed:", error);
        process.exit(1);
    }
}

runBuild(); 