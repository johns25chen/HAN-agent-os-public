import { pathToFileURL } from 'node:url';
import path from 'node:path';

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const modulePath = pathToFileURL(
  path.join(process.cwd(), 'dist/workflows/public_status_read.js')
).href;

const { runPublicSafeStatusRead } = await import(modulePath);

const receipt = runPublicSafeStatusRead({
  request_id: 'public-test-status-read',
  target: 'openclaw',
  mode: 'mock',
  requested_by: 'public-ci'
});

assert(receipt.operation_type === 'status_read', 'operation_type mismatch');
assert(receipt.request_id === 'public-test-status-read', 'request_id mismatch');
assert(receipt.target === 'openclaw', 'target mismatch');
assert(receipt.mode === 'mock', 'mode mismatch');
assert(receipt.status_source === 'mock_public_fixture', 'status_source mismatch');
assert(receipt.status_available === true, 'status_available should be true');
assert(receipt.codex_required === false, 'codex_required must be false');
assert(receipt.openclaw_live_call_performed === false, 'live OpenClaw call must not occur');

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
  receipt.next_step.includes('Human decision required'),
  'next_step must require human decision'
);

let rejectedInvalidTarget = false;

try {
  runPublicSafeStatusRead({
    target: 'codex',
    mode: 'mock'
  });
} catch {
  rejectedInvalidTarget = true;
}

assert(rejectedInvalidTarget, 'invalid target must be rejected');

let rejectedInvalidMode = false;

try {
  runPublicSafeStatusRead({
    target: 'openclaw',
    mode: 'live'
  });
} catch {
  rejectedInvalidMode = true;
}

assert(rejectedInvalidMode, 'live mode must be rejected');

console.log('public_status_read_example_result: pass');
