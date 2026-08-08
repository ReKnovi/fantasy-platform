import {Router, Request, Response} from "express";
import {requireRole} from "../../middleware/roleGuard";
import {ValidationError} from "../../utils/errors";
import {confirmPlayingXi, getPlayingXiByMatch} from "./playingXi.service";
import {PlayingXiEntry} from "./playingXi.repository";

export const playingXiRouter = Router();

// GET /playing-xi?matchId=1
playingXiRouter.get("/", async (req: Request, res: Response) => {
  const matchId = Number(req.query.matchId);
  if (Number.isNaN(matchId)) {
    res.status(400).json({error: "matchId query param is required"});
    return;
  }

  try {
    const xi = await getPlayingXiByMatch(matchId);
    res.json({data: xi});
  } catch (err) {
    console.error("GET /playing-xi failed", err);
    res.status(500).json({error: "Failed to fetch playing XI"});
  }
});

// POST /playing-xi — confirms (replaces) the full Playing XI for a match.
// Captured at/around the toss, per the differences doc, point 3.
playingXiRouter.post(
  "/",
  requireRole("scorer_admin", "roster_admin", "super_admin"),
  async (req: Request, res: Response) => {
    const {matchId, entries} = req.body ?? {};

    if (typeof matchId !== "number") {
      res.status(400).json({error: "matchId is required"});
      return;
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      res.status(400).json({error: "entries must be a non-empty array"});
      return;
    }

    const parsedEntries: PlayingXiEntry[] = [];
    for (const entry of entries) {
      if (
        typeof entry?.playerId !== "number" ||
        typeof entry?.realTeamId !== "number"
      ) {
        res
          .status(400)
          .json({error: "Each entry needs a numeric playerId and realTeamId"});
        return;
      }
      parsedEntries.push({
        playerId: entry.playerId,
        realTeamId: entry.realTeamId,
        isMatchWicketKeeper: Boolean(entry.isMatchWicketKeeper),
      });
    }

    try {
      const xi = await confirmPlayingXi(matchId, parsedEntries);
      res.status(201).json({data: xi});
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({error: err.message});
        return;
      }
      console.error("POST /playing-xi failed", err);
      res.status(500).json({error: "Failed to confirm playing XI"});
    }
  }
);
