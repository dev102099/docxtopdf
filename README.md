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
    Ensure all 5 services (`api`, `worker`, `db`, `redis
