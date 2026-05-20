#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { releaseIntegrityCheck } from "../dist/tools/release_integrity_check.js";
import { runReleaseIntegrityCheck } from "./check-release-integrity.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

const originalCwd = process.cwd();
process.chdir("/tmp");

let result;
let scriptResult;

try {
  result = await releaseIntegrityCheck({ json: true });
  scriptResult = await runReleaseIntegrityCheck();
} finally {
  process.chdir(originalCwd);
}

assert.deepEqual(result, scriptResult);
assert.equal(result.release_integrity_result, "pass");
assert.deepEqual(result.missing_tags, []);
assert.deepEqual(result.missing_documents, []);
assert.deepEqual(result.missing_scripts, []);
assert.deepEqual(result.missing_readme_tools, []);
assert.deepEqual(result.missing_forbidden_fields, []);

const toolSource = await readFile(resolve(repoRoot, "src/tools/release_integrity_check.ts"), "utf8");
const testSource = await readFile(resolve(repoRoot, "scripts/test-release-integrity-check.mjs"), "utf8");

const blockedWriteOps = [
  "write" + "File",
  "append" + "File",
  "mk" + "dir",
  "r" + "m",
  "un" + "link",
];

for (const blocked of blockedWriteOps) {
  assert.equal(toolSource.includes(blocked), false, `tool source includes ${blocked}`);
  assert.equal(testSource.includes(blocked), false, `test source includes ${blocked}`);
}

const blockedNetworkWords = ["curl", "fetch", "ht" + "tp", "ht" + "tps", "socket", "net", "dns"];

for (const blocked of blockedNetworkWords) {
  assert.equal(toolSource.includes(blocked), false, `tool source includes ${blocked}`);
}

assert.equal(toolSource.includes("child_process"), false);
assert.equal(toolSource.includes("execFile"), false);
assert.equal(toolSource.includes("openclaw_send_task_dryrun"), false);
assert.equal(toolSource.includes("openclaw_send_task_approved"), false);

console.log("release_integrity_check MCP tool test passed");
