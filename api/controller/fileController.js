const AdmZip = require("adm-zip");
const pool = require("../config/db");
const jobQueue = require("../config/redis");

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

module.exports = fileUpload;
