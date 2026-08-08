import {Pool, PoolClient} from "pg";
import {
  AuthTypes,
  Connector,
  IpAddressTypes,
} from "@google-cloud/cloud-sql-connector";
import {env} from "../config/env";

let connector: Connector | undefined;
let poolPromise: Promise<Pool> | undefined;

/**
 * Builds the pool for this function instance. Three connection modes,
 * tried in this order — only one is ever active, decided entirely by which
 * env vars are set:
 *
 * 1. Cloud SQL, via the official `@google-cloud/cloud-sql-connector`.
 *    Active once INSTANCE_CONNECTION_NAME is set (production only, after
 *    the Cloud SQL instance exists — see docs/cloud-sql.md). Connects
 *    through the connector's own authenticated, encrypted tunnel rather
 *    than a raw connection — Google's recommended pattern, and it does not
 *    require a Serverless VPC Access connector or a publicly-open database.
 * 2. DATABASE_URL, if set — a plain connection string. Used for Supabase/
 *    Neon/any hosted Postgres, or a local Cloud SQL Auth Proxy tunnel when
 *    running migrations by hand.
 * 3. Discrete DB_HOST/DB_PORT/etc — local Docker Postgres. The default for
 *    day-to-day development; this is what runs today.
 *
 * Async because step 1 requires a network call (fetching short-lived certs)
 * before a Pool can even be constructed — there's no synchronous version of
 * that. Cloud Functions can spin up many instances in parallel under load,
 * each running this once and caching the result — keep `max` modest per
 * instance so a burst of instances doesn't collectively exhaust Postgres's
 * connection limit (see the load-balancing checklist in the schema doc).
 */
async function createPool(): Promise<Pool> {
  if (env.db.cloudSql.instanceConnectionName) {
    connector = new Connector();
    const clientOpts = await connector.getOptions({
      instanceConnectionName: env.db.cloudSql.instanceConnectionName,
      ipType: IpAddressTypes.PUBLIC,
      authType: AuthTypes.PASSWORD,
    });
    return new Pool({
      ...clientOpts,
      user: env.db.user,
      password: env.db.password,
      database: env.db.name,
      max: 5,
    });
  }

  if (env.db.connectionString) {
    return new Pool({connectionString: env.db.connectionString});
  }

  return new Pool({
    host: env.db.host,
    port: env.db.port,
    database: env.db.name,
    user: env.db.user,
    password: env.db.password,
  });
}

/**
 * Returns the shared pool, creating it on first call and reusing it after
 * (so a warm function instance doesn't rebuild the Cloud SQL connector on
 * every request). Async, so every caller does
 * `const pool = await getPool();` rather than importing a ready-made
 * constant.
 * @return {Promise<Pool>} Shared Postgres connection pool.
 */
export function getPool(): Promise<Pool> {
  if (!poolPromise) {
    poolPromise = createPool().then((pool) => {
      pool.on("error", (err) => {
        // A background/idle client failed — don't let this crash the
        // whole function instance silently.
        console.error("Unexpected error on idle Postgres client", err);
      });
      return pool;
    });
  }
  return poolPromise;
}

/**
 * Runs `fn` inside a BEGIN/COMMIT block on a single dedicated client,
 * rolling back on any thrown error. Use this whenever a single logical
 * admin action needs to write to more than one table/row atomically (e.g.
 * publishing a match also stamps every one of its player_match_stats
 * rows, or a bulk scorecard upsert should land as all-or-nothing) — plain
 * sequential pool.query() calls each borrow their own connection and
 * can't be rolled back together.
 * @param {(client: PoolClient) => Promise<T>} fn Work to run transactionally.
 * @return {Promise<T>} Whatever `fn` returns.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Closes the pool (and the Cloud SQL connector, if one was created). Call
 * this from server.ts on SIGTERM/SIGINT for a clean shutdown.
 */
export async function closePool(): Promise<void> {
  if (poolPromise) {
    const pool = await poolPromise;
    await pool.end();
    poolPromise = undefined;
  }
  if (connector) {
    connector.close();
    connector = undefined;
  }
}
