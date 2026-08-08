import {Router, Request, Response} from "express";
import {findOrCreateUser} from "../users/users.service";
import {ValidationError} from "../../utils/errors";
import {buildSquad, getSquad} from "./squad.service";

export const squadRouter = Router();

// GET /squad — the signed-in user's own squad. Mounted behind
// requireFirebaseAuth in app.ts, so res.locals.firebaseUser is guaranteed
// set here.
squadRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const appUser = await findOrCreateUser(res.locals.firebaseUser);
    const squad = await getSquad(appUser.id);
    res.json({data: squad});
  } catch (err) {
    console.error("GET /squad failed", err);
    res.status(500).json({error: "Failed to fetch squad"});
  }
});

// POST /squad — build the initial squad (one-time; see squad.service.ts).
// Body: { playerIds: number[] }
squadRouter.post("/", async (req: Request, res: Response) => {
  const {playerIds} = req.body ?? {};
  if (
    !Array.isArray(playerIds) ||
    playerIds.length === 0 ||
    playerIds.some((id) => typeof id !== "number")
  ) {
    res.status(400).json({
      error: "playerIds must be a non-empty array of numbers",
    });
    return;
  }

  try {
    const appUser = await findOrCreateUser(res.locals.firebaseUser);
    const squad = await buildSquad(appUser.id, playerIds);
    res.status(201).json({data: squad});
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({error: err.message});
      return;
    }
    console.error("POST /squad failed", err);
    res.status(500).json({error: "Failed to build squad"});
  }
});
