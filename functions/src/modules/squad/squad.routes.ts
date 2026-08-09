import {Router, Request, Response} from "express";
import {findOrCreateUser} from "../users/users.service";
import {asyncHandler} from "../../middleware/asyncHandler";
import {badRequest} from "../../errors/errors";
import {buildSquad, getSquad} from "./squad.service";

export const squadRouter = Router();

// GET /squad — the signed-in user's own squad. Mounted behind
// requireFirebaseAuth in app.ts, so res.locals.firebaseUser is guaranteed
// set here.
squadRouter.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    const appUser = await findOrCreateUser(res.locals.firebaseUser);
    const squad = await getSquad(appUser.id);
    res.json({data: squad});
  })
);

// POST /squad — build the initial squad (one-time; see squad.service.ts).
// Body: { playerIds: number[] }
squadRouter.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const {playerIds} = req.body ?? {};
    if (
      !Array.isArray(playerIds) ||
      playerIds.length === 0 ||
      playerIds.some((id) => typeof id !== "number")
    ) {
      throw badRequest("playerIds must be a non-empty array of numbers");
    }

    const appUser = await findOrCreateUser(res.locals.firebaseUser);
    const squad = await buildSquad(appUser.id, playerIds);
    res.status(201).json({data: squad});
  })
);
