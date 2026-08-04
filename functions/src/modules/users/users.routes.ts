import {Router, Request, Response} from "express";
import {requireFirebaseAuth} from "../../middleware/firebaseAuth";
import {findOrCreateUser} from "./users.service";

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
  async (req: Request, res: Response) => {
    try {
      const user = await findOrCreateUser(res.locals.firebaseUser);
      res.json({data: user});
    } catch (err) {
      console.error("GET /users/me failed", err);
      res.status(500).json({error: "Failed to load user profile"});
    }
  }
);
