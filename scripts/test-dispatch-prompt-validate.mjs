import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const repoRoot = new URL('..', import.meta.url);
const distToolPath = new URL('../dist/tools/dispatch_prompt_validate.js', import.meta.url);
const sourceToolPath = new URL('../src/tools/dispatch_prompt_validate.ts', import.meta.url);
const cliValidatorPath = new URL('./validate-dispatch-prompt.mjs', import.meta.url);

const {
  dispatchPromptValidate,
  FORBIDDEN_PHRASES,
  REQUIRED_SECTIONS,
} = await import(distToolPath.href);

const requiredSections = [
  'Hermes -> OpenClaw dry-run task',
  'Current verified state',
  'Task objective',
  'Allowed scope',
  'Expected output',
  'Safety checklist',
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

assert.deepEqual(REQUIRED_SECTIONS, requiredSections);
assert.deepEqual(FORBIDDEN_PHRASES, requiredForbiddenPhrases);

const safeTask = [
  'Hermes -> OpenClaw dry-run task',
  '',
  'Current verified state',
  'Repository inspected locally; this is only a validation check.',
  '',
  'Task objective',
  'Draft a read-only implementation plan.',
  '',
  'Allowed scope',
  'README.md and scripts only.',
  '',
  'Expected output',
  'Return changed files, commands run, and test result.',
  '',
  'Safety checklist',
  '- Do not modify files.',
  '- Do not perform outbound communication.',
  '- Do not change Gateway state.',
].join('\n');

const safeResult = dispatchPromptValidate({ task: safeTask });
assert.deepEqual(safeResult, {
  validation_result: 'pass',
  required_sections_present: true,
  missing_sections: [],
  forbidden_fields_present: false,
  forbidden_matches: [],
  dryrun_ready: true,
});

const warningResult = dispatchPromptValidate({
  task: [
    'Hermes -> OpenClaw dry-run task',
    'Current verified state',
    'Allowed scope',
    'Expected output',
    'Safety checklist',
  ].join('\n'),
});
assert.equal(warningResult.validation_result, 'warn');
assert.equal(warningResult.required_sections_present, false);
assert.deepEqual(warningResult.missing_sections, ['Task objective']);
assert.equal(warningResult.forbidden_fields_present, false);
assert.deepEqual(warningResult.forbidden_matches, []);
assert.equal(warningResult.dryrun_ready, false);

for (const phrase of ['git push', 'send external messages', 'private messages']) {
  const result = dispatchPromptValidate({ task: `${safeTask}\n${phrase}` });
  assert.equal(result.validation_result, 'fail', `phrase must fail: ${phrase}`);
  assert.equal(result.forbidden_fields_present, true);
  assert.ok(result.forbidden_matches.includes(phrase));
  assert.equal(result.dryrun_ready, false);
}

const source = await readFile(sourceToolPath, 'utf8');
const cliValidatorSource = await readFile(cliValidatorPath, 'utf8');
for (const section of requiredSections) {
  assert.match(source, new RegExp(escapeRegExp(section)));
  assert.match(cliValidatorSource, new RegExp(escapeRegExp(section)));
}
for (const phrase of requiredForbiddenPhrases) {
  assert.match(source, new RegExp(escapeRegExp(phrase)));
  assert.match(cliValidatorSource, new RegExp(escapeRegExp(phrase)));
}

const serverSource = await readFile(new URL('src/mcp-server.ts', repoRoot), 'utf8');
assert.match(serverSource, /dispatch_prompt_validate/);
assert.match(serverSource, /dispatchPromptValidateInputSchema/);
assert.match(serverSource, /dispatchPromptValidate\(input\)/);

console.log('All dispatch_prompt_validate tests passed.');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
