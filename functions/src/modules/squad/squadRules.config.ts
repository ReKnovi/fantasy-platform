/**
 * Squad-building constants. Values marked "pending confirmation" are
 * open product questions — kept as single named constants specifically
 * so resolving them later is a one-line change, not a rewrite of
 * squadService.ts.
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

// Resolved per the NPL Product Discovery Document & Roadmap (F3): "Max 4
// overseas players" — a cap (0–4 allowed), NOT the earlier tech plan/
// differences doc's "exactly 4 required". Confirmed with direction to
// change; superseded interpretation, not still open.
export const MAX_OVERSEAS_COUNT = 4;

// Corrected from 2 to 3 per the Discovery Document (F3): "Max 3 players
// per franchise." The earlier default of 2 came from the older product
// brief and is superseded.
export const MAX_PLAYERS_PER_FRANCHISE = 3;

// Per the Discovery Document (F3): "Min 5 of 8 franchises represented."
// Only meaningful paired with the max-3-per-franchise rule above — 14
// players ÷ 3 max per franchise mathematically requires at least 5
// franchises, so this check mostly catches a squad that's needlessly
// concentrated (e.g. exactly 3+3+3+3+2 across only 5 franchises is the
// tightest legal case) rather than ever being the binding constraint on
// its own.
export const MIN_FRANCHISES_REPRESENTED = 5;

// Budget is quoted in the product brief as "100 million virtual units".
// players.now_cost is stored in tenths of a million (e.g. 105 = 10.5M,
// per the schema's own comment) — so the cap in that same unit is 1000.
export const BUDGET_CAP_NOW_COST_UNITS = 1000;
