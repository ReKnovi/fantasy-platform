import {badRequest, notFound} from "../../errors/errors";
import {SQUAD_SIZE} from "../squad/squadRules.config";
import {getGameweekById} from "../gameweeks/gameweeks.service";
import {
  findOwnedPlayerIds,
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
 * at scoring time (see the points-calculation doc, section 7), and the
 * exact VC mechanic is still pending stakeholder confirmation (tech
 * plan, section 12). This module only records who was picked; it has no
 * opinion on what their picks are worth.
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
