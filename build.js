import { build } from "bun";
import { copyFile } from "node:fs/promises";
import { join } from "node:path";

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
            minify: true
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
        console.log("Files in dist:");
        console.log("- hydra-pitschpatsch.js");
        console.log("- hydra-pitschpatsch.js.map");
        console.log("- demo.html");
    } catch (error) {
        console.error("Build failed:", error);
        process.exit(1);
    }
}

runBuild(); 