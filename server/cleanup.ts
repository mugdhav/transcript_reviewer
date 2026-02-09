import fs from "fs";
import path from "path";
import { storage } from "./storage";

// Delete a specific job's file
// Delete a specific job's file
export async function cleanupJob(jobId: string) {
    try {
        const job = await storage.getJob(jobId);
        // localFilePath is added dynamically in storage.ts but not in schema
        const filePath = (job as any)?.localFilePath;

        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[Cleanup] Deleted file for job ${jobId}`);
            // Optionally update job status to indicate file is gone, but keeping metadata is fine
        }
    } catch (error) {
        console.error(`[Cleanup] Failed to cleanup job ${jobId}:`, error);
    }
}

// Run every hour to clean up files older than 1 hour
export function startCleanupSchedule() {
    const UPLOAD_DIR = "/tmp/uploads";
    const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

    if (!fs.existsSync(UPLOAD_DIR)) return;

    setInterval(() => {
        console.log("[Cleanup] Running scheduled cleanup...");
        try {
            const files = fs.readdirSync(UPLOAD_DIR);
            const now = Date.now();

            for (const file of files) {
                const filePath = path.join(UPLOAD_DIR, file);
                const stats = fs.statSync(filePath);

                if (now - stats.mtimeMs > MAX_AGE_MS) {
                    fs.unlinkSync(filePath);
                    console.log(`[Cleanup] Removed old file: ${file}`);
                }
            }
        } catch (error) {
            console.error("[Cleanup] Scheduled cleanup failed:", error);
        }
    }, MAX_AGE_MS);

    console.log("[Cleanup] Schedule started (runs every hour)");
}
