import {Router, Request, Response} from "express";
import {requireRole} from "../../middleware/roleGuard";
import {ValidationError} from "../../utils/errors";
import {
  getStatsByMatch,
  saveScorecardDraft,
  saveStatsDraft,
} from "./playerMatchStats.service";
import {PlayerMatchStatsInput} from "./playerMatchStats.repository";

export const playerMatchStatsRouter = Router();

/**
 * Parses one raw request-body entry into a typed input, or null if it's
 * missing the one required field (playerId). Unknown/wrong-typed
 * optional fields are silently dropped rather than rejected outright —
 * the repository layer already defaults every optional stat to 0/false,
 * so a partially-filled row (e.g. a pure bowler with no batting fields)
 * is valid input, not an error.
 * @param {unknown} raw One entry from the request body.
 * @return {PlayerMatchStatsInput | null} Parsed input, or null if invalid.
 */
function parseStatsInput(raw: unknown): PlayerMatchStatsInput | null {
  const entry = raw as Record<string, unknown>;
  if (typeof entry?.playerId !== "number") return null;
  return {
    playerId: entry.playerId,
    runs: typeof entry.runs === "number" ? entry.runs : undefined,
    ballsFaced:
      typeof entry.ballsFaced === "number" ? entry.ballsFaced : undefined,
    fours: typeof entry.fours === "number" ? entry.fours : undefined,
    sixes: typeof entry.sixes === "number" ? entry.sixes : undefined,
    /* eslint-disable operator-linebreak */
    isBattingDismissal:
      typeof entry.isBattingDismissal === "boolean"
        ? entry.isBattingDismissal
        : undefined,
    legalBallsBowled:
      typeof entry.legalBallsBowled === "number"
        ? entry.legalBallsBowled
        : undefined,
    /* eslint-enable operator-linebreak */
    runsConceded:
      typeof entry.runsConceded === "number" ? entry.runsConceded : undefined,
    wickets: typeof entry.wickets === "number" ? entry.wickets : undefined,
    maidens: typeof entry.maidens === "number" ? entry.maidens : undefined,
    catchesTaken:
      typeof entry.catchesTaken === "number" ? entry.catchesTaken : undefined,
    stumpings:
      typeof entry.stumpings === "number" ? entry.stumpings : undefined,
    runOutsDirect:
      typeof entry.runOutsDirect === "number" ? entry.runOutsDirect : undefined,
    runOutsAssist:
      typeof entry.runOutsAssist === "number" ? entry.runOutsAssist : undefined,
  };
}

// GET /player-match-stats?matchId=1
playerMatchStatsRouter.get("/", async (req: Request, res: Response) => {
  const matchId = Number(req.query.matchId);
  if (Number.isNaN(matchId)) {
    res.status(400).json({error: "matchId query param is required"});
    return;
  }

  try {
    const stats = await getStatsByMatch(matchId);
    res.json({data: stats});
  } catch (err) {
    console.error("GET /player-match-stats failed", err);
    res.status(500).json({error: "Failed to fetch player match stats"});
  }
});

// POST /player-match-stats — upsert one player's stats (draft).
// Body: { matchId: number, stats: { playerId, runs, wickets, ... } }
playerMatchStatsRouter.post(
  "/",
  requireRole("scorer_admin", "roster_admin", "super_admin"),
  async (req: Request, res: Response) => {
    const matchId = Number(req.body?.matchId);
    const input = parseStatsInput(req.body?.stats);

    if (Number.isNaN(matchId) || !input) {
      res.status(400).json({error: "matchId and stats.playerId are required"});
      return;
    }

    try {
      const row = await saveStatsDraft(matchId, input);
      res.status(201).json({data: row});
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({error: err.message});
        return;
      }
      console.error("POST /player-match-stats failed", err);
      res.status(500).json({error: "Failed to save stats"});
    }
  }
);

// POST /player-match-stats/bulk — upsert a full scorecard atomically.
// Body: { matchId: number, stats: [{ playerId, runs, wickets, ... }, ...] }
playerMatchStatsRouter.post(
  "/bulk",
  requireRole("scorer_admin", "roster_admin", "super_admin"),
  async (req: Request, res: Response) => {
    const matchId = Number(req.body?.matchId);
    const rawEntries = req.body?.stats;

    if (
      Number.isNaN(matchId) ||
      !Array.isArray(rawEntries) ||
      rawEntries.length === 0
    ) {
      res
        .status(400)
        .json({error: "matchId and a non-empty stats array are required"});
      return;
    }

    const inputs: PlayerMatchStatsInput[] = [];
    for (const raw of rawEntries) {
      const parsed = parseStatsInput(raw);
      if (!parsed) {
        res.status(400).json({
          error: "Every stats entry needs a numeric playerId",
        });
        return;
      }
      inputs.push(parsed);
    }

    try {
      const rows = await saveScorecardDraft(matchId, inputs);
      res.status(201).json({data: rows});
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({error: err.message});
        return;
      }
      console.error("POST /player-match-stats/bulk failed", err);
      res.status(500).json({error: "Failed to save scorecard"});
    }
  }
);
