import {badRequest, notFound} from "../../errors/errors";
import {SQUAD_SIZE} from "../squad/squadRules.config";
import {findPlayersForValidation} from "../squad/squad.repository";
import {getGameweekById} from "../gameweeks/gameweeks.service";
import {
  findOwnedPlayerIds,
  findPlayedPlayerIds,
  findSelection,
  replaceSelection,
  SelectionEntry,
  SquadGameweekSelectionRow,
} from "./squadSelection.repository";

const STARTING_XI_SIZE = 11;
const BENCH_SIZE = SQUAD_SIZE - STARTING_XI_SIZE;

/**
 * Returns a user's current lineup for a gameweek.
 * @param {string} userId users.id.
 * @param {number} gameweekId gameweeks.id.
 */
export async function getSelection(
  userId: string,
  gameweekId: number
): Promise<SquadGameweekSelectionRow[]> {
  return findSelection(userId, gameweekId);
}

/**
 * Validates and saves a user's full lineup for a gameweek: which 11 of
 * their 14 owned players start, the bench order for the other 3, and the
 * captain/vice-captain choice. Can be called repeatedly up until the
 * gameweek's deadline — each call replaces the previous selection.
 *
 * Deliberately does NOT decide the captain/vice-captain multiplier value
 * or fallback mechanic here — that's the squad aggregation job's concern
 * at scoring time (see the points-calculation doc, section 7). The exact
 * mechanic is now resolved per the Discovery Doc (F11): Captain 2x, VC
 * 1.5x standing bonus escalating to 2x fallback only if Captain didn't
 * play — this module just records who was picked; the aggregation job
 * (not yet built) applies that rule.
 * @param {string} userId users.id.
 * @param {number} gameweekId gameweeks.id.
 * @param {SelectionEntry[]} entries The user's full 14-player lineup.
 */
export async function setLineup(
  userId: string,
  gameweekId: number,
  entries: SelectionEntry[]
): Promise<SquadGameweekSelectionRow[]> {
  const gameweek = await getGameweekById(gameweekId);
  if (!gameweek) {
    throw notFound("Gameweek not found");
  }
  if (new Date() >= new Date(gameweek.deadline_time)) {
    throw badRequest("Gameweek is locked — its deadline has passed");
  }

  if (entries.length !== SQUAD_SIZE) {
    throw badRequest(`Lineup must contain exactly ${SQUAD_SIZE} players`);
  }
  const submittedIds = entries.map((e) => e.playerId);
  if (new Set(submittedIds).size !== submittedIds.length) {
    throw badRequest("Lineup cannot contain duplicate players");
  }

  const ownedIds = await findOwnedPlayerIds(userId);
  if (ownedIds.length === 0) {
    throw badRequest("Build a squad before setting a lineup");
  }
  const ownedSet = new Set(ownedIds);
  const notOwned = submittedIds.filter((id) => !ownedSet.has(id));
  if (notOwned.length > 0) {
    throw badRequest(`Player id(s) not in your squad: ${notOwned.join(", ")}`);
  }
  const missingFromSquad = ownedIds.filter((id) => !submittedIds.includes(id));
  if (missingFromSquad.length > 0) {
    throw badRequest(
      `Lineup is missing squad player id(s): ${missingFromSquad.join(", ")}`
    );
  }

  const starting = entries.filter((e) => e.isStarting);
  const bench = entries.filter((e) => !e.isStarting);
  if (starting.length !== STARTING_XI_SIZE) {
    throw badRequest(
      `Starting XI must contain exactly ${STARTING_XI_SIZE} players ` +
        `(got ${starting.length})`
    );
  }
  if (bench.length !== BENCH_SIZE) {
    throw badRequest(
      `Bench must contain exactly ${BENCH_SIZE} players (got ${bench.length})`
    );
  }
  if (starting.some((e) => e.benchOrder !== undefined)) {
    throw badRequest("Starting players cannot have a benchOrder");
  }

  const benchOrders = bench.map((e) => e.benchOrder);
  const expectedOrders = Array.from({length: BENCH_SIZE}, (_, i) => i + 1);
  const allNumeric = benchOrders.every((o) => typeof o === "number");
  /* eslint-disable operator-linebreak */
  const sortedBenchOrders = allNumeric
    ? [...(benchOrders as number[])].sort((a, b) => a - b)
    : [];
  /* eslint-enable operator-linebreak */
  const ordersValid =
    allNumeric &&
    JSON.stringify(sortedBenchOrders) === JSON.stringify(expectedOrders);
  if (!ordersValid) {
    throw badRequest(
      `Bench players must have a unique benchOrder from 1 to ${BENCH_SIZE}`
    );
  }

  const captains = entries.filter((e) => e.isCaptain);
  const viceCaptains = entries.filter((e) => e.isViceCaptain);
  if (captains.length !== 1) {
    throw badRequest("Exactly one player must be marked as captain");
  }
  if (viceCaptains.length !== 1) {
    throw badRequest("Exactly one player must be marked as vice-captain");
  }
  if (captains[0].playerId === viceCaptains[0].playerId) {
    throw badRequest("Captain and vice-captain must be different players");
  }
  if (!captains[0].isStarting || !viceCaptains[0].isStarting) {
    throw badRequest(
      "Captain and vice-captain must both be in the starting XI"
    );
  }

  return replaceSelection(userId, gameweekId, entries);
}

