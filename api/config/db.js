const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER || "user",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "doc_db",
  password: process.env.DB_PASS || "password",
  port: 5432,
});

module.exports = pool;
