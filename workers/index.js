const Queue = require("bull");
const { Pool } = require("pg");
const AdmZip = require("adm-zip");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");

const redisConfig = {
  host: process.env.REDIS_HOST || "redis",
  port: 6379,
  maxRetriesPerRequest: null,
};

const pool = new Pool({
  user: process.env.DB_USER || "user",
  host: process.env.DB_HOST || "db",
  database: process.env.DB_NAME || "doc_db",
  password: process.env.DB_PASS || "password",
  port: 5432,
});

const jobQueue = new Queue("jobQueue", { redis: redisConfig });
const fileQueue = new Queue("fileQueue", { redis: redisConfig });

jobQueue.process(async (job) => {
  const { jobId, filePath } = job.data;
  try {
    console.log(`[Job ${jobId}] 🔍 Worker received path: "${filePath}"`);

    console.log(
      `[Job ${jobId}] 📂 Current directory (CWD): "${process.cwd()}"`,
    );
    const inputDir = path.dirname(filePath);
    const jobRootDir = path.join(inputDir, "..");

    const filesDir = path.join(jobRootDir, "files");
    const outputDir = path.join(jobRootDir, "output");

    if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true });
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const zip = new AdmZip(filePath);
    zip.extractAllTo(filesDir, true);

    const zipEntries = zip.getEntries();
    let processedCount = 0;

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      if (entry.entryName.startsWith("__MACOSX/")) continue;
      if (entry.entryName.split("/").pop().startsWith("._")) continue;
      if (!entry.entryName.endsWith(".docx")) continue;

      const extractedFilePath = path.join(filesDir, entry.entryName);

      const insertQuery = `
                INSERT INTO files (job_id, status,file_name) 
                VALUES ($1, $2,$3) 
                RETURNING id;
            `;
      const dbRes = await pool.query(insertQuery, [
        jobId,
        "PENDING",
        entry.entryName,
      ]);
      const fileId = dbRes.rows[0].id;

      await fileQueue.add({
        fileId: fileId,
        jobId: jobId,
        inputPath: extractedFilePath,
        outputDir: outputDir,
        fileName: entry.entryName,
      });

      console.log(`   -> Extracted & Queued: ${entry.entryName}`);
      processedCount++;
    }
    await pool.query("UPDATE jobs SET status = $1 WHERE id = $2", [
      "UNZIPPED",
      jobId,
    ]);
    console.log(
      `[Job ${jobId}]  Unzip Complete. ${processedCount} files queued.`,
    );
  } catch (error) {
    console.error(`[Job ${jobId}]  Error:`, error);
    await pool.query("UPDATE jobs SET status = $1 WHERE id = $2", [
      "FAILED",
      jobId,
    ]);
    throw error;
  }
});

fileQueue.process(async (job) => {
  const { fileId, jobId, inputPath, outputDir, fileName } = job.data;
  console.log(`[File ${fileId}] sending to Gotenberg: ${fileName}`);

  try {
    const form = new FormData();
    form.append("files", fs.createReadStream(inputPath));

    const response = await axios.post(
      "http://gotenberg:3000/forms/libreoffice/convert",
      form,
      {
        headers: { ...form.getHeaders() },
        responseType: "stream",
      },
    );

    const pdfName = fileName.replace(".docx", ".pdf");
    const outputPath = path.join(outputDir, pdfName);

    const outputParentDir = path.dirname(outputPath);
    if (!fs.existsSync(outputParentDir)) {
      fs.mkdirSync(outputParentDir, { recursive: true });
    }

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    await pool.query(
      "UPDATE files SET status = $1, output_path = $2 WHERE id = $3",
      ["COMPLETED", outputPath, fileId],
    );
    console.log(`[File ${fileId}] Converted via API.`);

    const pendingRes = await pool.query(
      `SELECT COUNT(*) FROM files WHERE job_id = $1 AND status != 'COMPLETED'`,
      [jobId],
    );
    if (parseInt(pendingRes.rows[0].count) === 0) {
      await finalizeJob(jobId, outputDir);
    }
  } catch (err) {
    console.error(`[File ${fileId}]  API Error:`, err.message);
    await pool.query("UPDATE files SET status = $1 WHERE id = $2", [
      "FAILED",
      fileId,
    ]);
    throw err;
  }
});

// ==========================================
// HELPER: Final Zip & Job Completion
// ==========================================
async function finalizeJob(jobId, outputDir) {
  try {
    const jobRootDir = path.join(outputDir, "..");
    const finalZipPath = path.join(jobRootDir, "result.zip");

    const zip = new AdmZip();
    zip.addLocalFolder(outputDir);
    zip.writeZip(finalZipPath);

    await pool.query(
      `UPDATE jobs SET status = 'COMPLETED', output_path = $1 WHERE id = $2`,
      [finalZipPath, jobId],
    );

    console.log(`[Job ${jobId}]  JOB COMPLETE. Result: ${finalZipPath}`);
  } catch (err) {
    console.error(`[Job ${jobId}] Failed to finalize zip:`, err);
    await pool.query("UPDATE jobs SET status = $1 WHERE id = $2", [
      "FAILED_ZIPPING",
      jobId,
    ]);
  }
}
