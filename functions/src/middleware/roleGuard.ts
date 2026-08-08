import {NextFunction, Request, Response} from "express";
import {findOrCreateUser} from "../modules/users/users.service";
import {UserRow} from "../modules/users/users.repository";

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
      // Guards against mounting requireRole without requireFirebaseAuth
      // ahead of it — fail closed rather than silently allowing through.
      res.status(401).json({error: "Missing authenticated user"});
      return;
    }

    try {
      const appUser = await findOrCreateUser(firebaseUser);

      if (!allowedRoles.includes(appUser.role)) {
        res.status(403).json({error: "Insufficient role"});
        return;
      }

      res.locals.appUser = appUser;
      next();
    } catch (err) {
      console.error("Role check failed", err);
      res.status(500).json({error: "Failed to verify role"});
    }
  };
}
