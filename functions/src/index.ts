import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/https";
import express from "express";
import cors from "cors";
import { playersRouter } from "./modules/players/players.routes";

// For cost control — see firebase-functions docs for per-function overrides.
setGlobalOptions({ maxInstances: 10 });

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Quick liveness check — hits no DB, just confirms the function is up.
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/players", playersRouter);

// Single HTTP function fronting an Express app. As more modules
// (auth, squads, transfers, scoring...) get built out, mount each one's
// router here the same way `playersRouter` is mounted.
export const api = onRequest(app);
