import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: 0,
  max: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 2000,
  // Neon presents a public certificate. Checking it is what stops a
  // network observer between this process and the database from reading
  // the session, including the connection string's password.
  ssl: {
    rejectUnauthorized: true,
  },
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

export const db = drizzle(pool, { schema });

export const getPool = () => pool;

export * from "./schema.js";
