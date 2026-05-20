#!/usr/bin/env node

import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const runExecFile = promisify(execFile);

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

function repoPath(relativePath) {
  return resolve(repoRoot, relativePath);
}

export const requiredStableTags = [
  "han-agent-bus-v1.0-stable",
  "han-agent-bus-v1.1-stable",
  "han-agent-bus-v1.2-stable",
  "han-agent-bus-v1.3-stable",
  "han-agent-bus-v1.4-stable",
  "han-agent-bus-v1.5-stable",
  "han-agent-bus-v1.6-stable",
  "han-agent-bus-v1.7-stable",
  "han-agent-bus-v1.8-stable",
  "han-agent-bus-v1.9-stable",
  "han-agent-bus-v2.0-stable",
  "han-agent-bus-v2.1-stable",
];

export const requiredDocuments = [
  "docs/HERMES_PREFLIGHT_TO_DRYRUN_REVIEW_SOP.md",
  "docs/HERMES_DRYRUN_RESULT_REVIEW_GATE_SOP.md",
  "docs/HERMES_APPROVED_RESULT_REVIEW_GATE_SOP.md",
  "docs/HERMES_OPERATIONAL_EVIDENCE_PACKAGE_SOP.md",
  "docs/HAN_AGENT_BUS_V2_0_RELEASE_MANIFEST.md",
];

export const requiredScripts = [
  "scripts/test-dispatch-prompt-generate.mjs",
  "scripts/test-dispatch-prompt-validate.mjs",
  "scripts/test-dispatch-preflight.mjs",
  "scripts/test-openclaw-send-task-approved.mjs",
  "scripts/test-openclaw-audit-review.mjs",
  "scripts/review-approved-audit.mjs",
  "scripts/test-release-integrity-check.mjs",
  "scripts/test-release-integrity-negative-fixtures.mjs",
];

export const requiredReadmeTools = [
  "dispatch_prompt_generate",
  "dispatch_prompt_validate",
  "dispatch_preflight",
  "openclaw_send_task_dryrun",
  "openclaw_send_task_approved",
  "openclaw_audit_review",
  "openclaw_status",
  "read_task_log",
  "codex_run",
  "release_integrity_check",
];

export const requiredEvidenceForbiddenFields = [
  "approval_phrase",
  "stdout_tail",
  "stdout",
  "credentials",
  "secrets",
  "token values",
  "raw private config",
];

async function pathExists(relativePath) {
  try {
    await access(repoPath(relativePath));
    return true;
  } catch {
    return false;
  }
}

function findMissing(requiredItems, presentItems) {
  const present = new Set(presentItems);
  return requiredItems.filter((item) => !present.has(item));
}

function findMissingText(requiredItems, text) {
  return requiredItems.filter((item) => !text.includes(item));
}

export function evaluateReleaseIntegrity(input) {
  const {
    localTags = [],
    existingDocuments = [],
    existingScripts = [],
    readmeText = "",
    evidenceSopText = "",
  } = input;

  const missingTags = findMissing(requiredStableTags, localTags);
  const missingDocuments = findMissing(requiredDocuments, existingDocuments);
  const missingScripts = findMissing(requiredScripts, existingScripts);
  const missingReadmeTools = findMissingText(requiredReadmeTools, readmeText);
  const missingForbiddenFields = findMissingText(
    requiredEvidenceForbiddenFields,
    evidenceSopText,
  );

  const pass =
    missingTags.length === 0 &&
    missingDocuments.length === 0 &&
    missingScripts.length === 0 &&
    missingReadmeTools.length === 0 &&
    missingForbiddenFields.length === 0;

  return {
    release_integrity_result: pass ? "pass" : "fail",
    checked_tags: requiredStableTags,
    missing_tags: missingTags,
    checked_documents: requiredDocuments,
    missing_documents: missingDocuments,
    checked_scripts: requiredScripts,
    missing_scripts: missingScripts,
    checked_readme_tools: requiredReadmeTools,
    missing_readme_tools: missingReadmeTools,
    checked_forbidden_fields: requiredEvidenceForbiddenFields,
    missing_forbidden_fields: missingForbiddenFields,
  };
}

export async function runReleaseIntegrityCheck() {
  const [{ stdout }, readmeText, evidenceSopText] = await Promise.all([
    runExecFile("git", ["tag", "--list"], {
      cwd: repoRoot,
      encoding: "utf8",
      windowsHide: true,
    }),
    readFile(repoPath("README.md"), "utf8"),
    readFile(repoPath("docs/HERMES_OPERATIONAL_EVIDENCE_PACKAGE_SOP.md"), "utf8"),
  ]);

  const localTags = stdout.split(/\r?\n/).filter(Boolean);
  const documentResults = await Promise.all(requiredDocuments.map(pathExists));
  const scriptResults = await Promise.all(requiredScripts.map(pathExists));
  const existingDocuments = requiredDocuments.filter((_, index) => documentResults[index]);
  const existingScripts = requiredScripts.filter((_, index) => scriptResults[index]);

  return evaluateReleaseIntegrity({
    localTags,
    existingDocuments,
    existingScripts,
    readmeText,
    evidenceSopText,
  });
}

export function getReleaseIntegrityFailureResult() {
  return {
    release_integrity_result: "fail",
    checked_tags: requiredStableTags,
    missing_tags: requiredStableTags,
    checked_documents: requiredDocuments,
    missing_documents: requiredDocuments,
    checked_scripts: requiredScripts,
    missing_scripts: requiredScripts,
    checked_readme_tools: requiredReadmeTools,
    missing_readme_tools: requiredReadmeTools,
    checked_forbidden_fields: requiredEvidenceForbiddenFields,
    missing_forbidden_fields: requiredEvidenceForbiddenFields,
  };
}

function listLine(items) {
  return items.length === 0 ? "none" : items.map((item) => `\`${item}\``).join(", ");
}

function toText(result) {
  return [
    "# Release Integrity Check",
    "",
    `Result: **${result.release_integrity_result}**`,
    "",
    `- Checked stable tags: ${result.checked_tags.length}`,
    `- Missing stable tags: ${listLine(result.missing_tags)}`,
    `- Checked SOP documents: ${result.checked_documents.length}`,
    `- Missing SOP documents: ${listLine(result.missing_documents)}`,
    `- Checked scripts: ${result.checked_scripts.length}`,
    `- Missing scripts: ${listLine(result.missing_scripts)}`,
    `- Checked README MCP tool names: ${result.checked_readme_tools.length}`,
    `- Missing README MCP tool names: ${listLine(result.missing_readme_tools)}`,
    `- Checked evidence forbidden fields: ${result.checked_forbidden_fields.length}`,
    `- Missing evidence forbidden fields: ${listLine(result.missing_forbidden_fields)}`,
  ].join("\n");
}

async function main() {
  const hasJsonFlag = process.argv.slice(2).includes("--json");
  const result = await runReleaseIntegrityCheck();

  if (hasJsonFlag) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(toText(result));
  }

  process.exitCode = result.release_integrity_result === "pass" ? 0 : 1;
}

const isCli = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;

if (isCli) {
  main().catch((error) => {
    const hasJsonFlag = process.argv.slice(2).includes("--json");
    const result = getReleaseIntegrityFailureResult();

    if (hasJsonFlag) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(toText(result));
      console.log("");
      console.log(`Error: ${error.message}`);
    }

    process.exitCode = 1;
  });
}
