import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";
import {app} from "./app";

// For cost control; see Firebase docs for per-function overrides.
setGlobalOptions({maxInstances: 10});

// Single HTTP function fronting an Express app. As more modules
// (auth, squads, transfers, scoring...) get built out, mount each one's
// router here the same way `playersRouter` is mounted.
export const api = onRequest(app);
