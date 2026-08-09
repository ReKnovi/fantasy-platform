import {badRequest} from "../../errors/errors";
import {
  findPlayingXiByMatch,
  PlayingXiEntry,
  PlayingXiRow,
  replacePlayingXi,
} from "./playingXi.repository";

/**
 * Returns the confirmed Playing XI for a match.
 * @param {number} matchId matches.id.
 */
export async function getPlayingXiByMatch(
  matchId: number
): Promise<PlayingXiRow[]> {
  return findPlayingXiByMatch(matchId);
}

/**
 * Confirms (or re-confirms) the full Playing XI for a match.
 *
 * Validates the one cricket-specific rule that matters here: at most one
 * designated match wicket-keeper per real_team_id (playing_xi.
 * is_match_wicket_keeper represents who actually kept wicket in that
 * specific match, per the combined schema doc's final-schema notes #4 —
 * there can only be one). Everything else (exact XI size of 11, no
 * duplicate players) is left to the admin UI / a later cross-check pass
 * (tech plan, section 7) rather than hard-coded here — a scorer entering
 * a substitute fielder shouldn't be blocked by an overly strict count.
 * @param {number} matchId matches.id.
 * @param {PlayingXiEntry[]} entries Confirmed players for this match.
 */
export async function confirmPlayingXi(
  matchId: number,
  entries: PlayingXiEntry[]
): Promise<PlayingXiRow[]> {
  const wicketKeepersByTeam = new Map<number, number>();
  for (const entry of entries) {
    if (entry.isMatchWicketKeeper) {
      const count = wicketKeepersByTeam.get(entry.realTeamId) ?? 0;
      wicketKeepersByTeam.set(entry.realTeamId, count + 1);
    }
  }
  for (const [teamId, count] of wicketKeepersByTeam) {
    if (count > 1) {
      throw badRequest(
        `real_team_id ${teamId} has ${count} players flagged as match ` +
          "wicket-keeper — only one is allowed"
      );
    }
  }

  return replacePlayingXi(matchId, entries);
}
