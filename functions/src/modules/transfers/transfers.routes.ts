import {Router, Request, Response} from "express";
import {findOrCreateUser} from "../users/users.service";
import {asyncHandler} from "../../middleware/asyncHandler";
import {parsePositiveInt} from "../../utils/parsePositiveInt";
import {getTransferHistory, makeTransfer} from "./transfers.service";

export const transfersRouter = Router();

// GET /transfers?gameweekId=1 — the signed-in user's transfer history,
// optionally filtered to one gameweek. gameweekId omitted returns full
// history.
transfersRouter.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const gameweekIdRaw = req.query.gameweekId;
    /* eslint-disable operator-linebreak */
    const gameweekId =
      gameweekIdRaw !== undefined
        ? parsePositiveInt(gameweekIdRaw, "gameweekId")
        : undefined;
    /* eslint-enable operator-linebreak */
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
    const parsedGameweekId = parsePositiveInt(gameweekId, "gameweekId");
    const parsedPlayerOutId = parsePositiveInt(playerOutId, "playerOutId");
    const parsedPlayerInId = parsePositiveInt(playerInId, "playerInId");

    const appUser = await findOrCreateUser(res.locals.firebaseUser);
    const transfer = await makeTransfer(
      appUser.id,
      parsedGameweekId,
      parsedPlayerOutId,
      parsedPlayerInId
    );
    res.status(201).json({data: transfer});
  })
);
