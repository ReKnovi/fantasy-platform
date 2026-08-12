import {Router, Request, Response} from "express";
import {findOrCreateUser} from "../users/users.service";
import {asyncHandler} from "../../middleware/asyncHandler";
import {badRequest} from "../../errors/errors";
import {getTransferHistory, makeTransfer} from "./transfers.service";

export const transfersRouter = Router();

// GET /transfers?gameweekId=1 — the signed-in user's transfer history,
// optionally filtered to one gameweek. gameweekId omitted returns full
// history.
transfersRouter.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const gameweekIdRaw = req.query.gameweekId;
    const gameweekId =
      gameweekIdRaw !== undefined ? Number(gameweekIdRaw) : undefined;
    if (gameweekId !== undefined && Number.isNaN(gameweekId)) {
      throw badRequest("gameweekId must be a number");
    }

    const appUser = await findOrCreateUser(res.locals.firebaseUser);
    const transfers = await getTransferHistory(appUser.id, gameweekId);
    res.json({data: transfers});
  })
);

// POST /transfers — swap one owned player for one not-yet-owned player.
// Body: { gameweekId: number, playerOutId: number, playerInId: number }
transfersRouter.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const {gameweekId, playerOutId, playerInId} = req.body ?? {};

    if (
      typeof gameweekId !== "number" ||
      typeof playerOutId !== "number" ||
      typeof playerInId !== "number"
    ) {
      throw badRequest(
        "gameweekId, playerOutId, and playerInId are all required numbers"
      );
    }

    const appUser = await findOrCreateUser(res.locals.firebaseUser);
    const transfer = await makeTransfer(
      appUser.id,
      gameweekId,
      playerOutId,
      playerInId
    );
    res.status(201).json({data: transfer});
  })
);
