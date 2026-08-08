import {Router, Request, Response} from "express";
import {requireRole} from "../../middleware/roleGuard";
import {
  getAllRealTeams,
  getRealTeamById,
  registerRealTeam,
  setRealTeamStatus,
} from "./realTeams.service";

export const realTeamsRouter = Router();

// GET /real-teams — any authenticated user (mounted behind
// requireFirebaseAuth in app.ts).
realTeamsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const teams = await getAllRealTeams();
    res.json({data: teams});
  } catch (err) {
    console.error("GET /real-teams failed", err);
    res.status(500).json({error: "Failed to fetch real teams"});
  }
});

// GET /real-teams/:id
realTeamsRouter.get("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({error: "Invalid team id"});
    return;
  }

  try {
    const team = await getRealTeamById(id);
    if (!team) {
      res.status(404).json({error: "Team not found"});
      return;
    }
    res.json({data: team});
  } catch (err) {
    console.error(`GET /real-teams/${id} failed`, err);
    res.status(500).json({error: "Failed to fetch team"});
  }
});

// POST /real-teams — roster_admin/super_admin only.
realTeamsRouter.post(
  "/",
  requireRole("roster_admin", "super_admin"),
  async (req: Request, res: Response) => {
    const {name, shortName} = req.body ?? {};
    if (typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({error: "name is required"});
      return;
    }

    try {
      const team = await registerRealTeam({name, shortName});
      res.status(201).json({data: team});
    } catch (err) {
      console.error("POST /real-teams failed", err);
      res.status(500).json({error: "Failed to create team"});
    }
  }
);

// PATCH /real-teams/:id/status — roster_admin/super_admin only.
// Deliberately does NOT run the forced-transfer elimination cascade —
// see realTeams.service.ts for why.
realTeamsRouter.patch(
  "/:id/status",
  requireRole("roster_admin", "super_admin"),
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const {status} = req.body ?? {};

    if (Number.isNaN(id)) {
      res.status(400).json({error: "Invalid team id"});
      return;
    }
    if (status !== "active" && status !== "eliminated") {
      res.status(400).json({error: "status must be 'active' or 'eliminated'"});
      return;
    }

    try {
      const team = await setRealTeamStatus(id, status);
      if (!team) {
        res.status(404).json({error: "Team not found"});
        return;
      }
      res.json({data: team});
    } catch (err) {
      console.error(`PATCH /real-teams/${id}/status failed`, err);
      res.status(500).json({error: "Failed to update team status"});
    }
  }
);
