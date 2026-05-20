#!/usr/bin/env node

import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

const steps = [
  {
    name: "release_integrity_check_text",
    args: ["scripts/check-release-integrity.mjs"],
  },
  {
    name: "release_integrity_check_json",
    args: ["scripts/check-release-integrity.mjs", "--json"],
  },
  {
    name: "release_integrity_check_tool_test",
    args: ["scripts/test-release-integrity-check.mjs"],
  },
  {
    name: "release_integrity_negative_fixtures",
    args: ["scripts/test-release-integrity-negative-fixtures.mjs"],
  },
];

function runStep(step) {
  return new Promise((resolveStep) => {
    console.log(`step: ${step.name}`);
    console.log(`status: running`);

    const child = spawn(process.execPath, step.args, {
      cwd: repoRoot,
      stdio: ["ignore", "inherit", "inherit"],
    });

    child.on("error", (error) => {
      console.log(`status: fail`);
      console.log(`error: ${error.message}`);
      resolveStep(false);
    });

    child.on("close", (code) => {
      const passed = code === 0;
      console.log(`status: ${passed ? "pass" : "fail"}`);
      resolveStep(passed);
    });
  });
}

const failedSteps = [];

for (const step of steps) {
  const passed = await runStep(step);

  if (!passed) {
    failedSteps.push(step.name);
  }
}

const suitePassed = failedSteps.length === 0;

console.log(`release_integrity_suite_result: ${suitePassed ? "pass" : "fail"}`);
console.log(`failed_steps: ${JSON.stringify(failedSteps)}`);

process.exitCode = suitePassed ? 0 : 1;