/**
 * Convenience action for a manual, user-led substitution before the
 * gameweek deadline: swaps one starting player for one bench player,
 * leaving every other slot untouched. Internally builds the resulting
 * 14-entry lineup and re-runs it through setLineup(), so it gets the
 * exact same validation (and the exact same deadline lock) as a full
 * lineup resubmission — this is a thin convenience wrapper over the
 * existing endpoint, not a separate code path with its own rules.
 *
 * Distinct from auto-substitution (getEffectiveLineup, F13): this is a
 * deliberate pre-deadline action the user takes to change who's
 * starting; auto-sub is a computed, read-only fallback applied after the
 * fact when a chosen starter didn't take the field.
 *
 * Rejects the swap if the outgoing starter is the captain or
 * vice-captain — captain/VC must stay in the starting XI (enforced in
 * setLineup), so silently reassigning captaincy as a side effect of a
 * bench swap would be surprising. The user should change captaincy
 * explicitly via a full setLineup call first.
 * @param {string} userId users.id.
 * @param {number} gameweekId gameweeks.id.
 * @param {number} startingPlayerId Currently-starting player to bench.
 * @param {number} benchPlayerId Currently-benched player to promote.
 */
export async function swapLineupPlayers(
  userId: string,
  gameweekId: number,
  startingPlayerId: number,
  benchPlayerId: number
): Promise<SquadGameweekSelectionRow[]> {
  const current = await findSelection(userId, gameweekId);
  if (current.length === 0) {
    throw badRequest("Set a lineup before making a manual substitution");
  }

  const outgoing = current.find((s) => s.player_id === startingPlayerId);
  if (!outgoing || !outgoing.is_starting) {
    throw badRequest(
      `Player id ${startingPlayerId} is not currently in your starting XI`
    );
  }
  const incoming = current.find((s) => s.player_id === benchPlayerId);
  if (!incoming || incoming.is_starting) {
    throw badRequest(
      `Player id ${benchPlayerId} is not currently on your bench`
    );
  }
  if (outgoing.is_captain || outgoing.is_vice_captain) {
    throw badRequest(
      "Cannot bench your captain or vice-captain — reassign captaincy first " +
        "via a full lineup update"
    );
  }

  const newEntries: SelectionEntry[] = current.map((entry) => {
    if (entry.player_id === startingPlayerId) {
      return {
        playerId: entry.player_id,
        isStarting: false,
        benchOrder: incoming.bench_order ?? undefined,
        isCaptain: false,
        isViceCaptain: false,
      };
    }
    if (entry.player_id === benchPlayerId) {
      return {
        playerId: entry.player_id,
        isStarting: true,
        benchOrder: undefined,
        isCaptain: false,
        isViceCaptain: false,
      };
    }
    return {
      playerId: entry.player_id,
      isStarting: entry.is_starting,
      benchOrder: entry.bench_order ?? undefined,
      isCaptain: entry.is_captain,
      isViceCaptain: entry.is_vice_captain,
    };
  });

  return setLineup(userId, gameweekId, newEntries);
}

