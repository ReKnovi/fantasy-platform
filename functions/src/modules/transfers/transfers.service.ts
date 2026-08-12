import {badRequest, notFound} from "../../errors/errors";
import {getAllGameweeks, getGameweekById} from "../gameweeks/gameweeks.service";
import {
  findPlayersForValidation,
  findSquadByUserId,
  PlayerForValidation,
} from "../squad/squad.repository";
import {
  validateBudget,
  validateEligibility,
  validateFranchiseLimit,
  validateFranchiseSpread,
  validateOverseasCount,
  validateRoleQuotas,
} from "../squad/squad.service";
import {
  countFreeTransfersUsed,
  executeTransfer,
  findTransfersByUser,
  TransferRow,
} from "./transfers.repository";

// "-4pts/extra" per the Discovery Doc's F14 — stored here as a positive
// magnitude (points to be deducted), not a literal negative number. The
// squad aggregation job (not yet built) is what actually subtracts this
// from a user's gameweek total; this module only records that a paid
// transfer happened and what it costs.
const PAID_TRANSFER_POINT_COST = 4;

/**
 * Whether the season has started yet, derived from actual schedule data
 * rather than a hardcoded date: true once now() has passed the earliest
 * scheduled gameweek's deadline_time. getAllGameweeks() is already
 * ordered by deadline_time ASC (see gameweeks.repository.ts), so the
 * first row is always the earliest.
 *
 * Before the season starts, every transfer is unlimited and free per
 * explicit product direction (pre-season squad tweaking shouldn't be
 * gated by the in-season "1 free transfer per gameweek" rule) — once
 * this flips true, normal countFreeTransfersUsed-based logic applies.
 * Self-corrects whenever real fixtures get seeded/rescheduled; nothing
 * here needs updating when the actual season-start date changes.
 */
async function hasSeasonStarted(): Promise<boolean> {
  const gameweeks = await getAllGameweeks();
  if (gameweeks.length === 0) {
    return false;
  }
  const earliest = gameweeks[0];
  return new Date() >= new Date(earliest.deadline_time);
}

/**
 * Returns a user's transfer history, optionally filtered to one
 * gameweek.
 * @param {string} userId users.id.
 * @param {number | undefined} gameweekId Optional gameweeks.id filter.
 */
export async function getTransferHistory(
  userId: string,
  gameweekId?: number
): Promise<TransferRow[]> {
  return findTransfersByUser(userId, gameweekId);
}

/**
 * Executes a regular (free or paid) transfer: swaps one owned player for
 * one not-yet-owned player, re-validating the resulting squad against
 * every rule from squad.service.ts (role quotas, overseas cap, franchise
 * cap/spread, budget) — a transfer that would leave the squad invalid is
 * rejected before anything is written.
 *
 * Free-transfer cost logic: unlimited and free before the season starts
 * (see hasSeasonStarted above); once the season's under way, the first
 * transfer in a gameweek is free and every additional one costs
 * PAID_TRANSFER_POINT_COST, non-cumulative across gameweeks (per F14).
 *
 * Does NOT handle forced transfers (elimination-driven) — those are a
 * separate, not-yet-built flow (see the eliminationJob gap). This
 * function only ever produces transfer_type 'free' or 'paid'.
 * @param {string} userId users.id.
 * @param {number} gameweekId gameweeks.id — transfers lock at the same
 *   deadline as lineup selection.
 * @param {number} playerOutId Player currently owned, being sold.
 * @param {number} playerInId Player not currently owned, being bought.
 */
export async function makeTransfer(
  userId: string,
  gameweekId: number,
  playerOutId: number,
  playerInId: number
): Promise<TransferRow> {
  if (playerOutId === playerInId) {
    throw badRequest("playerOutId and playerInId must be different players");
  }

  const gameweek = await getGameweekById(gameweekId);
  if (!gameweek) {
    throw notFound("Gameweek not found");
  }
  if (new Date() >= new Date(gameweek.deadline_time)) {
    throw badRequest(
      "Transfers are locked — this gameweek's deadline has passed"
    );
  }

  const currentSquad = await findSquadByUserId(userId);
  if (currentSquad.length === 0) {
    throw badRequest("Build a squad before making transfers");
  }
  const owned = currentSquad.find((p) => p.player_id === playerOutId);
  if (!owned) {
    throw badRequest(`Player id ${playerOutId} is not in your squad`);
  }
  if (currentSquad.some((p) => p.player_id === playerInId)) {
    throw badRequest(`Player id ${playerInId} is already in your squad`);
  }

  const candidateRows = await findPlayersForValidation([
    playerOutId,
    playerInId,
  ]);
  const playerOut = candidateRows.find((r) => r.id === playerOutId);
  const playerIn = candidateRows.find((r) => r.id === playerInId);
  if (!playerOut || !playerIn) {
    throw badRequest("Unknown player id(s)");
  }

  if (playerIn.position !== playerOut.position) {
    throw badRequest(
      "Replacement must be the same position as the outgoing player " +
        `(${playerOut.position})`
    );
  }

  // Build the proposed post-transfer squad and re-run every squad-level
  // rule against it — a same-position swap can still break the overseas
  // cap, a franchise limit, the franchise-spread minimum, or the budget.
  // status/removed below are unused placeholders: only validateEligibility
  // reads those fields, and it's only ever called on the incoming player
  // (already-owned players aren't re-checked for eligibility on a
  // transfer they weren't part of).
  const proposedSquad: PlayerForValidation[] = currentSquad
    .filter((p) => p.player_id !== playerOutId)
    .map((p) => ({
      id: p.player_id,
      position: p.position,
      is_overseas: p.is_overseas,
      real_team_id: p.real_team_id,
      now_cost: p.now_cost,
      status: "available",
      removed: false,
    }));
  proposedSquad.push(playerIn);

  validateEligibility([playerIn]);
  validateRoleQuotas(proposedSquad);
  validateOverseasCount(proposedSquad);
  validateFranchiseLimit(proposedSquad);
  validateFranchiseSpread(proposedSquad);
  validateBudget(proposedSquad);

  let transferType: "free" | "paid";
  let pointsCost: number;
  if (!(await hasSeasonStarted())) {
    transferType = "free";
    pointsCost = 0;
  } else {
    const freeTransfersUsed = await countFreeTransfersUsed(userId, gameweekId);
    transferType = freeTransfersUsed === 0 ? "free" : "paid";
    pointsCost = transferType === "free" ? 0 : PAID_TRANSFER_POINT_COST;
  }

  return executeTransfer({
    userId,
    gameweekId,
    playerOutId,
    playerInId,
    purchasePriceIn: playerIn.now_cost,
    transferType,
    pointsCost,
  });
}
