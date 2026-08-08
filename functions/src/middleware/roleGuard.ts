import {NextFunction, Request, Response} from "express";
import {findOrCreateUser} from "../modules/users/users.service";
import {UserRow} from "../modules/users/users.repository";
import {forbidden, unauthorized} from "../errors/errors";

/**
 * Requires the authenticated user's role to be one of the allowed roles.
 * Must run after requireFirebaseAuth. Resolves the authenticated Firebase
 * user to an application user and stores it in res.locals.appUser.
 */
export function requireRole(...allowedRoles: UserRow["role"][]) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const firebaseUser = res.locals.firebaseUser;

    if (!firebaseUser) {
      next(unauthorized("Missing authenticated user"));
      return;
    }

    try {
      const appUser = await findOrCreateUser(firebaseUser);

      if (!allowedRoles.includes(appUser.role)) {
        next(forbidden("Insufficient role"));
        return;
      }

      res.locals.appUser = appUser;
      next();
    } catch (err) {
      next(err);
    }
  };
}
