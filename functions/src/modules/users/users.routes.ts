import {Router, Request, Response} from "express";
import {requireFirebaseAuth} from "../../middleware/firebaseAuth";
import {findOrCreateUser} from "./users.service";
import {asyncHandler} from "../../middleware/asyncHandler";

export const usersRouter = Router();

/**
 * GET /users/me
 *
 * The client calls this right after Google sign-in completes. Verifies the
 * ID token, ensures a `users` row exists (creating it on first sign-in),
 * and returns the app's own user profile rather than raw token contents.
 */
usersRouter.get(
  "/me",
  requireFirebaseAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await findOrCreateUser(res.locals.firebaseUser);
    res.json({data: user});
  })
);
