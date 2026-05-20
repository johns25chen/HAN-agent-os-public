import { pathToFileURL } from 'node:url';
import path from 'node:path';

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const modulePath = pathToFileURL(
  path.join(process.cwd(), 'dist/workflows/public_dry_run.js')
).href;

const { runPublicSafeDryRun } = await import(modulePath);

const receipt = runPublicSafeDryRun({
  request_id: 'public-test-dry-run',
  target: 'openclaw',
  mode: 'mock',
  requested_action: 'status_check_preview',
  requested_by: 'public-ci'
});

assert(receipt.operation_type === 'dry_run', 'operation_type mismatch');
assert(receipt.request_id === 'public-test-dry-run', 'request_id mismatch');
assert(receipt.target === 'openclaw', 'target mismatch');
assert(receipt.mode === 'mock', 'mode mismatch');
assert(receipt.requested_action === 'status_check_preview', 'requested_action mismatch');
assert(receipt.dry_run_source === 'mock_public_fixture', 'dry_run_source mismatch');
assert(receipt.simulated_plan_available === true, 'simulated_plan_available must be true');
assert(receipt.simulated_command_mapping_available === true, 'simulated_command_mapping_available must be true');
assert(Array.isArray(receipt.simulated_plan), 'simulated_plan must be an array');
assert(receipt.simulated_plan.length >= 3, 'simulated_plan must contain useful steps');
assert(receipt.approval_required_before_live_action === true, 'approval must be required before live action');
assert(receipt.codex_required === false, 'codex_required must be false');
assert(receipt.openclaw_live_call_performed === false, 'live OpenClaw call must not occur');
assert(receipt.codex_execution_performed === false, 'Codex execution must not occur');

const falseFields = [
  'mutation_performed',
  'live_task_executed',
  'file_write_performed',
  'shell_execution_performed',
  'browser_automation_performed',
  'credential_access_performed',
  'repeated_execution_performed',
  'chained_execution_performed',
  'private_runtime_artifacts_used',
  'raw_stdout_exposed',
  'raw_stderr_exposed'
];

for (const field of falseFields) {
  assert(receipt[field] === false, `${field} must be false`);
}

assert(
  receipt.next_step.includes('Human approval required'),
  'next_step must require human approval'
);

let rejectedInvalidTarget = false;

try {
  runPublicSafeDryRun({
    target: 'codex',
    mode: 'mock',
    requested_action: 'status_check_preview'
  });
} catch {
  rejectedInvalidTarget = true;
}

assert(rejectedInvalidTarget, 'invalid target must be rejected');

let rejectedInvalidMode = false;

try {
  runPublicSafeDryRun({
    target: 'openclaw',
    mode: 'live',
    requested_action: 'status_check_preview'
  });
} catch {
  rejectedInvalidMode = true;
}

assert(rejectedInvalidMode, 'live mode must be rejected');

let rejectedInvalidAction = false;

try {
  runPublicSafeDryRun({
    target: 'openclaw',
    mode: 'mock',
    requested_action: 'execute_task'
  });
} catch {
  rejectedInvalidAction = true;
}

assert(rejectedInvalidAction, 'invalid or live-like action must be rejected');

console.log('public_dry_run_example_result: pass');
