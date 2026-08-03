#!/usr/bin/env node
import {execFileSync} from "node:child_process";
import {existsSync, readFileSync, statSync} from "node:fs";

const args = new Set(process.argv.slice(2));
const stagedOnly = args.has("--staged");
const allFiles = args.has("--all");
const secretsOnly = args.has("--secrets-only");
const maxBytes = 10 * 1024 * 1024;

const ignoredPrefixes = [
  ".git/",
  ".firebase/",
  "node_modules/",
  "functions/node_modules/",
  "functions/lib/",
];

// Files that define secret patterns rather than contain actual secrets.
const secretScanExclusions = new Set(["scripts/check-staged.mjs"]);

const textExtensions = new Set([
  ".cjs",
  ".css",
  ".env",
  ".gql",
  ".html",
  ".js",
  ".json",
  ".lock",
  ".md",
  ".mjs",
  ".sql",
  ".ts",
  ".txt",
  ".yaml",
  ".yml",
]);

const secretPatterns = [
  {
    name: "private key",
    regex: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/,
  },
  {
    name: "GitHub token",
    regex: /gh[pousr]_[A-Za-z0-9_]{30,}/,
  },
  {
    name: "Google OAuth access token",
    regex: /ya29\.[A-Za-z0-9_\-.]+/,
  },
  {
    name: "Slack token",
    regex: /xox[baprs]-[A-Za-z0-9-]{20,}/,
  },
  {
    name: "Stripe secret key",
    regex: /sk_(?:live|test)_[A-Za-z0-9]{20,}/,
  },
  {
    name: "AWS access key",
    regex: /AKIA[0-9A-Z]{16}/,
  },
  {
    name: "Firebase service account private key",
    regex: /"private_key"\s*:\s*"-----BEGIN PRIVATE KEY-----/,
  },
  {
    name: "credential assignment",
    regex:
      /\b(?:password|passwd|secret|token|api[_-]?key|client[_-]?secret|private[_-]?key)\b\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{24,}/i,
  },
];

function git(args) {
  return execFileSync("git", args, {encoding: "utf8"});
}

function selectedFiles() {
  if (stagedOnly) {
    const output = git([
      "diff",
      "--cached",
      "--name-only",
      "--diff-filter=ACMR",
      "-z",
    ]);
    return output.split("\0").filter(Boolean);
  }

  if (allFiles) {
    const output = git(["ls-files", "-z"]);
    return output.split("\0").filter(Boolean);
  }

  throw new Error("Expected --staged or --all");
}

function isIgnored(file) {
  return ignoredPrefixes.some((prefix) => file.startsWith(prefix));
}

function isTextFile(file, buffer) {
  const lower = file.toLowerCase();
  const extension = lower.includes(".")
    ? lower.slice(lower.lastIndexOf("."))
    : "";
  if (textExtensions.has(extension)) {
    return true;
  }
  return !buffer.subarray(0, 8000).includes(0);
}

function checkConflictMarkers(file, content, failures) {
  const marker = /^(<<<<<<<|=======|>>>>>>>)(?: .*)?$/m;
  if (marker.test(content)) {
    failures.push(`${file}: contains merge conflict markers`);
  }
}

function checkSecrets(file, content, failures) {
  for (const pattern of secretPatterns) {
    if (pattern.regex.test(content)) {
      failures.push(`${file}: possible secret detected (${pattern.name})`);
    }
  }
}

const failures = [];

for (const file of selectedFiles()) {
  if (isIgnored(file) || !existsSync(file)) {
    continue;
  }

  const stats = statSync(file);
  if (!secretsOnly && stats.size > maxBytes) {
    failures.push(`${file}: file is larger than 10MB`);
    continue;
  }

  const buffer = readFileSync(file);
  if (!isTextFile(file, buffer)) {
    continue;
  }

  const content = buffer.toString("utf8");
  if (!secretsOnly) {
    checkConflictMarkers(file, content, failures);
  }
  if (!secretScanExclusions.has(file)) {
    checkSecrets(file, content, failures);
  }
}

if (failures.length > 0) {
  console.error("Repository safety checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Repository safety checks passed.");
