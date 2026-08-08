import {Router, Request, Response} from "express";
import {getAllPlayers, getPlayerById} from "./players.service";
import {asyncHandler} from "../../middleware/asyncHandler";
import {badRequest, notFound} from "../../errors/errors";

// eslint-disable-next-line new-cap
export const playersRouter = Router();

// GET /players
playersRouter.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    const players = await getAllPlayers();
    res.json({data: players});
  })
);

// GET /players/:id
playersRouter.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw badRequest("Invalid player id");
    }

    const player = await getPlayerById(id);
    if (!player) {
      throw notFound("Player not found");
    }
    res.json({data: player});
  })
);
