const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const app = express();

const fileUpload = require("./controller/fileController");
const pool = require("./config/db");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const jobId = uuidv4();
    req.jobId = jobId;

    const BASE_PATH = fs.existsSync("/storage")
      ? "/storage"
      : path.join(__dirname, "../uploads");
    const uploadPath = path.join(BASE_PATH, jobId, "input");

    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, "upload.zip");
  },
});

const upload = multer({ storage: storage });

pool.connect((err, client, release) => {
  if (err) {
    return console.error("[DB] Error acquiring client", err.stack);
  }
  console.log("[DB] Connected successfully!");
  release();
});

app.post("/api/v1/jobs", upload.single("file"), fileUpload);

app.listen(3000, () => {
  console.log("Listening on port 3000-Reloaded");
});
