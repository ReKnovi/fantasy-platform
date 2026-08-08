import {ValidationError} from "../../utils/errors";
import {
  bulkUpsertStats,
  findStatsByMatch,
  PlayerMatchStatsInput,
  PlayerMatchStatsRow,
  upsertPlayerMatchStats,
} from "./playerMatchStats.repository";

const MAX_WICKETS_PER_INNINGS = 10;

/**
 * Returns the full scorecard (all entered stat rows) for a match.
 * @param {number} matchId matches.id.
 */
export async function getStatsByMatch(
  matchId: number
): Promise<PlayerMatchStatsRow[]> {
  return findStatsByMatch(matchId);
}

/**
 * Field-level sanity checks only — not the cross-scorecard summation
 * checks the tech plan describes (section 7: individual totals summing
 * to the team total, overs bowled summing to the innings length). Those
 * need the rest of the scorecard as context to evaluate and are a
 * deliberate follow-up, not missing by oversight; this just stops
 * obviously invalid single-row data (negative counts, an 11-wicket haul)
 * from ever being stored.
 * @param {PlayerMatchStatsInput} input Raw stat fields for one player.
 */
function validateStatsInput(input: PlayerMatchStatsInput): void {
  const nonNegativeFields: Array<[string, number | undefined]> = [
    ["runs", input.runs],
    ["ballsFaced", input.ballsFaced],
    ["fours", input.fours],
    ["sixes", input.sixes],
    ["legalBallsBowled", input.legalBallsBowled],
    ["runsConceded", input.runsConceded],
    ["wickets", input.wickets],
    ["maidens", input.maidens],
    ["catchesTaken", input.catchesTaken],
    ["stumpings", input.stumpings],
    ["runOutsDirect", input.runOutsDirect],
    ["runOutsAssist", input.runOutsAssist],
  ];
  for (const [field, value] of nonNegativeFields) {
    if (value !== undefined && value < 0) {
      throw new ValidationError(`${field} cannot be negative`);
    }
  }
  if (input.wickets !== undefined && input.wickets > MAX_WICKETS_PER_INNINGS) {
    throw new ValidationError(
      `wickets cannot exceed ${MAX_WICKETS_PER_INNINGS} in an innings`
    );
  }
  if (
    input.fours !== undefined &&
    input.ballsFaced !== undefined &&
    input.fours > input.ballsFaced
  ) {
    throw new ValidationError("fours cannot exceed ballsFaced");
  }
  if (
    input.sixes !== undefined &&
    input.ballsFaced !== undefined &&
    input.sixes > input.ballsFaced
  ) {
    throw new ValidationError("sixes cannot exceed ballsFaced");
  }
}

/**
 * Saves one player's stat row as a draft.
 * @param {number} matchId matches.id.
 * @param {PlayerMatchStatsInput} input Raw stat fields for one player.
 */
export async function saveStatsDraft(
  matchId: number,
  input: PlayerMatchStatsInput
): Promise<PlayerMatchStatsRow> {
  validateStatsInput(input);
  return upsertPlayerMatchStats(matchId, input);
}

/**
 * Saves a full scorecard (every player's stats) as a draft, atomically.
 * @param {number} matchId matches.id.
 * @param {PlayerMatchStatsInput[]} inputs One entry per player.
 */
export async function saveScorecardDraft(
  matchId: number,
  inputs: PlayerMatchStatsInput[]
): Promise<PlayerMatchStatsRow[]> {
  inputs.forEach(validateStatsInput);
  return bulkUpsertStats(matchId, inputs);
}
