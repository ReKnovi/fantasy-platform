/**
 * Squad-building constants. Values marked "pending confirmation" are
 * open product questions (see the tech plan, section 12) — kept as
 * single named constants specifically so resolving them later is a
 * one-line change, not a rewrite of squadService.ts.
 */

export const SQUAD_SIZE = 14;

export const ROLE_QUOTAS: Record<
  "wicket_keeper" | "all_rounder" | "bowler" | "batsman",
  number
> = {
  wicket_keeper: 2,
  all_rounder: 3,
  bowler: 5,
  batsman: 4,
};

export const REQUIRED_OVERSEAS_COUNT = 4;

// ⚠ Pending stakeholder confirmation — the official product brief says
// max 2 per franchise; a separately-provided app-flow doc says max 3,
// paired with "min 5 franchises represented". Kept as a single config
// constant per the tech plan's explicit instruction not to hardcode
// either value as final. Defaults to the official brief's value (2)
// until this is confirmed one way or the other.
export const MAX_PLAYERS_PER_FRANCHISE = 14;

// Budget is quoted in the product brief as "100 million virtual units".
// players.now_cost is stored in tenths of a million (e.g. 105 = 10.5M,
// per the schema's own comment) — so the cap in that same unit is 1000.
export const BUDGET_CAP_NOW_COST_UNITS = 1000;
