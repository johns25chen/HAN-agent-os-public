import { spawnSync } from 'node:child_process';

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function run(command, args) {
  return spawnSync(command, args, { encoding: 'utf8' });
}

function tagExists(tagName) {
  const result = run('git', ['rev-parse', '--verify', `refs/tags/${tagName}`]);
  return result.status === 0;
}

function validateRequiredTags() {
  const required = [
    'han-agent-bus-v8.3-final-pre-run-recheck',
    'han-agent-bus-v8.3-final-pre-run-recheck-verification',
    'han-agent-bus-v8.3-noop-live-ping-receipt',
    'han-agent-bus-v8.3-noop-live-ping-receipt-verification'
  ];

  for (const tag of required) {
    assert(tagExists(tag), `missing required tag: ${tag}`);
  }
}

function collectClosure() {
  validateRequiredTags();

  const receipt = run(process.execPath, ['scripts/han-agent-bus/verify-v8.3-noop-live-ping-receipt.mjs']);
  assert(receipt.status === 0, 'receipt verifier failed');

  let r;
  try {
    r = JSON.parse(receipt.stdout);
  } catch {
    throw new Error('receipt verifier did not return valid JSON');
  }

  return {
    closure_id: 'v8_3_closure_and_stable_job_20260519115852_b784842d',
    source_job_id: r.source_job_id,
    closure_status: 'v8_3_closed_stable',
    receipt_verdict: r.verdict,
    run_id: r.run_id,
    payload_text: r.payload_text,
    exit_code: r.exit_code,
    execution_count_allowed: r.execution_count_allowed,
    execution_count_performed: r.execution_count_performed,
    single_use_consumed: r.single_use_consumed,
    live_call_performed: r.live_call_performed,
    noop_ping_performed: r.noop_ping_performed,
    stderr_empty: r.stderr_empty,
    final_live_receipt_materialized: r.final_live_receipt_materialized,
    rollback_noop_record_materialized: r.rollback_noop_record_materialized,
    post_run_verification_materialized: r.post_run_verification_materialized,
    rerun_allowed: false,
    v8_3_stable_allowed: r.v8_3_stable_allowed,
    created_at: '2026-05-20T11:45:00.000Z',
    safety_boundary: 'v8.3 closure marks the already executed single no-op live ping as stable. It forbids rerun and does not execute another ping.'
  };
}

function validateClosure(c) {
  assert(c && typeof c === 'object', 'closure record is missing');
  assert(c.source_job_id === 'job_20260519115852_b784842d', 'source_job_id mismatch');
  assert(c.closure_status === 'v8_3_closed_stable', 'closure status mismatch');
  assert(c.receipt_verdict === 'PASS', 'receipt verdict must be PASS');
  assert(c.payload_text === 'HEARTBEAT_OK', 'payload must be HEARTBEAT_OK');
  assert(c.exit_code === 0, 'exit code must be 0');
  assert(c.execution_count_allowed === 1, 'execution_count_allowed must be 1');
  assert(c.execution_count_performed === 1, 'execution_count_performed must be 1');
  assert(c.single_use_consumed === true, 'single-use must be consumed');
  assert(c.live_call_performed === true, 'live call must be performed');
  assert(c.noop_ping_performed === true, 'noop ping must be performed');
  assert(c.stderr_empty === true, 'stderr must be empty');
  assert(c.final_live_receipt_materialized === true, 'final live receipt must be materialized');
  assert(c.rollback_noop_record_materialized === true, 'rollback/no-op record must be materialized');
  assert(c.post_run_verification_materialized === true, 'post-run verification must be materialized');
  assert(c.rerun_allowed === false, 'rerun must be forbidden');
  assert(c.v8_3_stable_allowed === true, 'v8.3 stable must be allowed');
  assert(String(c.safety_boundary).includes('forbids rerun'), 'safety boundary must forbid rerun');
}

function expectPass(name, fn) {
  try {
    fn();
    return { name, pass: true };
  } catch (error) {
    return { name, pass: false, error: error.message };
  }
}

function expectReject(name, fn) {
  try {
    fn();
    return { name, pass: false, error: 'expected rejection but passed' };
  } catch (error) {
    return { name, pass: true, rejected_with: error.message };
  }
}

const validClosure = collectClosure();

const checks = [
  expectPass('valid v8.3 closure passes', () => validateClosure(validClosure)),
  expectReject('missing closure is rejected', () => validateClosure(null)),
  expectReject('failed receipt verdict is rejected', () => validateClosure({ ...validClosure, receipt_verdict: 'FAIL' })),
  expectReject('wrong payload is rejected', () => validateClosure({ ...validClosure, payload_text: 'WRONG' })),
  expectReject('rerun allowed is rejected', () => validateClosure({ ...validClosure, rerun_allowed: true })),
  expectReject('execution count other than one is rejected', () => validateClosure({ ...validClosure, execution_count_performed: 2 })),
  expectReject('stable not allowed is rejected', () => validateClosure({ ...validClosure, v8_3_stable_allowed: false }))
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v8.3-closure-and-stable',
  verdict,
  ...validClosure,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
