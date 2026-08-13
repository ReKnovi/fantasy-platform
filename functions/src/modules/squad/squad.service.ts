import {badRequest, conflict} from "../../errors/errors";
import {
  BUDGET_CAP_NOW_COST_UNITS,
  MAX_OVERSEAS_COUNT,
  MAX_PLAYERS_PER_FRANCHISE,
  MIN_FRANCHISES_REPRESENTED,
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
 * Validates and creates a user's initial squad (also seeds their four
 * user_chips rows — see squad.repository.ts). One-time action — the app
 * flow doc treats "build squad" as happening once, with "set
 * lineup"/transfers as the recurring per-gameweek actions. Editing an
 * existing squad is a transfers concern (see the transfers module), so
 * this rejects outright if the user already has one.
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
      "Squad already exists for this user — use the transfers flow to make changes"
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
  validateFranchiseSpread(players);
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
 *
 * Exported: transfers.service.ts reuses this to check an incoming
 * player's eligibility on a transfer, rather than duplicating the rule.
 * @param {PlayerForValidation[]} players Proposed squad's player rows.
 */
export function validateEligibility(players: PlayerForValidation[]): void {
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
 *
 * Exported: transfers.service.ts re-runs this against a proposed
 * post-transfer squad, since a same-position swap keeps this valid by
 * construction but it's still run for defense-in-depth.
 * @param {PlayerForValidation[]} players Proposed squad's player rows.
 */
export function validateRoleQuotas(players: PlayerForValidation[]): void {
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
 * Checks the overseas-player cap (Discovery Doc, F3: "Max 4 overseas
 * players") — a ceiling, not a mandatory count. A squad with 0 overseas
 * players is legal; a squad with 5 is not.
 *
 * Exported: transfers.service.ts re-runs this against a proposed
 * post-transfer squad — a transfer can change overseas composition even
 * when positions match.
 * @param {PlayerForValidation[]} players Proposed squad's player rows.
 */
export function validateOverseasCount(players: PlayerForValidation[]): void {
  const overseasCount = players.filter((p) => p.is_overseas).length;
  if (overseasCount > MAX_OVERSEAS_COUNT) {
    throw badRequest(
      `Squad cannot contain more than ${MAX_OVERSEAS_COUNT} overseas players ` +
        `(got ${overseasCount})`
    );
  }
}

/**
 * Checks the per-franchise cap. See squadRules.config.ts for why this
 * value is a single named constant rather than inlined here.
 *
 * Exported: transfers.service.ts re-runs this against a proposed
 * post-transfer squad.
 * @param {PlayerForValidation[]} players Proposed squad's player rows.
 */
export function validateFranchiseLimit(players: PlayerForValidation[]): void {
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
 * Checks the minimum-franchise-spread requirement (Discovery Doc, F3:
 * "Min 5 of 8 franchises represented"). Distinct from the per-franchise
 * cap above — that limits concentration in any one franchise, this
 * ensures the squad isn't drawn from too narrow a slice of the league
 * even while staying under that cap.
 *
 * Exported: transfers.service.ts re-runs this against a proposed
 * post-transfer squad — swapping a player can narrow franchise spread
 * even without violating the per-franchise cap.
 * @param {PlayerForValidation[]} players Proposed squad's player rows.
 */
export function validateFranchiseSpread(players: PlayerForValidation[]): void {
  const distinctTeams = new Set(
    players.map((p) => p.real_team_id).filter((id): id is number => id !== null)
  );
  if (distinctTeams.size < MIN_FRANCHISES_REPRESENTED) {
    throw badRequest(
      `Squad must include players from at least ${MIN_FRANCHISES_REPRESENTED} ` +
        `different franchises (got ${distinctTeams.size})`
    );
  }
}

/**
 * Checks the total squad cost against the budget cap.
 *
 * Exported: transfers.service.ts re-runs this against a proposed
 * post-transfer squad, since prices can differ between the outgoing and
 * incoming player.
 * @param {PlayerForValidation[]} players Proposed squad's player rows.
 */
export function validateBudget(players: PlayerForValidation[]): void {
  const totalCost = players.reduce((sum, p) => sum + p.now_cost, 0);
  if (totalCost > BUDGET_CAP_NOW_COST_UNITS) {
    throw badRequest(
      `Squad cost ${totalCost} exceeds the budget cap of ${BUDGET_CAP_NOW_COST_UNITS}`
    );
  }
}
