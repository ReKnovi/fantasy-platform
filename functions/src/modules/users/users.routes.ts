import {Router, Request, Response} from "express";
import {requireFirebaseAuth} from "../../middleware/firebaseAuth";
import {changeUserRole, findOrCreateUser} from "./users.service";
import {asyncHandler} from "../../middleware/asyncHandler";
import {UserRow} from "./users.repository";
import {requireRole} from "../../middleware/roleGuard";
import {badRequest} from "../../errors/errors";

export const usersRouter = Router();

const VALID_ROLES: UserRow["role"][] = [
  "user",
  "scorer_admin",
  "roster_admin",
  "super_admin",
];

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

// PATCH /users/:id/role — super_admin only. Promotes/demotes another
// user's role. There's no self-service "become an admin" path and no
// promotion-request flow — until one exists, this is also the only way
// to create the very first admin account, which has to happen via a
// direct DB update (see the project's testing notes) before this route
// can be used at all.
usersRouter.patch(
  "/:id/role",
  requireRole("super_admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const {id} = req.params;
    const {role} = req.body ?? {};

    if (!VALID_ROLES.includes(role)) {
      throw badRequest(`role must be one of: ${VALID_ROLES.join(", ")}`);
    }

    const actingUser = res.locals.appUser as UserRow | undefined;
    if (actingUser && actingUser.id === id) {
      throw badRequest("Cannot change your own role");
    }

    const user = await changeUserRole(id, role);
    res.json({data: user});
  })
);
