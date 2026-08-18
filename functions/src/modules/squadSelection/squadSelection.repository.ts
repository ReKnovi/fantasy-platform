import {PoolClient} from "pg";
import {getPool, withTransaction} from "../../database/pool";

export interface SquadGameweekSelectionRow {
  id: number;
  user_id: string;
  gameweek_id: number;
  player_id: number;
  is_starting: boolean;
  bench_order: number | null;
  is_captain: boolean;
  is_vice_captain: boolean;
}

const BASE_SELECT = `
  SELECT id, user_id, gameweek_id, player_id, is_starting, bench_order,
         is_captain, is_vice_captain
  FROM squad_gameweek_selection
`;

/**
 * Returns a user's current lineup selection for a gameweek (empty array
 * if they haven't set one yet).
 * @param {string} userId users.id.
 * @param {number} gameweekId gameweeks.id.
 */
export async function findSelection(
  userId: string,
  gameweekId: number
): Promise<SquadGameweekSelectionRow[]> {
  const pool = await getPool();
  const result = await pool.query<SquadGameweekSelectionRow>(
    `${BASE_SELECT} WHERE user_id = $1 AND gameweek_id = $2
     ORDER BY is_starting DESC, bench_order`,
    [userId, gameweekId]
  );
  return result.rows;
}

/**
 * Returns the player ids a user currently owns (their persistent squad),
 * used to validate that a lineup submission only selects from what the
 * user actually owns.
 * @param {string} userId users.id.
 */
export async function findOwnedPlayerIds(userId: string): Promise<number[]> {
  const pool = await getPool();
  const result = await pool.query<{player_id: number}>(
    "SELECT player_id FROM squad_players WHERE user_id = $1",
    [userId]
  );
  return result.rows.map((r) => r.player_id);
}

/**
 * Returns which of the given player ids appear in the confirmed Playing
 * XI for any match in a gameweek — i.e., which of a user's selected
 * players actually took the field that round. A gameweek spans multiple
 * matches (a round; see the differences doc, point 1), so this checks
 * across every match in that gameweek, not a single match_id.
 * @param {number} gameweekId gameweeks.id.
 * @param {number[]} playerIds Player ids to check.
 */
export async function findPlayedPlayerIds(
  gameweekId: number,
  playerIds: number[]
): Promise<Set<number>> {
  const pool = await getPool();
  const result = await pool.query<{player_id: number}>(
    `SELECT DISTINCT px.player_id
     FROM playing_xi px
     JOIN matches m ON m.id = px.match_id
     WHERE m.gameweek_id = $1 AND px.player_id = ANY($2::int[])`,
    [gameweekId, playerIds]
  );
  return new Set(result.rows.map((r) => r.player_id));
}

export interface SelectionEntry {
  playerId: number;
  isStarting: boolean;
  benchOrder?: number;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
}

/**
 * Replaces a user's full lineup for a gameweek in one atomic operation —
 * same delete-then-insert pattern as playingXi.repository.replacePlayingXi,
 * for the same reason: a user resubmitting their lineup before the
 * deadline is the common case, and diffing 14 rows individually buys
 * nothing over just replacing the set.
 * @param {string} userId users.id.
 * @param {number} gameweekId gameweeks.id.
 * @param {SelectionEntry[]} entries The user's full 14-player lineup.
 */
export async function replaceSelection(
  userId: string,
  gameweekId: number,
  entries: SelectionEntry[]
): Promise<SquadGameweekSelectionRow[]> {
  return withTransaction(async (client: PoolClient) => {
    await client.query(
      `DELETE FROM squad_gameweek_selection
       WHERE user_id = $1 AND gameweek_id = $2`,
      [userId, gameweekId]
    );

    const rows: SquadGameweekSelectionRow[] = [];
    for (const entry of entries) {
      const result = await client.query<SquadGameweekSelectionRow>(
        `INSERT INTO squad_gameweek_selection
           (user_id, gameweek_id, player_id, is_starting, bench_order,
            is_captain, is_vice_captain)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, user_id, gameweek_id, player_id, is_starting,
                   bench_order, is_captain, is_vice_captain`,
        [
          userId,
          gameweekId,
          entry.playerId,
          entry.isStarting,
          entry.benchOrder ?? null,
          entry.isCaptain ?? false,
          entry.isViceCaptain ?? false,
        ]
      );
      rows.push(result.rows[0]);
    }
    return rows;
  });
}
