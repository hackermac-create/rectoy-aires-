const { Pool } = require("pg");

const databaseUrl = process.env.DATABASE_URL;

const poolConfig = databaseUrl
    ? {
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === "production"
            ? { rejectUnauthorized: false }
            : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
    }
    : {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 5433),
        database: process.env.DB_NAME || "rectoy_aires",
        user: process.env.DB_USER || "rectoy_admin",
        password: process.env.DB_PASSWORD,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
    };

const pool = new Pool(poolConfig);

pool.on("error", (error) => {
    console.error("Erreur PostgreSQL :", error.message);
});

async function query(text, params) {
    return pool.query(text, params);
}

async function testConnection() {
    const result = await pool.query(
        "SELECT current_database() AS database, current_user AS user"
    );

    return result.rows[0];
}

module.exports = {
    pool,
    query,
    testConnection
};