export interface EffectiveLineupEntry {
  slotPlayerId: number;
  effectivePlayerId: number;
  wasSubstituted: boolean;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

/**
 * Computes the effective starting XI for a gameweek after applying
 * auto-substitution (F13): any starter who didn't appear in the
 * confirmed Playing XI for their gameweek's match is replaced by the
 * first bench player (in bench_order) who both played and shares their
 * exact position — same-role replacement only, per the differences
 * doc's working assumption (FPL-style auto-sub), flagged there as
 * replaceable once the actual substitute-activation rule is confirmed.
 *
 * This is a read-only, computed-on-demand view — it does NOT write back
 * to squad_gameweek_selection. The user's actual picks (including any
 * manual swaps made via swapLineupPlayers above) stay exactly as
 * submitted; this only answers "who counts for scoring purposes" for
 * whatever the user's lineup was at deadline, which is squarely the
 * squad aggregation job's concern once it exists (see the
 * points-calculation doc, section 3). This function is that same
 * computation, available early since it only depends on playing_xi
 * data, not on the scoring engine itself.
 *
 * UNRESOLVED PER THE DIFFERENCES DOC: what happens when no eligible
 * same-role bench player played. Implemented here as "no substitution —
 * that slot's effective player is just the original starter, who
 * naturally contributes nothing once they have no match stats" —
 * matching FPL's own behavior in the equivalent case. Flag if a
 * different fallback gets confirmed later.
 * @param {string} userId users.id.
 * @param {number} gameweekId gameweeks.id.
 */
export async function getEffectiveLineup(
  userId: string,
  gameweekId: number
): Promise<EffectiveLineupEntry[]> {
  const selection = await findSelection(userId, gameweekId);
  if (selection.length === 0) {
    throw notFound("No lineup set for this gameweek");
  }

  const allPlayerIds = selection.map((s) => s.player_id);
  const [playedIds, playerDetails] = await Promise.all([
    findPlayedPlayerIds(gameweekId, allPlayerIds),
    findPlayersForValidation(allPlayerIds),
  ]);
  const positionById = new Map(playerDetails.map((p) => [p.id, p.position]));

  const starting = [...selection.filter((s) => s.is_starting)].sort(
    (a, b) => a.player_id - b.player_id
  );
  const bench = [...selection.filter((s) => !s.is_starting)].sort(
    (a, b) => (a.bench_order ?? 0) - (b.bench_order ?? 0)
  );
  const usedBenchIds = new Set<number>();

  return starting.map((starter) => {
    if (playedIds.has(starter.player_id)) {
      return {
        slotPlayerId: starter.player_id,
        effectivePlayerId: starter.player_id,
        wasSubstituted: false,
        isCaptain: starter.is_captain,
        isViceCaptain: starter.is_vice_captain,
      };
    }

    const starterPosition = positionById.get(starter.player_id);
    const replacement = bench.find(
      (b) =>
        !usedBenchIds.has(b.player_id) &&
        playedIds.has(b.player_id) &&
        positionById.get(b.player_id) === starterPosition
    );

    if (replacement) {
      usedBenchIds.add(replacement.player_id);
      return {
        slotPlayerId: starter.player_id,
        effectivePlayerId: replacement.player_id,
        wasSubstituted: true,
        // Captaincy does not transfer to a substitute; the F11 fallback
        // is resolved by the aggregation job from the original picks.
        isCaptain: false,
        isViceCaptain: false,
      };
    }
    return {
      slotPlayerId: starter.player_id,
      effectivePlayerId: starter.player_id,
      wasSubstituted: false,
      isCaptain: starter.is_captain,
      isViceCaptain: starter.is_vice_captain,
    };
  });
}
