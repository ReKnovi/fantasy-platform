import {
  createMatch,
  findMatchById,
  findMatchesByGameweek,
  MatchRow,
  MatchStatus,
  publishMatch,
  recordMatchResult,
  setTossWinner,
  WinMarginType,
} from "./matches.repository";

/**
 * Returns all matches in a gameweek (a "round" — see the cricket-vs-
 * football differences doc, point 1), in match-day order.
 * @param {number} gameweekId gameweeks.id.
 */
export async function getMatchesByGameweek(
  gameweekId: number
): Promise<MatchRow[]> {
  return findMatchesByGameweek(gameweekId);
}

/**
 * Returns one match by id, or null if it doesn't exist.
 * @param {number} id matches.id.
 */
export async function getMatchById(id: number): Promise<MatchRow | null> {
  return findMatchById(id);
}

/**
 * Schedules a new fixture (roster_admin/super_admin only).
 * @param {object} params New match's scheduling fields.
 * @param {number | undefined} params.gameweekId Owning gameweek, if known yet.
 * @param {number} params.teamAId First team.
 * @param {number} params.teamBId Second team.
 * @param {string} params.matchDate ISO timestamp of the match.
 * @param {string | undefined} params.venue Venue name.
 */
export async function scheduleMatch(params: {
  gameweekId?: number;
  teamAId: number;
  teamBId: number;
  matchDate: string;
  venue?: string;
}): Promise<MatchRow> {
  if (params.teamAId === params.teamBId) {
    throw new Error("A team cannot play itself");
  }
  return createMatch(params);
}

/**
 * Records the toss winner (scorer_admin/roster_admin/super_admin).
 * @param {number} id matches.id.
 * @param {number} tossWinnerId real_teams.id of the toss winner.
 */
export async function recordTossWinner(
  id: number,
  tossWinnerId: number
): Promise<MatchRow | null> {
  return setTossWinner(id, tossWinnerId);
}

/**
 * Saves a match result as a draft (not yet visible to users) — see the
 * admin flow doc's draft-then-publish sequence. Call publishMatchResult
 * separately to make it live.
 * @param {number} id matches.id.
 * @param {object} params Result fields.
 * @param {MatchStatus} params.matchStatus Final match status.
 * @param {number | undefined} params.winnerTeamId Winning team, if decided.
 * @param {number | undefined} params.winMargin Margin value (runs/wickets).
 * @param {WinMarginType | undefined} params.winMarginType Margin unit.
 * @param {number | undefined} params.playerOfMatchId Player of the match.
 */
export async function saveMatchResultDraft(
  id: number,
  params: {
    matchStatus: MatchStatus;
    winnerTeamId?: number;
    winMargin?: number;
    winMarginType?: WinMarginType;
    playerOfMatchId?: number;
  }
): Promise<MatchRow | null> {
  return recordMatchResult(id, params);
}

/**
 * Publishes a match's result, making it visible to users and eligible for
 * the scoring engine to pick up. See matches.repository.ts for why this
 * doesn't trigger scoring directly.
 * @param {number} id matches.id.
 */
export async function publishMatchResult(id: number): Promise<MatchRow | null> {
  return publishMatch(id);
}
