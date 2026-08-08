import {Router, Request, Response} from "express";
import {requireRole} from "../../middleware/roleGuard";
import {
  getMatchById,
  getMatchesByGameweek,
  publishMatchResult,
  recordTossWinner,
  saveMatchResultDraft,
  scheduleMatch,
} from "./matches.service";
import {MatchStatus, WinMarginType} from "./matches.repository";
import {asyncHandler} from "../../middleware/asyncHandler";
import {badRequest, notFound} from "../../errors/errors";

export const matchesRouter = Router();

const VALID_MATCH_STATUSES: MatchStatus[] = [
  "scheduled",
  "completed",
  "no_result",
  "abandoned",
  "dls_adjusted",
];
const VALID_MARGIN_TYPES: WinMarginType[] = [
  "runs",
  "wickets",
  "tie",
  "no_result",
];

// GET /matches?gameweekId=3 — fixtures for a round. gameweekId is required;
// there's no "all matches" endpoint since that list only grows and every
// real caller (fixtures view, admin match picker) is already scoped to a
// gameweek.
matchesRouter.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const gameweekId = Number(req.query.gameweekId);
    if (Number.isNaN(gameweekId)) {
      throw badRequest("gameweekId query param is required");
    }

    const matches = await getMatchesByGameweek(gameweekId);
    res.json({data: matches});
  })
);

// GET /matches/:id
matchesRouter.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw badRequest("Invalid match id");
    }

    const match = await getMatchById(id);
    if (!match) {
      throw notFound("Match not found");
    }
    res.json({data: match});
  })
);

// POST /matches — fixture scheduling is a roster/schedule concern, not a
// match-day scoring concern, so this is scoped to roster_admin/super_admin
// (not scorer_admin).
matchesRouter.post(
  "/",
  requireRole("roster_admin", "super_admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const {gameweekId, teamAId, teamBId, matchDate, venue} = req.body ?? {};

    if (teamAId === undefined || teamBId === undefined) {
      throw badRequest("teamAId and teamBId are required");
    }
    if (typeof matchDate !== "string" || Number.isNaN(Date.parse(matchDate))) {
      throw badRequest("matchDate must be a valid ISO timestamp");
    }
    if (Number(teamAId) === Number(teamBId)) {
      throw badRequest("A team cannot play itself");
    }

    const match = await scheduleMatch({
      gameweekId: gameweekId !== undefined ? Number(gameweekId) : undefined,
      teamAId: Number(teamAId),
      teamBId: Number(teamBId),
      matchDate,
      venue,
    });
    res.status(201).json({data: match});
  })
);

// PATCH /matches/:id/toss — captured at/around the toss, per the
// differences doc point 3. scorer_admin can enter this (it happens at the
// ground, same person who'll enter the Playing XI and stats).
matchesRouter.patch(
  "/:id/toss",
  requireRole("scorer_admin", "roster_admin", "super_admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const tossWinnerId = Number(req.body?.tossWinnerId);

    if (Number.isNaN(id) || Number.isNaN(tossWinnerId)) {
      throw badRequest("Invalid match id or tossWinnerId");
    }

    const match = await recordTossWinner(id, tossWinnerId);
    if (!match) {
      throw notFound("Match not found");
    }
    res.json({data: match});
  })
);

// PATCH /matches/:id/result — draft result entry, NOT published yet. See
// the admin flow doc: draft → validate → publish are separate steps.
matchesRouter.patch(
  "/:id/result",
  requireRole("scorer_admin", "roster_admin", "super_admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const {
      matchStatus,
      winnerTeamId,
      winMargin,
      winMarginType,
      playerOfMatchId,
    } = req.body ?? {};

    if (Number.isNaN(id)) {
      throw badRequest("Invalid match id");
    }
    if (!VALID_MATCH_STATUSES.includes(matchStatus)) {
      throw badRequest(
        `matchStatus must be one of: ${VALID_MATCH_STATUSES.join(", ")}`
      );
    }
    if (
      winMarginType !== undefined &&
      !VALID_MARGIN_TYPES.includes(winMarginType)
    ) {
      throw badRequest(
        `winMarginType must be one of: ${VALID_MARGIN_TYPES.join(", ")}`
      );
    }

    const match = await saveMatchResultDraft(id, {
      matchStatus,
      winnerTeamId:
        winnerTeamId !== undefined ? Number(winnerTeamId) : undefined,
      winMargin: winMargin !== undefined ? Number(winMargin) : undefined,
      winMarginType,
      playerOfMatchId:
        playerOfMatchId !== undefined ? Number(playerOfMatchId) : undefined,
    });
    if (!match) {
      throw notFound("Match not found");
    }
    res.json({data: match});
  })
);

// POST /matches/:id/publish — makes the result live. Deliberately a
// separate step/route from /result (draft) so a client can't publish by
// accident while saving a routine edit — matches the tech plan's explicit
// "never auto-publish on save" requirement (section 7).
matchesRouter.post(
  "/:id/publish",
  requireRole("scorer_admin", "roster_admin", "super_admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw badRequest("Invalid match id");
    }

    const match = await publishMatchResult(id);
    if (!match) {
      throw notFound("Match not found");
    }
    res.json({data: match});
  })
);
