import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = new URL('./generate-dispatch-prompt.mjs', import.meta.url);

const baseArgs = [
  '--objective',
  'Draft a read-only implementation plan.',
  '--state',
  'Repository inspected locally; no Gateway action requested.',
  '--allowed-scope',
  'README.md and scripts only.',
  '--expected-output',
  'Return changed files, commands run, and test result.',
];

const forbiddenTaskPhrases = [
  'APPROVE_OPENCLAW_SEND',
  'approval_phrase',
  'stdout_tail',
  'send external messages',
  'send messages',
  'external messages',
  'private messages',
  'outbound message',
  'outbound messages',
  'openclaw message send',
  '--deliver',
  'git push',
  'read .env',
  'read ~/.ssh',
  'read token',
  'credential',
  'secret',
];

async function runScript(args) {
  return execFileAsync('node', [scriptPath.pathname, ...args], {
    cwd: new URL('..', import.meta.url).pathname,
  });
}

const textResult = await runScript(baseArgs);

assert.match(textResult.stdout, /Hermes -> OpenClaw dry-run task/);
assert.match(textResult.stdout, /Current verified state/);
assert.match(textResult.stdout, /Task objective/);
assert.match(textResult.stdout, /Allowed scope/);
assert.match(textResult.stdout, /Expected output/);
assert.match(textResult.stdout, /Safety checklist/);
assert.match(textResult.stdout, /Do not modify files\./);
assert.match(textResult.stdout, /Do not perform outbound communication\./);
assert.doesNotMatch(textResult.stdout, /Do not send external messages\./);

const jsonResult = await runScript([...baseArgs, '--json']);
const payload = JSON.parse(jsonResult.stdout);

assert.equal(typeof payload.task, 'string');
assert.ok(Array.isArray(payload.safety_checklist));
assert.equal(payload.forbidden_fields_present, false);
assert.match(payload.task, /Current verified state/);
assert.match(payload.task, /Task objective/);
assert.match(payload.task, /Allowed scope/);
assert.match(payload.task, /Expected output/);
assert.match(payload.task, /Safety checklist/);

for (const phrase of forbiddenTaskPhrases) {
  assert.equal(
    payload.task.toLowerCase().includes(phrase.toLowerCase()),
    false,
    `normal task must not contain forbidden phrase: ${phrase}`,
  );
}

const gitPushResult = await runScript([
  '--objective',
  'Draft a plan, then git push the branch.',
  '--json',
]);
const gitPushPayload = JSON.parse(gitPushResult.stdout);

assert.equal(gitPushPayload.forbidden_fields_present, true);

const externalMessagesResult = await runScript([
  '--objective',
  'Draft a plan that mentions send external messages.',
  '--json',
]);
const externalMessagesPayload = JSON.parse(externalMessagesResult.stdout);

assert.equal(externalMessagesPayload.forbidden_fields_present, true);

const privateMessagesResult = await runScript([
  '--objective',
  'Draft a plan that mentions private messages.',
  '--json',
]);
const privateMessagesPayload = JSON.parse(privateMessagesResult.stdout);

assert.equal(privateMessagesPayload.forbidden_fields_present, true);

const scriptSource = await readFile(scriptPath, 'utf8');
const forbiddenSourcePatterns = [
  /\bwriteFile(?:Sync)?\b/,
  /\bappendFile(?:Sync)?\b/,
  /\bmkdir(?:Sync)?\b/,
  /\brm(?:Sync)?\b/,
  /\brename(?:Sync)?\b/,
  /\bcopyFile(?:Sync)?\b/,
  /from ['"]node:child_process['"]/,
  /from ['"]child_process['"]/,
  /from ['"]execa['"]/,
  /\bopenclaw_send_task_approved\b/,
  /\bopenclaw_send_task_dryrun\b/,
];

for (const pattern of forbiddenSourcePatterns) {
  assert.doesNotMatch(scriptSource, pattern);
}

console.log('All generate-dispatch-prompt tests passed.');
