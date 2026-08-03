import {NextFunction, Request, Response} from "express";
import {getAuth} from "firebase-admin/auth";
import {getApps, initializeApp} from "firebase-admin/app";
import {env} from "../config/env";

if (getApps().length === 0) {
  initializeApp({projectId: env.firebase.projectId});
}

const bearerPrefix = "Bearer ";

/**
 * Requires a valid Firebase Auth ID token in the Authorization header.
 * @param {Request} req Express request.
 * @param {Response} res Express response.
 * @param {NextFunction} next Express next function.
 * @return {Promise<void>} Resolves when auth handling is complete.
 */
export async function requireFirebaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authorization = req.header("authorization") ?? "";

  if (!authorization.startsWith(bearerPrefix)) {
    res.status(401).json({error: "Missing Firebase ID token"});
    return;
  }

  const token = authorization.slice(bearerPrefix.length).trim();
  if (!token) {
    res.status(401).json({error: "Missing Firebase ID token"});
    return;
  }

  try {
    res.locals.firebaseUser = await getAuth().verifyIdToken(token);
    next();
  } catch (err) {
    console.error("Firebase auth verification failed", err);
    res.status(401).json({error: "Invalid Firebase ID token"});
  }
}
