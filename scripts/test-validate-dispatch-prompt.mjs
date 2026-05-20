import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = new URL('./validate-dispatch-prompt.mjs', import.meta.url);
const repoRoot = new URL('..', import.meta.url).pathname;

const safeTask = [
  'Hermes -> OpenClaw dry-run task',
  '',
  'Current verified state',
  'Repository inspected locally; no Gateway action requested.',
  '',
  'Task objective',
  'Draft a local read-only implementation plan.',
  '',
  'Allowed scope',
  'Use only the context provided in this task text.',
  '',
  'Expected output',
  'Return changed files, commands run, and test result.',
  '',
  'Safety checklist',
  '- Do not inspect files unless allowed.',
  '- Do not modify files.',
  '- Do not perform outbound communication.',
  '- Do not use delivery mode or external delivery flags.',
  '- Do not access private config files, SSH material, authentication material, or API keys.',
  '- Do not change OpenClaw Gateway state.',
  '- Do not call approved execution tools.',
].join('\n');

async function runScript(args) {
  const result = await execFileAsync('node', [scriptPath.pathname, ...args], {
    cwd: repoRoot,
  });

  return result.stdout;
}

async function runScriptFailure(args) {
  try {
    await execFileAsync('node', [scriptPath.pathname, ...args], {
      cwd: repoRoot,
    });
  } catch (error) {
    return error;
  }

  throw new Error(`Expected script to fail for args: ${args.join(' ')}`);
}

async function runJson(args) {
  return JSON.parse(await runScript([...args, '--json']));
}

const passPayload = await runJson(['--task', safeTask]);
assert.equal(passPayload.validation_result, 'pass');
assert.equal(passPayload.required_sections_present, true);
assert.deepEqual(passPayload.missing_sections, []);
assert.equal(passPayload.forbidden_fields_present, false);
assert.deepEqual(passPayload.forbidden_matches, []);
assert.equal(passPayload.dryrun_ready, true);

const markdown = await runScript(['--task', safeTask]);
assert.match(markdown, /# Dispatch Prompt Validation/);
assert.match(markdown, /validation_result: pass/);
assert.match(markdown, /dryrun_ready: true/);

const missingSectionPayload = await runJson([
  '--task',
  safeTask.replace('Allowed scope\nUse only the context provided in this task text.\n\n', ''),
]);
assert.equal(missingSectionPayload.validation_result, 'warn');
assert.equal(missingSectionPayload.required_sections_present, false);
assert.deepEqual(missingSectionPayload.missing_sections, ['Allowed scope']);
assert.equal(missingSectionPayload.forbidden_fields_present, false);
assert.equal(missingSectionPayload.dryrun_ready, false);

const gitPushPayload = await runJson([
  '--task',
  `${safeTask}\n\nDo not run git push.`,
]);
assert.equal(gitPushPayload.validation_result, 'fail');
assert.equal(gitPushPayload.forbidden_fields_present, true);
assert.deepEqual(gitPushPayload.forbidden_matches, ['git push']);
assert.equal(gitPushPayload.dryrun_ready, false);

const externalMessagesPayload = await runJson([
  '--task',
  `${safeTask}\n\nDo not send external messages.`,
]);
assert.equal(externalMessagesPayload.validation_result, 'fail');
assert.equal(externalMessagesPayload.forbidden_fields_present, true);
assert.ok(externalMessagesPayload.forbidden_matches.includes('send external messages'));
assert.equal(externalMessagesPayload.dryrun_ready, false);

const privateMessagesPayload = await runJson([
  '--task',
  `${safeTask}\n\nDo not send private messages.`,
]);
assert.equal(privateMessagesPayload.validation_result, 'fail');
assert.equal(privateMessagesPayload.forbidden_fields_present, true);
assert.ok(privateMessagesPayload.forbidden_matches.includes('private messages'));
assert.equal(privateMessagesPayload.dryrun_ready, false);

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'han-agent-bus-dispatch-validator-'));
const taskFile = path.join(tempDir, 'task.txt');
await writeFile(taskFile, safeTask, 'utf8');

const filePayload = await runJson(['--task-file', taskFile]);
assert.equal(filePayload.validation_result, 'pass');
assert.equal(filePayload.dryrun_ready, true);

const envTaskFile = path.join(tempDir, '.env');
await writeFile(envTaskFile, safeTask, 'utf8');
const envFailure = await runScriptFailure(['--task-file', envTaskFile]);
assert.equal(envFailure.code, 1);
assert.match(envFailure.stderr, /Refusing to read sensitive task-file path\./);

const tokenTaskFile = path.join(tempDir, 'handoff-token-task.txt');
await writeFile(tokenTaskFile, safeTask, 'utf8');
const tokenFailure = await runScriptFailure(['--task-file', tokenTaskFile]);
assert.equal(tokenFailure.code, 1);
assert.match(tokenFailure.stderr, /Refusing to read sensitive task-file path\./);

const largeTaskFile = path.join(tempDir, 'large-task.txt');
await writeFile(largeTaskFile, `${safeTask}\n${'A'.repeat(256 * 1024)}`, 'utf8');
const largeFailure = await runScriptFailure(['--task-file', largeTaskFile]);
assert.equal(largeFailure.code, 1);
assert.match(largeFailure.stderr, /Task file is too large\./);

const scriptSource = await readFile(scriptPath, 'utf8');
const forbiddenSourcePatterns = [
  /\bchild_process\b/,
  /\bexeca\b/,
  /\bwriteFile(?:Sync)?\b/,
  /\bappendFile(?:Sync)?\b/,
  /\bmkdir(?:Sync)?\b/,
  /\brm(?:Sync)?\b/,
  /\bunlink(?:Sync)?\b/,
  /\bopenclaw_send_task_dryrun\b/,
  /\bopenclaw_send_task_approved\b/,
];

for (const pattern of forbiddenSourcePatterns) {
  assert.doesNotMatch(scriptSource, pattern);
}

console.log('All validate-dispatch-prompt tests passed.');
