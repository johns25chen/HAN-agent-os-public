import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const repoRoot = new URL('..', import.meta.url);
const distToolPath = new URL('../dist/tools/dispatch_prompt_generate.js', import.meta.url);
const sourceToolPath = new URL('../src/tools/dispatch_prompt_generate.ts', import.meta.url);

const {
  dispatchPromptGenerate,
  FORBIDDEN_PHRASES,
  SAFETY_CHECKLIST,
} = await import(distToolPath.href);

const baseInput = {
  objective: 'Draft a read-only implementation plan.',
  state: 'Repository inspected locally; no Gateway action requested.',
  allowed_scope: 'README.md and scripts only.',
  expected_output: 'Return changed files, commands run, and test result.',
};

const requiredSections = [
  'Hermes -> OpenClaw dry-run task',
  'Current verified state',
  'Task objective',
  'Allowed scope',
  'Expected output',
  'Safety checklist',
];

const requiredSafetyChecklist = [
  'Do not inspect files unless allowed.',
  'Do not modify files.',
  'Do not perform outbound communication.',
  'Do not use delivery mode or external delivery flags.',
  'Do not access private config files, SSH material, authentication material, or API keys.',
  'Do not change OpenClaw Gateway state.',
  'Do not call approved execution tools.',
];

const requiredForbiddenPhrases = [
  'APPROVE_OPENCLAW_SEND',
  'approval_phrase',
  'stdout_tail',
  'openclaw message send',
  '--deliver',
  'git push',
  'read .env',
  'read ~/.ssh',
  'read token',
  'credential',
  'secret',
  'send external messages',
  'send messages',
  'external messages',
  'private messages',
  'outbound message',
  'outbound messages',
];

const payload = dispatchPromptGenerate(baseInput);

assert.equal(typeof payload.task, 'string');
assert.ok(Array.isArray(payload.safety_checklist));
assert.deepEqual(payload.safety_checklist, requiredSafetyChecklist);
assert.deepEqual(SAFETY_CHECKLIST, requiredSafetyChecklist);
assert.equal(payload.forbidden_fields_present, false);

for (const section of requiredSections) {
  assert.match(payload.task, new RegExp(escapeRegExp(section)));
}

for (const phrase of requiredForbiddenPhrases) {
  assert.ok(
    FORBIDDEN_PHRASES.includes(phrase),
    `forbidden detector must include phrase: ${phrase}`,
  );
  assert.equal(
    payload.task.toLowerCase().includes(phrase.toLowerCase()),
    false,
    `normal task must not contain forbidden phrase: ${phrase}`,
  );
}

for (const objective of [
  'Draft a plan, then git push the branch.',
  'Draft a plan that mentions send external messages.',
  'Draft a plan that mentions private messages.',
]) {
  const dangerousPayload = dispatchPromptGenerate({
    ...baseInput,
    objective,
  });

  assert.equal(
    dangerousPayload.forbidden_fields_present,
    true,
    `dangerous objective must be flagged: ${objective}`,
  );
}

const source = await readFile(sourceToolPath, 'utf8');
const forbiddenSourcePatterns = [
  /\bchild_process\b/,
  /\bexeca\b/,
  /\bwriteFile(?:Sync)?\b/,
  /\bappendFile(?:Sync)?\b/,
  /\bmkdir(?:Sync)?\b/,
  /\brm(?:Sync)?\b/,
  /\bunlink(?:Sync)?\b/,
  /\bopenclawSendTaskDryrun\b/,
  /\bopenclawSendTaskApproved\b/,
  /\bopenclaw_send_task_dryrun\b/,
  /\bopenclaw_send_task_approved\b/,
];

for (const pattern of forbiddenSourcePatterns) {
  assert.doesNotMatch(source, pattern);
}

const serverSource = await readFile(new URL('src/mcp-server.ts', repoRoot), 'utf8');
assert.match(serverSource, /dispatch_prompt_generate/);
assert.match(serverSource, /dispatchPromptGenerateInputSchema/);
assert.match(serverSource, /dispatchPromptGenerate\(input\)/);

console.log('All dispatch_prompt_generate tests passed.');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
