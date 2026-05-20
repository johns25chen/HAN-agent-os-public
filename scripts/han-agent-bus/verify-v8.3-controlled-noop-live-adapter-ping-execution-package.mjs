import { spawnSync } from 'node:child_process';

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function tagExists(tagName) {
  const result = spawnSync('git', ['rev-parse', '--verify', `refs/tags/${tagName}`], { encoding: 'utf8' });
  return result.status === 0;
}

function validateBaselineTags() {
  assert(tagExists('han-agent-bus-v8.2-stable'), 'missing v8.2 stable tag');
  assert(tagExists('han-agent-bus-v8.3-final-operator-approval-record'), 'missing v8.3 final approval record tag');
  assert(tagExists('han-agent-bus-v8.3-final-operator-approval-record-verification'), 'missing v8.3 final approval record verification tag');
}

function runApprovalVerifier() {
  const result = spawnSync(
    process.execPath,
    ['scripts/han-agent-bus/verify-v8.3-final-operator-approval-record.mjs'],
    { encoding: 'utf8' }
  );

  if (result.status !== 0) {
    throw new Error(`v8.3 approval record verifier failed: ${result.stderr || result.stdout}`);
  }

  return JSON.parse(result.stdout);
}

function validateApprovalResult(approval) {
  assert(approval && typeof approval === 'object', 'approval result is missing');
  assert(approval.verdict === 'PASS', 'approval verifier result must be PASS');
  assert(approval.source_job_id === 'job_20260519115852_b784842d', 'approval source_job_id mismatch');
  assert(approval.selected_pilot_task_class === 'noop_live_adapter_ping_only', 'approval task class mismatch');
  assert(approval.operation_type === 'no_op_ping', 'approval operation type mismatch');
  assert(approval.target === 'openclaw', 'approval target mismatch');
  assert(approval.agent === 'planner', 'approval agent mismatch');
  assert(approval.live_tool === 'openclaw_send_task_live', 'approval live tool mismatch');
  assert(approval.execution_count === 1, 'approval execution count must be one');
  assert(approval.approval_scope_exact === true, 'approval scope must be exact');
  assert(approval.approval_scope_wildcard_allowed === false, 'wildcard approval scope must be false');
  assert(approval.single_use_approval === true, 'approval must be single-use');
  assert(approval.approval_consumed === false, 'approval must not already be consumed');
  assert(approval.execution_authorized_for_future_package === true, 'future package authorization must be true');
  assert(approval.live_call_performed === false, 'approval record must not have live call');
  assert(approval.noop_ping_performed === false, 'approval record must not have no-op ping');
  assert(approval.no_live_execution_tool_called === true, 'approval record must not call live tool');
}

function createPackage(approval, overrides = {}) {
  validateBaselineTags();
  validateApprovalResult(approval);

  const base = 'jobs/job_20260519115852_b784842d/han-agent-bus/v8.3/noop-live-adapter-ping';

  const pkg = {
    execution_package_id: 'controlled_noop_live_ping_package_job_20260519115852_b784842d_v8_3',
    source_job_id: approval.source_job_id,
    source_v8_2_stable_tag: 'han-agent-bus-v8.2-stable',
    source_v8_3_approval_record_tag: 'han-agent-bus-v8.3-final-operator-approval-record',
    source_v8_3_approval_record_verification_tag: 'han-agent-bus-v8.3-final-operator-approval-record-verification',
    approval_record_id: approval.approval_record_id,
    package_mode: 'controlled_noop_live_ping_execution_package_only',
    package_status: 'ready_for_single_operator_run',
    selected_pilot_task_class: approval.selected_pilot_task_class,
    operation_type: approval.operation_type,
    target: approval.target,
    agent: approval.agent,
    live_tool: approval.live_tool,
    exact_scope_enforced: true,
    single_use_lock_active: true,
    execution_count_allowed: 1,
    execution_count_performed: 0,
    execution_authorized_for_single_future_run: true,
    approval_consumed: false,
    live_call_performed: false,
    noop_ping_performed: false,
    pending_receipt_envelope_allocated: true,
    pending_receipt_path: `${base}/pending-receipt.json`,
    final_live_receipt_materialized: false,
    stdout_path_allocated: true,
    stdout_path: `${base}/stdout.txt`,
    stdout_output_present: false,
    stderr_path_allocated: true,
    stderr_path: `${base}/stderr.txt`,
    stderr_output_present: false,
    artifact_paths_allocated: true,
    artifact_paths: [],
    rollback_noop_record_allocated: true,
    rollback_noop_record_path: `${base}/rollback-noop-record.json`,
    rollback_noop_record_executed: false,
    post_run_verification_allocated: true,
    post_run_verification_path: `${base}/post-run-verification.json`,
    post_run_verification_executed: false,
    credential_persistence_allowed: false,
    browser_session_persistence_allowed: false,
    cookie_persistence_allowed: false,
    api_key_persistence_allowed: false,
    repeated_execution_allowed: false,
    chained_execution_allowed: false,
    autonomous_execution_allowed: false,
    created_at: '2026-05-20T09:45:00.000Z',
    safety_boundary: 'v8.3 execution package prepares exactly one future no-op live adapter ping only. It does not perform the ping, call live tools, fake a final live receipt, consume approval, or persist credentials.'
  };

  return { ...pkg, ...overrides };
}

