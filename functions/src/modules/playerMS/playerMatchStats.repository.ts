import {PoolClient} from "pg";
import {getPool, withTransaction} from "../../database/pool";

export interface PlayerMatchStatsRow {
  id: number;
  player_id: number;
  match_id: number;
  runs: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  is_batting_dismissal: boolean;
  legal_balls_bowled: number;
  runs_conceded: number;
  wickets: number;
  maidens: number;
  catches_taken: number;
  stumpings: number;
  run_outs_direct: number;
  run_outs_assist: number;
  published: boolean;
  published_at: string | null;
}

const BASE_SELECT = `
  SELECT id, player_id, match_id, runs, balls_faced, fours, sixes,
         is_batting_dismissal, legal_balls_bowled, runs_conceded, wickets,
         maidens, catches_taken, stumpings, run_outs_direct, run_outs_assist,
         published, published_at
  FROM player_match_stats
`;

/**
 * Returns every player's stat row for a match (the full scorecard).
 * @param {number} matchId matches.id.
 */
export async function findStatsByMatch(
  matchId: number
): Promise<PlayerMatchStatsRow[]> {
  const pool = await getPool();
  const result = await pool.query<PlayerMatchStatsRow>(
    `${BASE_SELECT} WHERE match_id = $1 ORDER BY player_id`,
    [matchId]
  );
  return result.rows;
}

export interface PlayerMatchStatsInput {
  playerId: number;
  runs?: number;
  ballsFaced?: number;
  fours?: number;
  sixes?: number;
  isBattingDismissal?: boolean;
  // Canonical bowling delivery count (see the combined schema doc's
  // final-schema notes #1) — NOT cricket overs notation (e.g. "3.5").
  // If the admin UI collects overs in that notation, it must convert to
  // legal balls correctly (3 overs 5 balls = 23, not 3.5 * 6 = 21)
  // before calling this API. No conversion happens here.
  legalBallsBowled?: number;
  runsConceded?: number;
  wickets?: number;
  maidens?: number;
  catchesTaken?: number;
  stumpings?: number;
  runOutsDirect?: number;
  runOutsAssist?: number;
}

/**
 * Upserts one player's stat row for a match (draft — does not touch
 * `published`; that only flips via matches.service.publishMatchResult).
 * Relies on the (player_id, match_id) UNIQUE constraint as the ON
 * CONFLICT target, so re-submitting a correction is the same call as the
 * original entry — no separate "edit" endpoint needed.
 * @param {number} matchId matches.id.
 * @param {PlayerMatchStatsInput} input Raw stat fields for one player.
 * @param {PoolClient | undefined} client Optional transaction client —
 *   pass this from bulkUpsertStats so every row in a scorecard commits or
 *   rolls back together.
 */
export async function upsertPlayerMatchStats(
  matchId: number,
  input: PlayerMatchStatsInput,
  client?: PoolClient
): Promise<PlayerMatchStatsRow> {
  const runner = client ?? (await getPool());
  const result = await runner.query<PlayerMatchStatsRow>(
    `INSERT INTO player_match_stats (
       player_id, match_id, runs, balls_faced, fours, sixes,
       is_batting_dismissal, legal_balls_bowled, runs_conceded, wickets,
       maidens, catches_taken, stumpings, run_outs_direct, run_outs_assist
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     ON CONFLICT (player_id, match_id) DO UPDATE SET
       runs = EXCLUDED.runs,
       balls_faced = EXCLUDED.balls_faced,
       fours = EXCLUDED.fours,
       sixes = EXCLUDED.sixes,
       is_batting_dismissal = EXCLUDED.is_batting_dismissal,
       legal_balls_bowled = EXCLUDED.legal_balls_bowled,
       runs_conceded = EXCLUDED.runs_conceded,
       wickets = EXCLUDED.wickets,
       maidens = EXCLUDED.maidens,
       catches_taken = EXCLUDED.catches_taken,
       stumpings = EXCLUDED.stumpings,
       run_outs_direct = EXCLUDED.run_outs_direct,
       run_outs_assist = EXCLUDED.run_outs_assist
     RETURNING id, player_id, match_id, runs, balls_faced, fours, sixes,
               is_batting_dismissal, legal_balls_bowled, runs_conceded,
               wickets, maidens, catches_taken, stumpings, run_outs_direct,
               run_outs_assist, published, published_at`,
    [
      input.playerId,
      matchId,
      input.runs ?? 0,
      input.ballsFaced ?? 0,
      input.fours ?? 0,
      input.sixes ?? 0,
      input.isBattingDismissal ?? false,
      input.legalBallsBowled ?? 0,
      input.runsConceded ?? 0,
      input.wickets ?? 0,
      input.maidens ?? 0,
      input.catchesTaken ?? 0,
      input.stumpings ?? 0,
      input.runOutsDirect ?? 0,
      input.runOutsAssist ?? 0,
    ]
  );
  return result.rows[0];
}

/**
 * Upserts a full scorecard (every player's stats for a match) atomically
 * — either the whole batch lands or none of it does, so a failure partway
 * through never leaves a half-entered scorecard for the next admin to
 * puzzle over. This is the primary write path for the admin tool (tech
 * plan, section 7: ~22 players entered in one 30-60 minute sitting).
 * @param {number} matchId matches.id.
 * @param {PlayerMatchStatsInput[]} inputs One entry per player.
 */
export async function bulkUpsertStats(
  matchId: number,
  inputs: PlayerMatchStatsInput[]
): Promise<PlayerMatchStatsRow[]> {
  return withTransaction(async (client) => {
    const rows: PlayerMatchStatsRow[] = [];
    for (const input of inputs) {
      rows.push(await upsertPlayerMatchStats(matchId, input, client));
    }
    return rows;
  });
}
