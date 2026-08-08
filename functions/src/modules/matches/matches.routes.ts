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
matchesRouter.get("/", async (req: Request, res: Response) => {
  const gameweekId = Number(req.query.gameweekId);
  if (Number.isNaN(gameweekId)) {
    res.status(400).json({error: "gameweekId query param is required"});
    return;
  }

  try {
    const matches = await getMatchesByGameweek(gameweekId);
    res.json({data: matches});
  } catch (err) {
    console.error("GET /matches failed", err);
    res.status(500).json({error: "Failed to fetch matches"});
  }
});

// GET /matches/:id
matchesRouter.get("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({error: "Invalid match id"});
    return;
  }

  try {
    const match = await getMatchById(id);
    if (!match) {
      res.status(404).json({error: "Match not found"});
      return;
    }
    res.json({data: match});
  } catch (err) {
    console.error(`GET /matches/${id} failed`, err);
    res.status(500).json({error: "Failed to fetch match"});
  }
});

// POST /matches — fixture scheduling is a roster/schedule concern, not a
// match-day scoring concern, so this is scoped to roster_admin/super_admin
// (not scorer_admin).
matchesRouter.post(
  "/",
  requireRole("roster_admin", "super_admin"),
  async (req: Request, res: Response) => {
    const {gameweekId, teamAId, teamBId, matchDate, venue} = req.body ?? {};

    if (teamAId === undefined || teamBId === undefined) {
      res.status(400).json({error: "teamAId and teamBId are required"});
      return;
    }
    if (typeof matchDate !== "string" || Number.isNaN(Date.parse(matchDate))) {
      res.status(400).json({error: "matchDate must be a valid ISO timestamp"});
      return;
    }

    try {
      const match = await scheduleMatch({
        gameweekId: gameweekId !== undefined ? Number(gameweekId) : undefined,
        teamAId: Number(teamAId),
        teamBId: Number(teamBId),
        matchDate,
        venue,
      });
      res.status(201).json({data: match});
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create match";
      const status = message === "A team cannot play itself" ? 400 : 500;
      if (status === 500) console.error("POST /matches failed", err);
      res.status(status).json({error: message});
    }
  }
);

// PATCH /matches/:id/toss — captured at/around the toss, per the
// differences doc point 3. scorer_admin can enter this (it happens at the
// ground, same person who'll enter the Playing XI and stats).
matchesRouter.patch(
  "/:id/toss",
  requireRole("scorer_admin", "roster_admin", "super_admin"),
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const tossWinnerId = Number(req.body?.tossWinnerId);

    if (Number.isNaN(id) || Number.isNaN(tossWinnerId)) {
      res.status(400).json({error: "Invalid match id or tossWinnerId"});
      return;
    }

    try {
      const match = await recordTossWinner(id, tossWinnerId);
      if (!match) {
        res.status(404).json({error: "Match not found"});
        return;
      }
      res.json({data: match});
    } catch (err) {
      console.error(`PATCH /matches/${id}/toss failed`, err);
      res.status(500).json({error: "Failed to record toss winner"});
    }
  }
);

// PATCH /matches/:id/result — draft result entry, NOT published yet. See
// the admin flow doc: draft → validate → publish are separate steps.
matchesRouter.patch(
  "/:id/result",
  requireRole("scorer_admin", "roster_admin", "super_admin"),
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const {
      matchStatus,
      winnerTeamId,
      winMargin,
      winMarginType,
      playerOfMatchId,
    } = req.body ?? {};

    if (Number.isNaN(id)) {
      res.status(400).json({error: "Invalid match id"});
      return;
    }
    if (!VALID_MATCH_STATUSES.includes(matchStatus)) {
      res.status(400).json({
        error: `matchStatus must be one of: ${VALID_MATCH_STATUSES.join(", ")}`,
      });
      return;
    }
    if (
      winMarginType !== undefined &&
      !VALID_MARGIN_TYPES.includes(winMarginType)
    ) {
      res.status(400).json({
        error: `winMarginType must be one of: ${VALID_MARGIN_TYPES.join(", ")}`,
      });
      return;
    }

    try {
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
        res.status(404).json({error: "Match not found"});
        return;
      }
      res.json({data: match});
    } catch (err) {
      console.error(`PATCH /matches/${id}/result failed`, err);
      res.status(500).json({error: "Failed to save match result"});
    }
  }
);

// POST /matches/:id/publish — makes the result live. Deliberately a
// separate step/route from /result (draft) so a client can't publish by
// accident while saving a routine edit — matches the tech plan's explicit
// "never auto-publish on save" requirement (section 7).
matchesRouter.post(
  "/:id/publish",
  requireRole("scorer_admin", "roster_admin", "super_admin"),
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({error: "Invalid match id"});
      return;
    }

    try {
      const match = await publishMatchResult(id);
      if (!match) {
        res.status(404).json({error: "Match not found"});
        return;
      }
      res.json({data: match});
    } catch (err) {
      console.error(`POST /matches/${id}/publish failed`, err);
      res.status(500).json({error: "Failed to publish match"});
    }
  }
);
