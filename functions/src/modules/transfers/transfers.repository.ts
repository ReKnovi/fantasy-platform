import {Pool, PoolClient} from "pg";
import {getPool, withTransaction} from "../../database/pool";
import {conflict} from "../../errors/errors";

type Queryable = Pool | PoolClient;

export interface TransferRow {
  id: number;
  user_id: string;
  gameweek_id: number | null;
  player_out_id: number | null;
  player_in_id: number | null;
  transfer_type: "free" | "paid" | "forced";
  points_cost: number;
  triggered_by_team_id: number | null;
  resolved_at: string;
  auto_resolved: boolean;
}

const BASE_SELECT = `
  SELECT id, user_id, gameweek_id, player_out_id, player_in_id,
         transfer_type, points_cost, triggered_by_team_id, resolved_at,
         auto_resolved
  FROM transfers
`;

/**
 * Counts how many free transfers a user has already used in a gameweek.
 * Free transfers are non-cumulative per gameweek (per the Discovery
 * Doc's F14: "1 free/matchday non-cumulative") — unused ones don't bank
 * into the next gameweek, unlike FPL — so this is always scoped to a
 * single gameweek_id rather than a running season total.
 *
 * Accepts an optional locked `client`. This must run inside the same
 * transaction as the write it gates (see withLockedSquad below) — if
 * it runs on a separate pool connection, two concurrent transfer
 * requests for the same user can both read freeTransfersUsed = 0 and
 * both get classified 'free', which is the exact race CodeRabbit
 * flagged on this module.
 * @param {string} userId users.id.
 * @param {number} gameweekId gameweeks.id.
 * @param {Queryable | undefined} client Optional locked transaction client.
 */
export async function countFreeTransfersUsed(
  userId: string,
  gameweekId: number,
  client?: Queryable
): Promise<number> {
  const queryable = client ?? (await getPool());
  const result = await queryable.query<{count: string}>(
    `SELECT COUNT(*)::text AS count FROM transfers
     WHERE user_id = $1 AND gameweek_id = $2 AND transfer_type = 'free'`,
    [userId, gameweekId]
  );
  return Number(result.rows[0].count);
}

/**
 * Returns a user's transfer history, optionally filtered to one
 * gameweek — the read path for "why did my squad change" support
 * questions (per the tech plan's own framing of the transfers table).
 * @param {string} userId users.id.
 * @param {number | undefined} gameweekId Optional gameweeks.id filter.
 */
export async function findTransfersByUser(
  userId: string,
  gameweekId?: number
): Promise<TransferRow[]> {
  const pool = await getPool();
  if (gameweekId !== undefined) {
    const result = await pool.query<TransferRow>(
      `${BASE_SELECT} WHERE user_id = $1 AND gameweek_id = $2
       ORDER BY resolved_at DESC`,
      [userId, gameweekId]
    );
    return result.rows;
  }
  const result = await pool.query<TransferRow>(
    `${BASE_SELECT} WHERE user_id = $1 ORDER BY resolved_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Acquires a row lock on a user's squad_players rows and runs `fn`
 * against the locked client. A second concurrent call for the same
 * user_id blocks on FOR UPDATE until the first transaction commits or
 * rolls back, then sees real post-commit state.
 *
 * This is what closes the TOCTOU window CodeRabbit flagged on the
 * transfer flow: callers (transfers.service.ts) must do all of their
 * squad reads, validation, and free-transfer classification inside
 * `fn`, using the `client` passed in — not before calling this
 * function, and not on a separate pool connection.
 * @param {string} userId users.id.
 * @param {(client: PoolClient) => Promise<T>} fn Work to run under the lock.
 */
export async function withLockedSquad<T>(
  userId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  return withTransaction(async (client: PoolClient) => {
    await client.query(
      "SELECT 1 FROM squad_players WHERE user_id = $1 FOR UPDATE",
      [userId]
    );
    return fn(client);
  });
}

/**
 * Writes the three rows a transfer produces (delete outgoing player,
 * insert incoming player, log the transfer row) on the given locked
 * client. Pure write — no validation and no squad/business-rule reads
 * happen here; all of that runs in transfers.service.ts before this is
 * called, using the same `client` obtained from withLockedSquad.
 *
 * Must be called with the `client` from an active withLockedSquad
 * transaction — calling this against a plain pool connection reopens
 * the race condition withLockedSquad exists to close.
 * @param {PoolClient} client Locked transaction client from withLockedSquad.
 * @param {object} params Transfer details, already fully validated by
 *   transfers.service.ts.
 */
export async function writeTransfer(
  client: PoolClient,
  params: {
    userId: string;
    gameweekId: number;
    playerOutId: number;
    playerInId: number;
    purchasePriceIn: number;
    transferType: "free" | "paid";
    pointsCost: number;
  }
): Promise<TransferRow> {
  const deleted = await client.query(
    "DELETE FROM squad_players WHERE user_id = $1 AND player_id = $2",
    [params.userId, params.playerOutId]
  );
  if (deleted.rowCount !== 1) {
    throw conflict(
      `Player id ${params.playerOutId} is no longer in your squad`
    );
  }
  await client.query(
    `INSERT INTO squad_players (user_id, player_id, purchase_price)
     VALUES ($1, $2, $3)`,
    [params.userId, params.playerInId, params.purchasePriceIn]
  );

  const result = await client.query<TransferRow>(
    `INSERT INTO transfers
       (user_id, gameweek_id, player_out_id, player_in_id, transfer_type,
        points_cost)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, gameweek_id, player_out_id, player_in_id,
               transfer_type, points_cost, triggered_by_team_id,
               resolved_at, auto_resolved`,
    [
      params.userId,
      params.gameweekId,
      params.playerOutId,
      params.playerInId,
      params.transferType,
      params.pointsCost,
    ]
  );
  return result.rows[0];
}
