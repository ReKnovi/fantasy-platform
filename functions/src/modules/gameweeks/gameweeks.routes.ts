import {Router, Request, Response} from "express";
import {requireRole} from "../../middleware/roleGuard";
import {
  getAllGameweeks,
  getCurrentGameweek,
  getGameweekById,
  scheduleGameweek,
  updateGameweekStatus,
} from "./gameweeks.service";
import {asyncHandler} from "../../middleware/asyncHandler";
import {badRequest, notFound} from "../../errors/errors";

export const gameweeksRouter = Router();

// GET /gameweeks — full season list.
gameweeksRouter.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    const gameweeks = await getAllGameweeks();
    res.json({data: gameweeks});
  })
);

// GET /gameweeks/current — the gameweek the app should treat as "active"
// right now. Must be registered before the /:id route below, or Express
// will try to parse "current" as a numeric id and 400.
gameweeksRouter.get(
  "/current",
  asyncHandler(async (_req: Request, res: Response) => {
    const gameweek = await getCurrentGameweek();
    if (!gameweek) {
      throw notFound("No current gameweek");
    }
    res.json({data: gameweek});
  })
);

// GET /gameweeks/:id
gameweeksRouter.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw badRequest("Invalid gameweek id");
    }

    const gameweek = await getGameweekById(id);
    if (!gameweek) {
      throw notFound("Gameweek not found");
    }
    res.json({data: gameweek});
  })
);

// POST /gameweeks — roster_admin/super_admin only.
gameweeksRouter.post(
  "/",
  requireRole("roster_admin", "super_admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const {label, phase, deadlineTime} = req.body ?? {};

    if (typeof label !== "string" || label.trim().length === 0) {
      throw badRequest("label is required");
    }
    if (phase !== "group_stage" && phase !== "playoffs") {
      throw badRequest("phase must be 'group_stage' or 'playoffs'");
    }
    if (
      typeof deadlineTime !== "string" ||
      Number.isNaN(Date.parse(deadlineTime))
    ) {
      throw badRequest("deadlineTime must be a valid ISO timestamp");
    }

    const gameweek = await scheduleGameweek({label, phase, deadlineTime});
    res.status(201).json({data: gameweek});
  })
);

// PATCH /gameweeks/:id — roster_admin/super_admin only. Flips
// finished/data_checked; does not allow editing label/phase/deadline_time
// here to avoid silently moving a deadline users already saw — that
// should go through a more deliberate admin flow later if ever needed.
gameweeksRouter.patch(
  "/:id",
  requireRole("roster_admin", "super_admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const {finished, dataChecked} = req.body ?? {};

    if (Number.isNaN(id)) {
      throw badRequest("Invalid gameweek id");
    }
    if (finished !== undefined && typeof finished !== "boolean") {
      throw badRequest("finished must be a boolean");
    }
    if (dataChecked !== undefined && typeof dataChecked !== "boolean") {
      throw badRequest("dataChecked must be a boolean");
    }

    const gameweek = await updateGameweekStatus(id, {finished, dataChecked});
    if (!gameweek) {
      throw notFound("Gameweek not found");
    }
    res.json({data: gameweek});
  })
);
