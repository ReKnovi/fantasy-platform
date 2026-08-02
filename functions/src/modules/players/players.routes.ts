import {Router, Request, Response} from "express";
import {getAllPlayers, getPlayerById} from "./players.service";

// eslint-disable-next-line new-cap
export const playersRouter = Router();

// GET /players
playersRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const players = await getAllPlayers();
    res.json({data: players});
  } catch (err) {
    console.error("GET /players failed", err);
    res.status(500).json({error: "Failed to fetch players"});
  }
});

// GET /players/:id
playersRouter.get("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({error: "Invalid player id"});
    return;
  }

  try {
    const player = await getPlayerById(id);
    if (!player) {
      res.status(404).json({error: "Player not found"});
      return;
    }
    res.json({data: player});
  } catch (err) {
    console.error(`GET /players/${id} failed`, err);
    res.status(500).json({error: "Failed to fetch player"});
  }
});
