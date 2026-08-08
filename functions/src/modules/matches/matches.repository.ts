import {getPool, withTransaction} from "../../database/pool";

export type MatchStatus =
  "scheduled" | "completed" | "no_result" | "abandoned" | "dls_adjusted";

export type WinMarginType = "runs" | "wickets" | "tie" | "no_result";

export interface MatchRow {
  id: number;
  gameweek_id: number | null;
  team_a_id: number | null;
  team_b_id: number | null;
  match_date: string;
  venue: string | null;
  match_status: MatchStatus;
  toss_winner_id: number | null;
  player_of_match_id: number | null;
  winner_team_id: number | null;
  win_margin: number | null;
  win_margin_type: WinMarginType | null;
  published: boolean;
  published_at: string | null;
}

const BASE_SELECT = `
  SELECT id, gameweek_id, team_a_id, team_b_id, match_date, venue,
         match_status, toss_winner_id, player_of_match_id,
         winner_team_id, win_margin, win_margin_type,
         published, published_at
  FROM matches
`;

/**
 * Returns all matches for a gameweek, in match-day order. This is the
 * primary read path for both the fantasy-manager fixtures view and the
 * admin scorecard-entry tool's match picker.
 * @param {number} gameweekId gameweeks.id.
 */
export async function findMatchesByGameweek(
  gameweekId: number
): Promise<MatchRow[]> {
  const pool = await getPool();
  const result = await pool.query<MatchRow>(
    `${BASE_SELECT} WHERE gameweek_id = $1 ORDER BY match_date ASC`,
    [gameweekId]
  );
  return result.rows;
}

/**
 * Returns one match by id.
 * @param {number} id matches.id.
 */
export async function findMatchById(id: number): Promise<MatchRow | null> {
  const pool = await getPool();
  const result = await pool.query<MatchRow>(`${BASE_SELECT} WHERE id = $1`, [
    id,
  ]);
  return result.rows[0] ?? null;
}

/**
 * Creates a new fixture. gameweek_id is nullable at creation time on
 * purpose (matches the schema) — fixtures can be entered before the
 * round-mapping to a gameweek is finalized; see the gameweeks module and
 * the cricket-vs-football differences doc, point 1.
 * @param {object} params New match's scheduling fields.
 * @param {number | undefined} params.gameweekId Owning gameweek, if known yet.
 * @param {number} params.teamAId First team.
 * @param {number} params.teamBId Second team.
 * @param {string} params.matchDate ISO timestamp of the match.
 * @param {string | undefined} params.venue Venue name.
 */
export async function createMatch(params: {
  gameweekId?: number;
  teamAId: number;
  teamBId: number;
  matchDate: string;
  venue?: string;
}): Promise<MatchRow> {
  const pool = await getPool();
  const result = await pool.query<MatchRow>(
    `INSERT INTO matches (gameweek_id, team_a_id, team_b_id, match_date, venue)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, gameweek_id, team_a_id, team_b_id, match_date, venue,
               match_status, toss_winner_id, player_of_match_id,
               winner_team_id, win_margin, win_margin_type,
               published, published_at`,
    [
      params.gameweekId ?? null,
      params.teamAId,
      params.teamBId,
      params.matchDate,
      params.venue ?? null,
    ]
  );
  return result.rows[0];
}

/**
 * Records the toss winner. Kept as its own narrow update (rather than
 * folded into the general match-status update) because it happens at a
 * distinct moment in the admin flow — right before the confirmed Playing
 * XI is captured, per the differences doc, point 3 — not alongside result
 * entry, which only exists after the match ends.
 * @param {number} id matches.id.
 * @param {number} tossWinnerId real_teams.id of the toss winner.
 */
export async function setTossWinner(
  id: number,
  tossWinnerId: number
): Promise<MatchRow | null> {
  const pool = await getPool();
  const result = await pool.query<MatchRow>(
    `UPDATE matches SET toss_winner_id = $2 WHERE id = $1
     RETURNING id, gameweek_id, team_a_id, team_b_id, match_date, venue,
               match_status, toss_winner_id, player_of_match_id,
               winner_team_id, win_margin, win_margin_type,
               published, published_at`,
    [id, tossWinnerId]
  );
  return result.rows[0] ?? null;
}

/**
 * Records the match result (status, winner, margin, player of the match).
 * This does NOT flip `published` — publishing is a deliberate, separate
 * admin action (see admin flow doc, section 4: draft → publish) that
 * triggers the scoring engine. Entering a result here is the "draft"
 * step; publishMatch() below is what makes it live.
 * @param {number} id matches.id.
 * @param {object} params Result fields.
 * @param {MatchStatus} params.matchStatus Final match status.
 * @param {number | undefined} params.winnerTeamId Winning team, if decided.
 * @param {number | undefined} params.winMargin Margin value (runs/wickets).
 * @param {WinMarginType | undefined} params.winMarginType Margin unit.
 * @param {number | undefined} params.playerOfMatchId Player of the match.
 */
export async function recordMatchResult(
  id: number,
  params: {
    matchStatus: MatchStatus;
    winnerTeamId?: number;
    winMargin?: number;
    winMarginType?: WinMarginType;
    playerOfMatchId?: number;
  }
): Promise<MatchRow | null> {
  const pool = await getPool();
  const result = await pool.query<MatchRow>(
    `UPDATE matches
     SET match_status = $2,
         winner_team_id = $3,
         win_margin = $4,
         win_margin_type = $5,
         player_of_match_id = $6
     WHERE id = $1
     RETURNING id, gameweek_id, team_a_id, team_b_id, match_date, venue,
               match_status, toss_winner_id, player_of_match_id,
               winner_team_id, win_margin, win_margin_type,
               published, published_at`,
    [
      id,
      params.matchStatus,
      params.winnerTeamId ?? null,
      params.winMargin ?? null,
      params.winMarginType ?? null,
      params.playerOfMatchId ?? null,
    ]
  );
  return result.rows[0] ?? null;
}

/**
 * Publishes a match's result, gating scoring visibility per
 * matches.published (the authoritative match-level publication gate —
 * see the combined schema doc's final-schema notes, #3). Also stamps
 * every player_match_stats row for this match as published, in the same
 * transaction — that field is audit-granularity only and never
 * independently gates scoring, but it should still reflect reality once
 * the match-level gate flips. Does NOT itself trigger the scoring engine
 * — that's scoringJob's job, listening for this transition.
 * @param {number} id matches.id.
 */
export async function publishMatch(id: number): Promise<MatchRow | null> {
  return withTransaction(async (client) => {
    const matchResult = await client.query<MatchRow>(
      `UPDATE matches SET published = true, published_at = now()
       WHERE id = $1
       RETURNING id, gameweek_id, team_a_id, team_b_id, match_date, venue,
                 match_status, toss_winner_id, player_of_match_id,
                 winner_team_id, win_margin, win_margin_type,
                 published, published_at`,
      [id]
    );
    const match = matchResult.rows[0] ?? null;
    if (!match) return null;

    await client.query(
      `UPDATE player_match_stats SET published = true, published_at = now()
       WHERE match_id = $1`,
      [id]
    );

    return match;
  });
}
