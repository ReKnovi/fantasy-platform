#!/usr/bin/env node
import {existsSync, readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";

const failures = [];

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    failures.push(`${path}: invalid JSON (${err.message})`);
    return undefined;
  }
}

function requirePath(path) {
  if (!existsSync(path)) {
    failures.push(`${path}: missing`);
  }
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

const rootPackage = readJson("package.json");
const functionsPackage = readJson("functions/package.json");
const firebaseConfig = readJson("firebase.json");

[
  "package-lock.json",
  "functions/package-lock.json",
  ".github/workflows/ci.yml",
  ".github/workflows/deploy-firebase.yml",
  ".github/workflows/deploy-vps.yml",
  "functions/src/index.ts",
  "functions/src/app.ts",
  "functions/src/middleware/firebaseAuth.ts",
  "api/collections/fantasy-platform.postman_collection.json",
  "api/collections/fantasy-platform.hoppscotch_collection.json",
].forEach(requirePath);

readJson("api/collections/fantasy-platform.postman_collection.json");
readJson("api/collections/fantasy-platform.hoppscotch_collection.json");

assert(
  rootPackage?.scripts?.prepare === "husky",
  "package.json: expected prepare script to install Husky"
);
assert(
  Boolean(rootPackage?.["lint-staged"]),
  "package.json: expected lint-staged configuration"
);
assert(
  functionsPackage?.engines?.node === "24",
  "functions/package.json: expected Node 24 runtime"
);
assert(
  Boolean(functionsPackage?.scripts?.build),
  "functions/package.json: expected build script"
);
assert(
  firebaseConfig?.functions?.[0]?.source === "functions",
  "firebase.json: expected functions source to be functions/"
);
assert(
  firebaseConfig?.hosting?.public === "hosting",
  "firebase.json: expected hosting public directory"
);
assert(
  firebaseConfig?.emulators?.auth?.port === 9099,
  "firebase.json: expected Auth emulator on port 9099"
);

const deployFirebase = readFileSync(
  ".github/workflows/deploy-firebase.yml",
  "utf8"
);
assert(
  deployFirebase.includes("workflow_dispatch:"),
  "deploy-firebase.yml: expected manual dispatch trigger"
);
assert(
  deployFirebase.includes("# push:"),
  "deploy-firebase.yml: expected push trigger to remain commented until Firebase credentials are ready"
);

const trackedEnv = execFileSync("git", ["ls-files", ".env"], {
  encoding: "utf8",
}).trim();
assert(!trackedEnv, ".env must not be tracked");

if (existsSync("dataconnect") || existsSync("src/dataconnect-generated")) {
  failures.push("Data Connect scaffold should not exist in this project");
}

if (failures.length > 0) {
  console.error("Repository validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Repository validation passed.");
