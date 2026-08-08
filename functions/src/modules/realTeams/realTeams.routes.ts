import {Router, Request, Response} from "express";
import {requireRole} from "../../middleware/roleGuard";
import {
  getAllRealTeams,
  getRealTeamById,
  registerRealTeam,
  setRealTeamStatus,
} from "./realTeams.service";
import {asyncHandler} from "../../middleware/asyncHandler";
import {badRequest, notFound} from "../../errors/errors";

export const realTeamsRouter = Router();

// GET /real-teams — any authenticated user (mounted behind
// requireFirebaseAuth in app.ts).
realTeamsRouter.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    const teams = await getAllRealTeams();
    res.json({data: teams});
  })
);

// GET /real-teams/:id
realTeamsRouter.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw badRequest("Invalid team id");
    }

    const team = await getRealTeamById(id);
    if (!team) {
      throw notFound("Team not found");
    }
    res.json({data: team});
  })
);

// POST /real-teams — roster_admin/super_admin only.
realTeamsRouter.post(
  "/",
  requireRole("roster_admin", "super_admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const {name, shortName} = req.body ?? {};
    if (typeof name !== "string" || name.trim().length === 0) {
      throw badRequest("name is required");
    }

    const team = await registerRealTeam({name, shortName});
    res.status(201).json({data: team});
  })
);

// PATCH /real-teams/:id/status — roster_admin/super_admin only.
// Deliberately does NOT run the forced-transfer elimination cascade —
// see realTeams.service.ts for why.
realTeamsRouter.patch(
  "/:id/status",
  requireRole("roster_admin", "super_admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const {status} = req.body ?? {};

    if (Number.isNaN(id)) {
      throw badRequest("Invalid team id");
    }
    if (status !== "active" && status !== "eliminated") {
      throw badRequest("status must be 'active' or 'eliminated'");
    }

    const team = await setRealTeamStatus(id, status);
    if (!team) {
      throw notFound("Team not found");
    }
    res.json({data: team});
  })
);
