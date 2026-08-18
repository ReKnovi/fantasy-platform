import {Router, Request, Response} from "express";
import {asyncHandler} from "../../middleware/asyncHandler";
import {badRequest} from "../../errors/errors";
import {getPlayerInsights} from "./playerInsights.service";
import {findActiveGameweekId} from "./playerInsights.repository";

export const playerInsightsRouter = Router();

// GET /playerInsights/:playerId
playerInsightsRouter.get(
  "/:playerId",
  asyncHandler(async (req: Request, res: Response) => {
    const playerId = Number(req.params.playerId);
    if (Number.isNaN(playerId)) {
      throw badRequest("Invalid playerId");
    }
    // using the query param if provided othwerwise fetches dynamically
    let gameweekId: number;
    if (req.query.gameweekId) {
      gameweekId = Number(req.query.gameweekId);
      if (Number.isNaN(gameweekId)) {
        throw badRequest("Invalid gameweekId");
      }
    } else {
      gameweekId = await findActiveGameweekId();
    }
    const insights = await getPlayerInsights(playerId, gameweekId);
    res.json({data: insights});
  })
);
