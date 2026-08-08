import * as dotenv from "dotenv";
import * as path from "path";

[
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env"),
  path.resolve(__dirname, "../../../.env"),
].forEach((envFile) => {
  dotenv.config({path: envFile});
});

if (process.env.NODE_ENV !== "production") {
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
}

const required = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  firebase: {
    projectId: required("FIREBASE_PROJECT_ID", "premier-league-af352"),

    authEmulatorHost: required("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099"),

    allowDevAuthEndpoint:
      (process.env.NODE_ENV ?? "development") !== "production" &&
      Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST),
  },
  db: {
    // If DATABASE_URL is set, it wins (this is what a Supabase/Neon pooled
    // connection string, or a Cloud SQL Auth Proxy tunnel during local
    // migrations, would look like).
    connectionString: process.env.DATABASE_URL,
    host: required("DB_HOST", "localhost"),
    port: Number(required("DB_PORT", "5432")),
    name: required("DB_NAME", "fantasy"),
    user: required("DB_USER", "fantasy_user"),
    password: required("DB_PASSWORD"),
    cloudSql: {
      // Unset locally and in CI — only present once deployed with the four
      // secrets from docs/cloud-sql.md. This is the switch pool.ts checks
      // to decide whether to use the Cloud SQL connector at all.
      instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME,
    },
  },
};
