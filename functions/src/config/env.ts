import * as dotenv from "dotenv";
import * as path from "path";

/**
 * Loads the project-root .env (one level above `functions/`) so local dev
 * (emulator, functions:shell, or plain ts-node) all see the same
 * DB_HOST/DB_PORT/etc. that the rest of the project already uses.
 *
 * In production, don't rely on this file at all — use
 * `firebase functions:secrets:set` / `firebase functions:config` instead,
 * since .env is git-ignored and never deployed.
 */
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  db: {
    // If DATABASE_URL is set, it wins (this is what a Cloud SQL / Supabase /
    // Neon pooled connection string would look like in production).
    connectionString: process.env.DATABASE_URL,
    host: required("DB_HOST", "localhost"),
    port: Number(required("DB_PORT", "5432")),
    name: required("DB_NAME", "fantasy"),
    user: required("DB_USER", "fantasy_user"),
    password: required("DB_PASSWORD"),
  },
};
