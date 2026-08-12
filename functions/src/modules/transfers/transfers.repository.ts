import {PoolClient} from "pg";
import {getPool, withTransaction} from "../../database/pool";

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
 * @param {string} userId users.id.
 * @param {number} gameweekId gameweeks.id.
 */
export async function countFreeTransfersUsed(
  userId: string,
  gameweekId: number
): Promise<number> {
  const pool = await getPool();
  const result = await pool.query<{count: string}>(
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
 * Executes a transfer atomically: removes the outgoing player from
 * squad_players, adds the incoming player at their current price, and
 * logs the transfer row — all three writes commit or roll back
 * together, so a mid-failure can never leave a squad with the old
 * player removed but the new one missing (or a squad change with no
 * transfer record for it).
 * @param {object} params Transfer details, already fully validated by
 *   transfers.service.ts.
 */
export async function executeTransfer(params: {
  userId: string;
  gameweekId: number;
  playerOutId: number;
  playerInId: number;
  purchasePriceIn: number;
  transferType: "free" | "paid";
  pointsCost: number;
}): Promise<TransferRow> {
  return withTransaction(async (client: PoolClient) => {
    await client.query(
      "DELETE FROM squad_players WHERE user_id = $1 AND player_id = $2",
      [params.userId, params.playerOutId]
    );

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
  });
}
