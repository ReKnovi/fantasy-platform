import * as dotenv from "dotenv";
import * as path from "path";

[
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env"),
  path.resolve(__dirname, "../../../.env"),
].forEach((envFile) => {
  dotenv.config({path: envFile});
});

const required = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

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
