import {Router, Request, Response} from "express";
import {findOrCreateUser} from "../users/users.service";
import {asyncHandler} from "../../middleware/asyncHandler";
import {badRequest} from "../../errors/errors";
import {
  createLeague,
  getLeagueDetail,
  getMyLeagues,
  joinLeague,
} from "./leagues.service";

export const leaguesRouter = Router();

// GET /leagues/mine — leagues the signed-in user belongs to. Registered
// before /:id so Express doesn't try to parse "mine" as a numeric id.
leaguesRouter.get(
  "/mine",
  asyncHandler(async (_req: Request, res: Response) => {
    const appUser = await findOrCreateUser(res.locals.firebaseUser);
    const leagues = await getMyLeagues(appUser.id);
    res.json({data: leagues});
  })
);

// GET /leagues/:id — league detail + member list. Members only (see
// leagues.service.ts).
leaguesRouter.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw badRequest("Invalid league id");
    }

    const appUser = await findOrCreateUser(res.locals.firebaseUser);
    const detail = await getLeagueDetail(appUser.id, id);
    res.json({data: detail});
  })
);

// POST /leagues — create a league. Creator is auto-joined as a member.
// Body: { name: string }
leaguesRouter.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const {name} = req.body ?? {};
    if (typeof name !== "string") {
      throw badRequest("name is required");
    }

    const appUser = await findOrCreateUser(res.locals.firebaseUser);
    const result = await createLeague(appUser.id, name);
    res.status(201).json({data: result});
  })
);

// POST /leagues/join — join a league via its invite code.
// Body: { joinCode: string }
leaguesRouter.post(
  "/join",
  asyncHandler(async (req: Request, res: Response) => {
    const {joinCode} = req.body ?? {};
    if (typeof joinCode !== "string") {
      throw badRequest("joinCode is required");
    }

    const appUser = await findOrCreateUser(res.locals.firebaseUser);
    const result = await joinLeague(appUser.id, joinCode);
    res.status(201).json({data: result});
  })
);
