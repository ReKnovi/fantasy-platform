import {Router, Request, Response} from "express";
import {findOrCreateUser} from "../users/users.service";
import {asyncHandler} from "../../middleware/asyncHandler";
import {badRequest} from "../../errors/errors";
import {
  getEffectiveLineup,
  getSelection,
  setLineup,
  swapLineupPlayers,
} from "./squadSelection.service";
import {SelectionEntry} from "./squadSelection.repository";

export const squadSelectionRouter = Router();

// GET /squad-selection?gameweekId=1 — the signed-in user's lineup for a
// gameweek. Empty array if they haven't set one yet.
squadSelectionRouter.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const gameweekId = Number(req.query.gameweekId);
    if (Number.isNaN(gameweekId)) {
      throw badRequest("gameweekId query param is required");
    }

    const appUser = await findOrCreateUser(res.locals.firebaseUser);
    const selection = await getSelection(appUser.id, gameweekId);
    res.json({data: selection});
  })
);

// GET /squad-selection/effective-lineup?gameweekId=1 — the starting XI
// after auto-substitution is applied (F13). Read-only, computed on
// demand — never modifies squad_gameweek_selection. Meaningful once the
// gameweek's matches have had Playing XIs confirmed; before that,
// nothing will have been auto-subbed yet (wasSubstituted will be false
// for everyone still shown as unplayed).
squadSelectionRouter.get(
  "/effective-lineup",
  asyncHandler(async (req: Request, res: Response) => {
    const gameweekId = Number(req.query.gameweekId);
    if (Number.isNaN(gameweekId)) {
      throw badRequest("gameweekId query param is required");
    }

    const appUser = await findOrCreateUser(res.locals.firebaseUser);
    const effective = await getEffectiveLineup(appUser.id, gameweekId);
    res.json({data: effective});
  })
);

// POST /squad-selection — set (or replace) the lineup for a gameweek.
// Body: { gameweekId: number, entries: [{ playerId, isStarting,
//          benchOrder?, isCaptain?, isViceCaptain? }, ...] }
squadSelectionRouter.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const {gameweekId, entries} = req.body ?? {};

    if (typeof gameweekId !== "number") {
      throw badRequest("gameweekId is required");
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      throw badRequest("entries must be a non-empty array");
    }

    const parsedEntries: SelectionEntry[] = [];
    for (const entry of entries) {
      if (
        typeof entry?.playerId !== "number" ||
        typeof entry?.isStarting !== "boolean"
      ) {
        throw badRequest(
          "Each entry needs a numeric playerId and boolean isStarting"
        );
      }
      parsedEntries.push({
        playerId: entry.playerId,
        isStarting: entry.isStarting,
        benchOrder:
          typeof entry.benchOrder === "number" ? entry.benchOrder : undefined,
        isCaptain: Boolean(entry.isCaptain),
        isViceCaptain: Boolean(entry.isViceCaptain),
      });
    }

    const appUser = await findOrCreateUser(res.locals.firebaseUser);
    const selection = await setLineup(appUser.id, gameweekId, parsedEntries);
    res.status(201).json({data: selection});
  })
);

// POST /squad-selection/swap — manual, user-led substitution: swap one
// starting player for one bench player before the deadline. Convenience
// wrapper around setLineup; see squadSelection.service.ts for why.
// Body: { gameweekId, startingPlayerId, benchPlayerId }
squadSelectionRouter.post(
  "/swap",
  asyncHandler(async (req: Request, res: Response) => {
    const {gameweekId, startingPlayerId, benchPlayerId} = req.body ?? {};

    if (
      typeof gameweekId !== "number" ||
      typeof startingPlayerId !== "number" ||
      typeof benchPlayerId !== "number"
    ) {
      throw badRequest(
        "gameweekId, startingPlayerId, and benchPlayerId are all required numbers"
      );
    }

    const appUser = await findOrCreateUser(res.locals.firebaseUser);
    const selection = await swapLineupPlayers(
      appUser.id,
      gameweekId,
      startingPlayerId,
      benchPlayerId
    );
    res.status(201).json({data: selection});
  })
);
