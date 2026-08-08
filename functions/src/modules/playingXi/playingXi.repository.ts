import {PoolClient} from "pg";
import {getPool, withTransaction} from "../../database/pool";

export interface PlayingXiRow {
  id: number;
  match_id: number;
  player_id: number;
  real_team_id: number | null;
  is_match_wicket_keeper: boolean;
}

const BASE_SELECT = `
  SELECT id, match_id, player_id, real_team_id, is_match_wicket_keeper
  FROM playing_xi
`;

/**
 * Returns the confirmed Playing XI for a match (both teams combined).
 * @param {number} matchId matches.id.
 */
export async function findPlayingXiByMatch(
  matchId: number
): Promise<PlayingXiRow[]> {
  const pool = await getPool();
  const result = await pool.query<PlayingXiRow>(
    `${BASE_SELECT} WHERE match_id = $1 ORDER BY real_team_id, id`,
    [matchId]
  );
  return result.rows;
}

export interface PlayingXiEntry {
  playerId: number;
  realTeamId: number;
  isMatchWicketKeeper?: boolean;
}

/**
 * Replaces the confirmed Playing XI for a match in one atomic operation.
 * Deletes any existing rows for the match first, then inserts the new
 * set — simpler and safer for the admin's actual workflow (confirm the
 * whole XI at once, at/around the toss, per the differences doc point 3)
 * than diffing individual rows, and avoids stale entries lingering if the
 * admin corrects a mistake by resubmitting the whole list.
 * @param {number} matchId matches.id.
 * @param {PlayingXiEntry[]} entries Confirmed players for this match.
 */
export async function replacePlayingXi(
  matchId: number,
  entries: PlayingXiEntry[]
): Promise<PlayingXiRow[]> {
  return withTransaction(async (client: PoolClient) => {
    await client.query("DELETE FROM playing_xi WHERE match_id = $1", [matchId]);

    const rows: PlayingXiRow[] = [];
    for (const entry of entries) {
      const result = await client.query<PlayingXiRow>(
        `INSERT INTO playing_xi (match_id, player_id,
        real_team_id,
        is_match_wicket_keeper)
         VALUES ($1, $2, $3, $4)
         RETURNING id,
         match_id, player_id,
         real_team_id,
         is_match_wicket_keeper`,
        [
          matchId,
          entry.playerId,
          entry.realTeamId,
          entry.isMatchWicketKeeper ?? false,
        ]
      );
      rows.push(result.rows[0]);
    }
    return rows;
  });
}