function validatePackage(pkg, approval) {
  assert(pkg && typeof pkg === 'object', 'execution package is missing');
  assert(pkg.source_job_id === 'job_20260519115852_b784842d', 'source_job_id mismatch');
  assert(pkg.approval_record_id === approval.approval_record_id, 'approval record id mismatch');
  assert(pkg.source_v8_2_stable_tag === 'han-agent-bus-v8.2-stable', 'v8.2 stable tag mismatch');
  assert(pkg.source_v8_3_approval_record_tag === 'han-agent-bus-v8.3-final-operator-approval-record', 'approval record tag mismatch');
  assert(pkg.source_v8_3_approval_record_verification_tag === 'han-agent-bus-v8.3-final-operator-approval-record-verification', 'approval record verification tag mismatch');
  assert(pkg.package_mode === 'controlled_noop_live_ping_execution_package_only', 'package mode mismatch');
  assert(pkg.package_status === 'ready_for_single_operator_run', 'package status mismatch');
  assert(pkg.selected_pilot_task_class === 'noop_live_adapter_ping_only', 'task class mismatch');
  assert(pkg.operation_type === 'no_op_ping', 'operation type mismatch');
  assert(pkg.target === 'openclaw', 'target mismatch');
  assert(pkg.agent === 'planner', 'agent mismatch');
  assert(pkg.live_tool === 'openclaw_send_task_live', 'live tool mismatch');
  assert(pkg.exact_scope_enforced === true, 'exact scope must be enforced');
  assert(pkg.single_use_lock_active === true, 'single-use lock must be active');
  assert(pkg.execution_count_allowed === 1, 'execution_count_allowed must be 1');
  assert(pkg.execution_count_performed === 0, 'execution_count_performed must be 0 before live ping');
  assert(pkg.execution_authorized_for_single_future_run === true, 'single future run authorization must be true');
  assert(pkg.approval_consumed === false, 'approval must not be consumed by package');
  assert(pkg.live_call_performed === false, 'live_call_performed must remain false in package');
  assert(pkg.noop_ping_performed === false, 'noop_ping_performed must remain false in package');
  assert(pkg.pending_receipt_envelope_allocated === true, 'pending receipt envelope must be allocated');
  assert(typeof pkg.pending_receipt_path === 'string' && pkg.pending_receipt_path.includes('pending-receipt.json'), 'pending receipt path invalid');
  assert(pkg.final_live_receipt_materialized === false, 'final live receipt must not be materialized before live ping');
  assert(pkg.stdout_path_allocated === true, 'stdout path must be allocated');
  assert(pkg.stdout_output_present === false, 'stdout output must not be present before live ping');
  assert(pkg.stderr_path_allocated === true, 'stderr path must be allocated');
  assert(pkg.stderr_output_present === false, 'stderr output must not be present before live ping');
  assert(pkg.artifact_paths_allocated === true, 'artifact paths allocation must be declared');
  assert(Array.isArray(pkg.artifact_paths), 'artifact_paths must be an array');
  assert(pkg.rollback_noop_record_allocated === true, 'rollback/no-op record must be allocated');
  assert(pkg.rollback_noop_record_executed === false, 'rollback/no-op record must not be executed before live ping');
  assert(pkg.post_run_verification_allocated === true, 'post-run verification must be allocated');
  assert(pkg.post_run_verification_executed === false, 'post-run verification must not execute before live ping');
  assert(pkg.credential_persistence_allowed === false, 'credential persistence must be false');
  assert(pkg.browser_session_persistence_allowed === false, 'browser session persistence must be false');
  assert(pkg.cookie_persistence_allowed === false, 'cookie persistence must be false');
  assert(pkg.api_key_persistence_allowed === false, 'API key persistence must be false');
  assert(pkg.repeated_execution_allowed === false, 'repeated execution must be false');
  assert(pkg.chained_execution_allowed === false, 'chained execution must be false');
  assert(pkg.autonomous_execution_allowed === false, 'autonomous execution must be false');
  assert(String(pkg.safety_boundary).includes('does not perform the ping'), 'safety boundary must deny ping');
  assert(String(pkg.safety_boundary).includes('call live tools'), 'safety boundary must deny live tools');
  assert(String(pkg.safety_boundary).includes('fake a final live receipt'), 'safety boundary must deny fake receipt');
  assert(String(pkg.safety_boundary).includes('consume approval'), 'safety boundary must deny approval consumption');
  assert(String(pkg.safety_boundary).includes('persist credentials'), 'safety boundary must deny credentials');
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

const approval = runApprovalVerifier();
const validPackage = createPackage(approval);

const checks = [
  expectPass('valid v8.3 controlled no-op live adapter ping execution package passes', () => {
    validatePackage(validPackage, approval);
  }),
  expectReject('missing approval result is rejected', () => {
    createPackage(null);
  }),
  expectReject('failed approval verifier result is rejected', () => {
    createPackage({ ...approval, verdict: 'FAIL' });
  }),
  expectReject('consumed approval is rejected', () => {
    createPackage({ ...approval, approval_consumed: true });
  }),
  expectReject('wrong target is rejected', () => {
    createPackage({ ...approval, target: 'shell' });
  }),
  expectReject('wrong agent is rejected', () => {
    createPackage({ ...approval, agent: 'executor' });
  }),
  expectReject('wrong live tool is rejected', () => {
    createPackage({ ...approval, live_tool: 'shell_exec' });
  }),
  expectReject('execution_count_performed above zero is rejected', () => {
    validatePackage(createPackage(approval, { execution_count_performed: 1 }), approval);
  }),
  expectReject('live_call_performed=true is rejected', () => {
    validatePackage(createPackage(approval, { live_call_performed: true }), approval);
  }),
  expectReject('noop_ping_performed=true is rejected', () => {
    validatePackage(createPackage(approval, { noop_ping_performed: true }), approval);
  }),
  expectReject('final live receipt materialized before ping is rejected', () => {
    validatePackage(createPackage(approval, { final_live_receipt_materialized: true }), approval);
  }),
  expectReject('stdout output present before ping is rejected', () => {
    validatePackage(createPackage(approval, { stdout_output_present: true }), approval);
  }),
  expectReject('stderr output present before ping is rejected', () => {
    validatePackage(createPackage(approval, { stderr_output_present: true }), approval);
  }),
  expectReject('missing pending receipt allocation is rejected', () => {
    validatePackage(createPackage(approval, { pending_receipt_envelope_allocated: false }), approval);
  }),
  expectReject('approval consumed by package is rejected', () => {
    validatePackage(createPackage(approval, { approval_consumed: true }), approval);
  }),
  expectReject('credential persistence allowed is rejected', () => {
    validatePackage(createPackage(approval, { credential_persistence_allowed: true }), approval);
  }),
  expectReject('browser session persistence allowed is rejected', () => {
    validatePackage(createPackage(approval, { browser_session_persistence_allowed: true }), approval);
  }),
  expectReject('cookie persistence allowed is rejected', () => {
    validatePackage(createPackage(approval, { cookie_persistence_allowed: true }), approval);
  }),
  expectReject('API key persistence allowed is rejected', () => {
    validatePackage(createPackage(approval, { api_key_persistence_allowed: true }), approval);
  }),
  expectReject('repeated execution allowed is rejected', () => {
    validatePackage(createPackage(approval, { repeated_execution_allowed: true }), approval);
  }),
  expectReject('chained execution allowed is rejected', () => {
    validatePackage(createPackage(approval, { chained_execution_allowed: true }), approval);
  }),
  expectReject('autonomous execution allowed is rejected', () => {
    validatePackage(createPackage(approval, { autonomous_execution_allowed: true }), approval);
  })
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v8.3-execution-package',
  verdict,
  source_job_id: validPackage.source_job_id,
  execution_package_id: validPackage.execution_package_id,
  package_mode: validPackage.package_mode,
  package_status: validPackage.package_status,
  selected_pilot_task_class: validPackage.selected_pilot_task_class,
  operation_type: validPackage.operation_type,
  target: validPackage.target,
  agent: validPackage.agent,
  live_tool: validPackage.live_tool,
  exact_scope_enforced: validPackage.exact_scope_enforced,
  single_use_lock_active: validPackage.single_use_lock_active,
  execution_count_allowed: validPackage.execution_count_allowed,
  execution_count_performed: validPackage.execution_count_performed,
  execution_authorized_for_single_future_run: validPackage.execution_authorized_for_single_future_run,
  approval_consumed: validPackage.approval_consumed,
  live_call_performed: validPackage.live_call_performed,
  noop_ping_performed: validPackage.noop_ping_performed,
  pending_receipt_envelope_allocated: validPackage.pending_receipt_envelope_allocated,
  final_live_receipt_materialized: validPackage.final_live_receipt_materialized,
  stdout_path_allocated: validPackage.stdout_path_allocated,
  stdout_output_present: validPackage.stdout_output_present,
  stderr_path_allocated: validPackage.stderr_path_allocated,
  stderr_output_present: validPackage.stderr_output_present,
  rollback_noop_record_allocated: validPackage.rollback_noop_record_allocated,
  rollback_noop_record_executed: validPackage.rollback_noop_record_executed,
  post_run_verification_allocated: validPackage.post_run_verification_allocated,
  post_run_verification_executed: validPackage.post_run_verification_executed,
  credential_persistence_allowed: validPackage.credential_persistence_allowed,
  browser_session_persistence_allowed: validPackage.browser_session_persistence_allowed,
  cookie_persistence_allowed: validPackage.cookie_persistence_allowed,
  api_key_persistence_allowed: validPackage.api_key_persistence_allowed,
  no_live_execution_tool_called: true,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
