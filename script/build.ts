import { build } from "esbuild";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

async function runBuild() {
    console.log("Cleaning dist directory...");
    if (fs.existsSync(path.join(root, "dist"))) {
        fs.rmSync(path.join(root, "dist"), { recursive: true });
    }

    console.log("Building frontend with Vite...");
    execSync("npx vite build", {
        stdio: "inherit",
        cwd: root,
    });

    console.log("Building backend with esbuild...");
    // Build the server code into a single CJS file
    try {
        await build({
            entryPoints: [path.join(root, "server/index.ts")],
            bundle: true,
            platform: "node",
            target: "node20",
            format: "cjs",
            outfile: path.join(root, "dist/index.cjs"),
            // Handle the @shared alias from tsconfig
            alias: {
                "@shared": path.resolve(root, "shared"),
            },
            // Keep heavy/native dependencies external since they'll be in node_modules
            external: [
                "express",
                "@google/genai",
                "multer",
                "fluent-ffmpeg",
                "pg",
                "drizzle-orm",
                "ws",
                "passport",
                "express-session",
                "memorystore",
                "crypto",
                "vite",
                "nanoid",
                "./vite",
                "../vite.config"
            ],
            sourcemap: true,
            logLevel: "info",
        });
        console.log("Build successful!");
    } catch (error: any) {
        console.error("Backend build failed:");
        if (error.errors) {
            error.errors.forEach((err: any) => {
                console.error(`Error: ${err.text}`);
                if (err.location) {
                    console.error(`  at ${err.location.file}:${err.location.line}:${err.location.column}`);
                }
            });
        } else {
            console.error(error);
        }
        process.exit(1);
    }
}

runBuild().catch((err) => {
    console.error("Build failed:", err);
    process.exit(1);
});
