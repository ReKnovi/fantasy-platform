import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";
import {defineSecret} from "firebase-functions/params";
import {app} from "./app";

// For cost control; see Firebase docs for per-function overrides.
setGlobalOptions({maxInstances: 10});

// Backed by Google Secret Manager — set with `firebase functions:secrets:set
// NAME` (see docs/cloud-sql.md, step 4). Declaring them here is what
// actually injects them into process.env at runtime; creating the secret
// alone does not. Harmless locally/in the emulator — nothing here touches
// Secret Manager until the function is actually deployed.
const instanceConnectionName = defineSecret("INSTANCE_CONNECTION_NAME");
const dbUser = defineSecret("DB_USER");
const dbPassword = defineSecret("DB_PASSWORD");
const dbName = defineSecret("DB_NAME");

// Single HTTP function fronting an Express app. As more modules
// (auth, squads, transfers, scoring...) get built out, mount each one's
// router here the same way `playersRouter` is mounted.
export const api = onRequest(
  {secrets: [instanceConnectionName, dbUser, dbPassword, dbName]},
  app
);