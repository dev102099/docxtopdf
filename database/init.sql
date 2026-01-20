CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    zip_path TEXT,
    output_path TEXT
);

CREATE TABLE IF NOT EXISTS files (
    id SERIAL PRIMARY KEY,
    job_id UUID REFERENCES jobs(id),
    file_name TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', 
    output_path TEXT
);