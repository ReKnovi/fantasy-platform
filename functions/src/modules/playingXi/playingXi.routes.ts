import {Router, Request, Response} from "express";
import {requireRole} from "../../middleware/roleGuard";
import {asyncHandler} from "../../middleware/asyncHandler";
import {badRequest} from "../../errors/errors";
import {confirmPlayingXi, getPlayingXiByMatch} from "./playingXi.service";
import {PlayingXiEntry} from "./playingXi.repository";

export const playingXiRouter = Router();

// GET /playing-xi?matchId=1
playingXiRouter.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const matchId = Number(req.query.matchId);
    if (Number.isNaN(matchId)) {
      throw badRequest("matchId query param is required");
    }

    const xi = await getPlayingXiByMatch(matchId);
    res.json({data: xi});
  })
);

// POST /playing-xi — confirms (replaces) the full Playing XI for a match.
// Captured at/around the toss, per the differences doc, point 3.
playingXiRouter.post(
  "/",
  requireRole("scorer_admin", "roster_admin", "super_admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const {matchId, entries} = req.body ?? {};

    if (typeof matchId !== "number") {
      throw badRequest("matchId is required");
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      throw badRequest("entries must be a non-empty array");
    }

    const parsedEntries: PlayingXiEntry[] = [];
    for (const entry of entries) {
      if (
        typeof entry?.playerId !== "number" ||
        typeof entry?.realTeamId !== "number"
      ) {
        throw badRequest("Each entry needs a numeric playerId and realTeamId");
      }
      parsedEntries.push({
        playerId: entry.playerId,
        realTeamId: entry.realTeamId,
        isMatchWicketKeeper: Boolean(entry.isMatchWicketKeeper),
      });
    }

    const xi = await confirmPlayingXi(matchId, parsedEntries);
    res.status(201).json({data: xi});
  })
);
