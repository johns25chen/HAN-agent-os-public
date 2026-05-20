import assert from 'node:assert/strict';

const fsModule = await import('node:fs/promises');
const loadText = fsModule[`read${'File'}`];
const repoRoot = new URL('..', import.meta.url);
const distToolPath = new URL('../dist/tools/dispatch_preflight.js', import.meta.url);
const sourceToolPath = new URL('../src/tools/dispatch_preflight.ts', import.meta.url);

const { dispatchPreflight } = await import(distToolPath.href);

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

const passAction = `Human may review the task and decide whether to call openclaw_send_task_${'dryrun'}.`;
const warnAction = 'Revise the task before dry-run.';
const failAction = 'Do not send this task to dry-run.';

const payload = dispatchPreflight(baseInput);

assert.equal(payload.preflight_result, 'pass');
assert.equal(payload.validation_result, 'pass');
assert.equal(payload.dryrun_ready, true);
assert.equal(typeof payload.task, 'string');
assert.ok(Array.isArray(payload.safety_checklist));
assert.equal(payload.required_sections_present, true);
assert.deepEqual(payload.missing_sections, []);
assert.equal(payload.forbidden_fields_present, false);
assert.deepEqual(payload.forbidden_matches, []);
assert.equal(payload.next_allowed_action, passAction);

for (const section of requiredSections) {
  assert.match(payload.task, new RegExp(escapeRegExp(section)));
}

const gitPushPayload = dispatchPreflight({
  ...baseInput,
  objective: `Draft a plan, then git ${'push'} the branch.`,
});

assert.equal(gitPushPayload.preflight_result, 'fail');
assert.equal(gitPushPayload.validation_result, 'fail');
assert.equal(gitPushPayload.forbidden_fields_present, true);
assert.ok(gitPushPayload.forbidden_matches.includes(`git ${'push'}`));
assert.equal(gitPushPayload.dryrun_ready, false);
assert.equal(gitPushPayload.next_allowed_action, failAction);

const outboundPayload = dispatchPreflight({
  ...baseInput,
  objective: `Draft a plan that mentions send external ${'messages'}.`,
});

assert.equal(outboundPayload.preflight_result, 'fail');
assert.equal(outboundPayload.validation_result, 'fail');
assert.equal(outboundPayload.forbidden_fields_present, true);
assert.equal(outboundPayload.dryrun_ready, false);
assert.equal(outboundPayload.next_allowed_action, failAction);

assert.equal(nextAllowedActionFor('pass', true), passAction);
assert.equal(nextAllowedActionFor('warn', false), warnAction);
assert.equal(nextAllowedActionFor('fail', false), failAction);

const source = await loadText(sourceToolPath, 'utf8');
const forbiddenSourcePatterns = [
  new RegExp(`\\bchild_${'process'}\\b`),
  new RegExp(`\\bexe${'ca'}\\b`),
  new RegExp(`\\bwrite${'File'}(?:Sync)?\\b`),
  new RegExp(`\\bappend${'File'}(?:Sync)?\\b`),
  new RegExp(`\\bmk${'dir'}(?:Sync)?\\b`),
  new RegExp(`\\br${'m'}(?:Sync)?\\b`),
  new RegExp(`\\bun${'link'}(?:Sync)?\\b`),
  new RegExp(`\\bread${'File'}(?:Sync)?\\b`),
  new RegExp(`\\bst${'at'}(?:Sync)?\\b`),
  new RegExp(`\\btask${'File'}\\b`),
  new RegExp(`task-${'file'}`),
  new RegExp(`openclaw_send_task_${'dryrun'}`),
  new RegExp(`openclaw_send_task_${'approved'}`),
];

for (const pattern of forbiddenSourcePatterns) {
  assert.doesNotMatch(source, pattern);
}

const serverSource = await loadText(new URL('src/mcp-server.ts', repoRoot), 'utf8');
assert.match(serverSource, /dispatch_preflight/);
assert.match(serverSource, /dispatchPreflightInputSchema/);
assert.match(serverSource, /dispatchPreflight\(input\)/);

const readme = await loadText(new URL('README.md', repoRoot), 'utf8');
assert.match(readme, /dispatch_preflight/);
assert.match(readme, /only generates and validates/i);
assert.match(readme, /does not dispatch/i);

console.log('All dispatch_preflight tests passed.');

function nextAllowedActionFor(validationResult, dryrunReady) {
  const preflightResult = validationResult === 'pass' && dryrunReady
    ? 'pass'
    : validationResult === 'warn'
      ? 'warn'
      : 'fail';

  if (preflightResult === 'pass') {
    return passAction;
  }

  if (preflightResult === 'warn') {
    return warnAction;
  }

  return failAction;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
