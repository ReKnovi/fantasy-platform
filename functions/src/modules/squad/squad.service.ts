import {badRequest, conflict} from "../../errors/errors";
import {
  BUDGET_CAP_NOW_COST_UNITS,
  MAX_PLAYERS_PER_FRANCHISE,
  REQUIRED_OVERSEAS_COUNT,
  ROLE_QUOTAS,
  SQUAD_SIZE,
} from "./squadRules.config";
import {
  findPlayersForValidation,
  findSquadByUserId,
  insertSquad,
  PlayerForValidation,
  SquadPlayerDetailRow,
  SquadPlayerRow,
} from "./squad.repository";

/**
 * Returns a user's squad (empty array if they haven't built one yet).
 * @param {string} userId users.id.
 */
export async function getSquad(
  userId: string
): Promise<SquadPlayerDetailRow[]> {
  return findSquadByUserId(userId);
}

/**
 * Validates and creates a user's initial squad (also seeds their three
 * user_chips rows — see squad.repository.ts). One-time action — the app
 * flow doc treats "build squad" as happening once, with "set
 * lineup"/transfers as the recurring per-gameweek actions. Editing an
 * existing squad is a transfers concern (separate module, not yet
 * built), so this rejects outright if the user already has one.
 *
 * KNOWN MVP GAP: the "already has a squad" check below is an
 * application-layer guard, not a DB constraint — two concurrent build
 * requests from the same user could theoretically both pass it before
 * either inserts. Acceptable at current scale/concurrency (a one-time
 * action during early access, not a hot path); if it ever needs to be
 * airtight, add a users.has_squad boolean or similar, flipped inside the
 * same transaction as the insert.
 * @param {string} userId users.id.
 * @param {number[]} playerIds Exactly SQUAD_SIZE player ids.
 */
export async function buildSquad(
  userId: string,
  playerIds: number[]
): Promise<SquadPlayerRow[]> {
  const existing = await findSquadByUserId(userId);
  if (existing.length > 0) {
    throw conflict(
      "Squad already exists for this user — use the transfers flow to " +
        "make changes"
    );
  }

  if (playerIds.length !== SQUAD_SIZE) {
    throw badRequest(`Squad must contain exactly ${SQUAD_SIZE} players`);
  }
  const uniqueIds = new Set(playerIds);
  if (uniqueIds.size !== playerIds.length) {
    throw badRequest("Squad cannot contain duplicate players");
  }

  const players = await findPlayersForValidation(playerIds);
  if (players.length !== playerIds.length) {
    const foundIds = new Set(players.map((p) => p.id));
    const missing = playerIds.filter((id) => !foundIds.has(id));
    throw badRequest(`Unknown player id(s): ${missing.join(", ")}`);
  }

  validateEligibility(players);
  validateRoleQuotas(players);
  validateOverseasCount(players);
  validateFranchiseLimit(players);
  validateBudget(players);

  const entries = players.map((p) => ({
    playerId: p.id,
    purchasePrice: p.now_cost,
  }));
  return insertSquad(userId, entries);
}

/**
 * Blocks players that have left the tournament entirely (removed) or
 * are flagged unavailable. Deliberately does NOT block injured/suspended
 * — owning an injured player and just not scoring from them is a normal,
 * allowed choice in the FPL model this game is based on.
 * @param {PlayerForValidation[]} players Proposed squad's player rows.
 */
function validateEligibility(players: PlayerForValidation[]): void {
  const ineligible = players.filter(
    (p) => p.removed || p.status === "unavailable"
  );
  if (ineligible.length > 0) {
    throw badRequest(
      `Player id(s) not eligible for selection: ${ineligible
        .map((p) => p.id)
        .join(", ")}`
    );
  }
}

/**
 * Checks exact role composition (not a min/max band — see the
 * cricket-vs-football differences doc, point 8).
 * @param {PlayerForValidation[]} players Proposed squad's player rows.
 */
function validateRoleQuotas(players: PlayerForValidation[]): void {
  const counts: Record<string, number> = {
    wicket_keeper: 0,
    all_rounder: 0,
    bowler: 0,
    batsman: 0,
  };
  for (const player of players) {
    counts[player.position] += 1;
  }
  for (const [role, required] of Object.entries(ROLE_QUOTAS)) {
    if (counts[role] !== required) {
      throw badRequest(
        `Squad must contain exactly ${required} ${role} (got ${counts[role]})`
      );
    }
  }
}

/**
 * Checks the exactly-4-overseas requirement (a mandatory inclusion, not
 * a cap — see the differences doc, point 8).
 * @param {PlayerForValidation[]} players Proposed squad's player rows.
 */
function validateOverseasCount(players: PlayerForValidation[]): void {
  const overseasCount = players.filter((p) => p.is_overseas).length;
  if (overseasCount !== REQUIRED_OVERSEAS_COUNT) {
    throw badRequest(
      `Squad must contain exactly ${REQUIRED_OVERSEAS_COUNT} overseas ` +
        `players (got ${overseasCount})`
    );
  }
}

/**
 * Checks the per-franchise cap. See squadRules.config.ts for why this
 * value is a single named constant rather than inlined here.
 * @param {PlayerForValidation[]} players Proposed squad's player rows.
 */
function validateFranchiseLimit(players: PlayerForValidation[]): void {
  const countsByTeam = new Map<number, number>();
  for (const player of players) {
    if (player.real_team_id === null) continue;
    countsByTeam.set(
      player.real_team_id,
      (countsByTeam.get(player.real_team_id) ?? 0) + 1
    );
  }
  for (const [teamId, count] of countsByTeam) {
    if (count > MAX_PLAYERS_PER_FRANCHISE) {
      throw badRequest(
        `Too many players from real_team_id ${teamId}: ${count} exceeds the ` +
          `limit of ${MAX_PLAYERS_PER_FRANCHISE}`
      );
    }
  }
}

/**
 * Checks the total squad cost against the budget cap.
 * @param {PlayerForValidation[]} players Proposed squad's player rows.
 */
function validateBudget(players: PlayerForValidation[]): void {
  const totalCost = players.reduce((sum, p) => sum + p.now_cost, 0);
  if (totalCost > BUDGET_CAP_NOW_COST_UNITS) {
    throw badRequest(
      `Squad cost ${totalCost} exceeds the budget cap of ` +
        `${BUDGET_CAP_NOW_COST_UNITS}`
    );
  }
}
