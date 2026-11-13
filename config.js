import { Pool } from "pg";
process.loadEnvFile();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PSWD
});

export const q = (str, params = []) => {
    return pool.query(str, params);
}