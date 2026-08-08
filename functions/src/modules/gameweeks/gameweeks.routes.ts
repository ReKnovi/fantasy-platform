import {Router, Request, Response} from "express";
import {requireRole} from "../../middleware/roleGuard";
import {
  getAllGameweeks,
  getCurrentGameweek,
  getGameweekById,
  scheduleGameweek,
  updateGameweekStatus,
} from "./gameweeks.service";

export const gameweeksRouter = Router();

// GET /gameweeks — full season list.
gameweeksRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const gameweeks = await getAllGameweeks();
    res.json({data: gameweeks});
  } catch (err) {
    console.error("GET /gameweeks failed", err);
    res.status(500).json({error: "Failed to fetch gameweeks"});
  }
});

// GET /gameweeks/current — the gameweek the app should treat as "active"
// right now. Must be registered before the /:id route below, or Express
// will try to parse "current" as a numeric id and 400.
gameweeksRouter.get("/current", async (_req: Request, res: Response) => {
  try {
    const gameweek = await getCurrentGameweek();
    if (!gameweek) {
      res.status(404).json({error: "No current gameweek"});
      return;
    }
    res.json({data: gameweek});
  } catch (err) {
    console.error("GET /gameweeks/current failed", err);
    res.status(500).json({error: "Failed to fetch current gameweek"});
  }
});

// GET /gameweeks/:id
gameweeksRouter.get("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({error: "Invalid gameweek id"});
    return;
  }

  try {
    const gameweek = await getGameweekById(id);
    if (!gameweek) {
      res.status(404).json({error: "Gameweek not found"});
      return;
    }
    res.json({data: gameweek});
  } catch (err) {
    console.error(`GET /gameweeks/${id} failed`, err);
    res.status(500).json({error: "Failed to fetch gameweek"});
  }
});

// POST /gameweeks — roster_admin/super_admin only.
gameweeksRouter.post(
  "/",
  requireRole("roster_admin", "super_admin"),
  async (req: Request, res: Response) => {
    const {label, phase, deadlineTime} = req.body ?? {};

    if (typeof label !== "string" || label.trim().length === 0) {
      res.status(400).json({error: "label is required"});
      return;
    }
    if (phase !== "group_stage" && phase !== "playoffs") {
      res
        .status(400)
        .json({error: "phase must be 'group_stage' or 'playoffs'"});
      return;
    }
    if (
      typeof deadlineTime !== "string" ||
      Number.isNaN(Date.parse(deadlineTime))
    ) {
      res
        .status(400)
        .json({error: "deadlineTime must be a valid ISO timestamp"});
      return;
    }

    try {
      const gameweek = await scheduleGameweek({label, phase, deadlineTime});
      res.status(201).json({data: gameweek});
    } catch (err) {
      console.error("POST /gameweeks failed", err);
      res.status(500).json({error: "Failed to create gameweek"});
    }
  }
);

// PATCH /gameweeks/:id — roster_admin/super_admin only. Flips
// finished/data_checked; does not allow editing label/phase/deadline_time
// here to avoid silently moving a deadline users already saw — that
// should go through a more deliberate admin flow later if ever needed.
gameweeksRouter.patch(
  "/:id",
  requireRole("roster_admin", "super_admin"),
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const {finished, dataChecked} = req.body ?? {};

    if (Number.isNaN(id)) {
      res.status(400).json({error: "Invalid gameweek id"});
      return;
    }
    if (finished !== undefined && typeof finished !== "boolean") {
      res.status(400).json({error: "finished must be a boolean"});
      return;
    }
    if (dataChecked !== undefined && typeof dataChecked !== "boolean") {
      res.status(400).json({error: "dataChecked must be a boolean"});
      return;
    }

    try {
      const gameweek = await updateGameweekStatus(id, {finished, dataChecked});
      if (!gameweek) {
        res.status(404).json({error: "Gameweek not found"});
        return;
      }
      res.json({data: gameweek});
    } catch (err) {
      console.error(`PATCH /gameweeks/${id} failed`, err);
      res.status(500).json({error: "Failed to update gameweek"});
    }
  }
);
