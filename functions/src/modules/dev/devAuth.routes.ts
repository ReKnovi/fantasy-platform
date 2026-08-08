import {Router, Request, Response} from "express";
import {env} from "../../config/env";
import {asyncHandler} from "../../middleware/asyncHandler";
import {badRequest, notFound} from "../../errors/errors";

interface EmulatorAuthResponse {
  idToken?: string;
  email?: string;
  localId?: string;
  refreshToken?: string;
  expiresIn?: string;
  error?: {
    message?: string;
  };
}

const defaultEmail = "postman@example.test";
const defaultPassword = "postman-password";
const apiKey = "local-emulator";

export const devAuthRouter = Router();

const authEmulatorOrigin = (): string => {
  const host = env.firebase.authEmulatorHost;
  const normalized = host.startsWith("http") ? host : `http://${host}`;
  return normalized.replace(/\/$/, "");
};

const authRequest = async (
  endpoint: "signUp" | "signInWithPassword",
  email: string,
  password: string
): Promise<EmulatorAuthResponse> => {
  const response = await fetch(
    `${authEmulatorOrigin()}/identitytoolkit.googleapis.com/v1/` +
      `accounts:${endpoint}?key=${apiKey}`,
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    }
  );
  const data = (await response.json()) as EmulatorAuthResponse;

  if (!response.ok) {
    throw badRequest(data.error?.message ?? "Firebase Auth emulator failed");
  }

  return data;
};

/**
 * POST /dev/auth/id-token
 *
 * Local-only helper for API clients. Creates a Firebase Auth emulator user
 * when needed, signs in, and returns an ID token for protected API requests.
 */
devAuthRouter.post(
  "/id-token",
  asyncHandler(async (req: Request, res: Response) => {
    if (!env.firebase.allowDevAuthEndpoint) {
      throw notFound("Not found");
    }

    const email = String(req.body.email ?? defaultEmail);
    const password = String(req.body.password ?? defaultPassword);

    let result: EmulatorAuthResponse;
    try {
      result = await authRequest("signUp", email, password);
    } catch (err) {
      if (!(err instanceof Error) || err.message !== "EMAIL_EXISTS") {
        throw err;
      }
      result = await authRequest("signInWithPassword", email, password);
    }

    res.json({
      idToken: result.idToken,
      uid: result.localId,
      email: result.email,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    });
  })
);
