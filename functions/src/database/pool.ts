import { Pool } from "pg";
import { env } from "../config/env";

/**
 * Single shared pg Pool for the whole function instance.
 *
 * Important for the Cloud Functions deployment target (per the exploratory
 * Firebase plan): each function *instance* gets its own pool, and instances
 * scale out under load — so in production this MUST go through Cloud SQL's
 * managed pooling (or a Supabase/Neon pooled connection string), not a raw
 * direct connection, or a deadline-moment traffic spike will exhaust
 * Postgres's connection limit. Locally against Docker Postgres this pool
 * talks directly to the DB, which is fine for dev.
 */
export const pool = env.db.connectionString
  ? new Pool({ connectionString: env.db.connectionString })
  : new Pool({
      host: env.db.host,
      port: env.db.port,
      database: env.db.name,
      user: env.db.user,
      password: env.db.password,
    });

pool.on("error", (err) => {
  // A background/idle client failed — don't let this crash the whole
  // function instance silently.
  console.error("Unexpected error on idle Postgres client", err);
});
