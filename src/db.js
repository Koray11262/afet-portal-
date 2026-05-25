const mysql = require("mysql2/promise");

function required(name, value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new Error(`Eksik ortam değişkeni: ${name}`);
  }
  return value;
}

let pool = null;

function getPool() {
  if (pool) return pool;
  // Sunucu, .env olmadan da açılabilsin diye havuzu "lazy" kuruyoruz.
  pool = mysql.createPool({
    host: required("DB_HOST", process.env.DB_HOST),
    port: Number(process.env.DB_PORT || 3306),
    user: required("DB_USER", process.env.DB_USER),
    password: process.env.DB_PASSWORD || "",
    database: required("DB_NAME", process.env.DB_NAME),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
  });
  return pool;
}

async function ping() {
  const conn = await getPool().getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}

module.exports = { getPool, ping };

