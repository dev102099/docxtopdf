const AdmZip = require("adm-zip");
const pool = require("../config/db");
const jobQueue = require("../config/redis");
const path = require("path");
const fs = require("fs");

const fileUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Please upload a file" });
  }

  const jobId = req.jobId;
  const filePath = req.file.path;

  const text = `insert into jobs(id,status,zip_path) values ($1,$2,$3) returning *;`;
  const values = [jobId, "PENDING", filePath];
  let fileCount = 0;
  try {
    const zip = new AdmZip(req.file.path);
    const zipEntries = zip.getEntries();

    zipEntries.forEach((entry) => {
      if (entry.isDirectory) return;

      if (entry.entryName.startsWith("__MACOSX/")) return;

      const fileName = entry.entryName.split("/").pop();
      if (fileName.startsWith("._")) return;

      if (!entry.entryName.endsWith(".docx")) return;

      fileCount++;
    });

    const dbResult = await pool.query(text, values);
    await jobQueue.add({
      jobId: jobId,
      type: "PROCESS_ZIP",
      filePath: filePath,
    });
    console.log(dbResult.rows[0]);
  } catch (error) {
    console.log(error.stack);
  }
  res.status(202).json({
    job_id: jobId,
    file_count: fileCount,
    message: "Accepted",
  });
};

const jobStatus = async (req, res) => {
  const jobId = req.params.jobId;
  console.log("job: ", jobId);

  try {
    // A. Fetch Job Details
    const jobResult = await pool.query(
      "SELECT id, status, created_at FROM jobs WHERE id = $1",
      [jobId],
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    const job = jobResult.rows[0];

    // B. Fetch Files for this Job
    // We select file_path so we can extract the filename later
    const filesResult = await pool.query(
      "SELECT file_name, status FROM files WHERE job_id = $1",
      [jobId],
    );

    // C. Construct the "files" array for the response
    const filesList = filesResult.rows.map((file) => {
      // Extract "report.docx" from "/storage/.../report.docx"
      const filename = file.file_name;

      return {
        filename: filename,
        status: file.status,
        // Optional: If you add an 'error_message' column to your DB later, map it here
        error_message:
          file.status === "FAILED" ? "Conversion failed" : undefined,
      };
    });

    // D. Build the Final Response
    const response = {
      job_id: job.id,
      status: job.status,
      created_at: job.created_at,
      files: filesList,
    };

    // Only add download link if completed
    if (job.status === "COMPLETED") {
      // Dynamically build URL based on current server host
      const protocol = req.protocol;
      const host = req.get("host"); // e.g., localhost:3000
      response.download_url = `${protocol}://${host}/api/v1/jobs/${jobId}/download`;
    }

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const fileDown = async (req, res) => {
  const jobId = req.params.jobId;

  try {
    // A. Find the path to the zip file
    const result = await pool.query(
      "SELECT output_path, status FROM jobs WHERE id = $1",
      [jobId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    const job = result.rows[0];

    if (job.status !== "COMPLETED" || !job.output_path) {
      return res.status(400).json({ error: "Job is not ready for download" });
    }

    // B. Verify file exists on disk
    if (!fs.existsSync(job.output_path)) {
      console.error(`File missing at: ${job.output_path}`);
      return res.status(500).json({ error: "File missing from storage" });
    }

    // C. Stream the file to the user
    // Express handles headers (Content-Type: application/zip) automatically with .download()
    res.download(job.output_path, "converted_files.zip");
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
module.exports = { fileUpload, jobStatus, fileDown };
