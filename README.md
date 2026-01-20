# 📄 DocxToPDF Microservice Converter

![Docker](https://img.shields.io/badge/Docker-Enabled-blue?logo=docker) ![Node.js](https://img.shields.io/badge/Node.js-18-green?logo=node.js) ![Status](https://img.shields.io/badge/Status-Active-success)

A scalable, containerized microservice application that converts `.docx` documents into `.pdf` format asynchronously. It uses a robust queue-based architecture to handle high-volume file processing reliably.

---

## 🏗 System Architecture

The application is built using a decoupled microservices pattern to ensure scalability and fault tolerance.

### Service Breakdown

| Service         | Technology        | Description                                                          |
| :-------------- | :---------------- | :------------------------------------------------------------------- |
| **API Gateway** | Node.js / Express | Handles file uploads and serves status/download endpoints.           |
| **Worker**      | Node.js / Bull    | Background process that unzips files and manages conversion tasks.   |
| **PDF Engine**  | Gotenberg         | A stateless, Docker-based API for high-fidelity document conversion. |
| **Queue**       | Redis             | Manages job queues (Bull) to orchestrate async processing.           |
| **Database**    | PostgreSQL        | Stores job status, file metadata, and processing history.            |

---

## 🚀 Getting Started

### Prerequisites

- **Docker Desktop** installed and running on your machine.
- No local Node.js or PostgreSQL installation required!

### Installation & Run

1.  **Clone the Repository**

    ```bash
    git clone [https://github.com/yourusername/docxtopdf.git](https://github.com/yourusername/docxtopdf.git)
    cd docxtopdf
    ```

2.  **Start Services**
    Build and launch the entire stack in detached mode:

    ```bash
    docker compose up --build -d
    ```

3.  **Verify Running Containers**
    Ensure all 5 services (`api`, `worker`, `db`, `redis`, `gotenberg`) are up:
    ```bash
    docker compose ps
    ```

---

## 📡 API Reference

Base URL: `http://localhost:3000/api/v1`

### 1. Upload Job

Submit a ZIP file containing one or more `.docx` files.

- **Endpoint:** `POST /upload`
- **Body:** `multipart/form-data`
  - `file`: (Binary) The .zip file.
- **Example Response:**
  ```json
  {
    "jobId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "message": "Job queued successfully"
  }
  ```

### 2. Check Status

Poll this endpoint to track conversion progress.

- **Endpoint:** `GET /jobs/:jobId`
- **Example Response:**
  ```json
  {
    "job_id": "a1b2c3d4-...",
    "status": "COMPLETED",
    "created_at": "2023-10-27T10:00:00Z",
    "files": [
      { "filename": "resume.docx", "status": "COMPLETED" },
      { "filename": "cover_letter.docx", "status": "COMPLETED" }
    ],
    "download_url": "http://localhost:3000/api/v1/jobs/a1b2c3d4.../download"
  }
  ```

### 3. Download Results

Retrieve the final processed ZIP file.

- **Endpoint:** `GET /jobs/:jobId/download`
- **Response:** Binary Stream (`application/zip`)

---

## 📂 Project Structure

```text
├── api/                  # Express Application
│   ├── routes/           # API Endpoints
│   └── Dockerfile        # API Container Config
├── workers/              # Background Worker
│   ├── index.js          # Queue Consumers (Unzip & Convert)
│   └── Dockerfile        # Worker Container Config
├── database/             # Database Scripts
│   └── init.sql          # SQL Schema & Table Creation
├── docker-compose.yml    # Service Orchestration
└── README.md             # Project Documentation
```
