import { spawnSync } from 'node:child_process';

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function runV72Verifier() {
  const result = spawnSync(
    process.execPath,
    ['scripts/han-agent-bus/verify-v7.2-live-execution-preflight-lock.mjs'],
    { encoding: 'utf8' }
  );

  if (result.status !== 0) {
    throw new Error(`v7.2 verifier failed: ${result.stderr || result.stdout}`);
  }

  return JSON.parse(result.stdout);
}

function tagExists(tagName) {
  const result = spawnSync('git', ['rev-parse', '--verify', `refs/tags/${tagName}`], { encoding: 'utf8' });
  return result.status === 0;
}

function validateDecisionBaselines() {
  assert(tagExists('han-agent-bus-v7.3-risk-readiness-gate'), 'missing v7.3 risk readiness gate tag');
  assert(tagExists('han-agent-bus-v7.3-implementation-plan'), 'missing v7.3 implementation plan tag');
  assert(tagExists('han-agent-bus-v7.3-operator-decision-receipt-only'), 'missing v7.3 receipt-only operator decision tag');
}

function normalizePreflightLock(v72) {
  return {
    preflight_lock_id: `preflight_lock_${v72.source_job_id}_v7_2`,
    source_approval_intake_gate_id: v72.source_approval_intake_gate_id,
    source_gate_contract_id: v72.source_gate_contract_id,
    source_job_id: v72.source_job_id,
    target: 'openclaw',
    agent: 'planner',
    risk_level: 'low',
    planned_live_tool: 'openclaw_send_task_live',
    preflight_mode: v72.generated_preflight_mode,
    preflight_status: v72.generated_preflight_status,
    preflight_lock_active: v72.generated_preflight_lock_active,
    final_operator_approval_required: v72.generated_final_operator_approval_required,
    final_operator_approval_present: v72.generated_final_operator_approval_present,
    receipt_required: v72.generated_receipt_required,
    receipt_paths_required: v72.generated_receipt_paths_required,
    rollback_plan_required: v72.generated_rollback_plan_required,
    rollback_plan_present: v72.generated_rollback_plan_present,
    post_run_verification_required: v72.generated_post_run_verification_required,
    post_run_verification_present: v72.generated_post_run_verification_present,
    execution_authorized: v72.generated_execution_authorized,
    live_execution_allowed: v72.generated_live_execution_allowed,
    live_call_performed: v72.generated_live_call_performed,
    credential_persistence_allowed: v72.generated_credential_persistence_allowed,
    browser_session_persistence_allowed: v72.generated_browser_session_persistence_allowed,
    v72_verdict: v72.verdict,
    no_live_execution_tool_called: v72.no_live_execution_tool_called
  };
}

function validatePreflightLock(lock) {
  assert(lock && typeof lock === 'object', 'preflight lock is missing');
  assert(lock.v72_verdict === 'PASS', 'v7.2 verifier result must be PASS');
  assert(lock.no_live_execution_tool_called === true, 'v7.2 must not call live execution tool');
  assert(lock.preflight_lock_active === true, 'preflight lock must be active');
  assert(lock.final_operator_approval_required === true, 'final operator approval must be required');
  assert(lock.final_operator_approval_present === false, 'final operator approval must not already be present');
  assert(lock.receipt_required === true, 'receipt must be required');
  assert(lock.receipt_paths_required === true, 'receipt paths must be required');
  assert(lock.rollback_plan_required === true, 'rollback plan must be required');
  assert(lock.rollback_plan_present === false, 'rollback plan must not already be present');
  assert(lock.post_run_verification_required === true, 'post-run verification must be required');
  assert(lock.post_run_verification_present === false, 'post-run verification must not already be present');
  assert(lock.execution_authorized === false, 'preflight execution_authorized must remain false');
  assert(lock.live_execution_allowed === false, 'preflight live_execution_allowed must remain false');
  assert(lock.live_call_performed === false, 'preflight live_call_performed must remain false');
  assert(lock.credential_persistence_allowed === false, 'credential persistence must be false');
  assert(lock.browser_session_persistence_allowed === false, 'browser session persistence must be false');
}

function createApprovalRecord(lock, overrides = {}) {
  validatePreflightLock(lock);

  const approval = {
    final_operator_approval_id: `final_approval_${lock.source_job_id}_v7_3_contract`,
    source_job_id: lock.source_job_id,
    source_gate_contract_id: lock.source_gate_contract_id,
    source_approval_intake_gate_id: lock.source_approval_intake_gate_id,
    source_preflight_lock_id: lock.preflight_lock_id,
    target: lock.target,
    agent: lock.agent,
    risk_level: lock.risk_level,
    planned_live_tool: lock.planned_live_tool,
    approval_record_mode: 'receipt_only_contract',
    approval_status: 'approval_contract_verified',
    operator_identity_reference_present: true,
    explicit_approval_text_present: true,
    approval_scope_exact: true,
    approval_scope_wildcard: false,
    single_use_approval: true,
    approval_used: false,
    expiry_present: true,
    revocation_available: true,
    execution_authorized: false,
    live_call_performed: false,
    credential_persistence_allowed: false,
    browser_session_persistence_allowed: false
  };

  return { ...approval, ...overrides };
}

function validateApprovalRecord(approval, lock) {
  assert(approval && typeof approval === 'object', 'approval record is missing');
  assert(approval.source_job_id === lock.source_job_id, 'approval source_job_id mismatch');
  assert(approval.source_preflight_lock_id === lock.preflight_lock_id, 'approval preflight lock mismatch');
  assert(approval.target === 'openclaw', 'approval target must be openclaw');
  assert(approval.agent === 'planner', 'approval agent must be planner');
  assert(approval.risk_level === 'low', 'approval risk must remain low');
  assert(approval.planned_live_tool === 'openclaw_send_task_live', 'approval live tool mismatch');
  assert(approval.approval_record_mode === 'receipt_only_contract', 'approval mode must be receipt_only_contract');
  assert(approval.approval_status === 'approval_contract_verified', 'approval contract must be verified');
  assert(approval.operator_identity_reference_present === true, 'operator identity reference must be present');
  assert(approval.explicit_approval_text_present === true, 'explicit approval text must be present');
  assert(approval.approval_scope_exact === true, 'approval scope must be exact');
  assert(approval.approval_scope_wildcard === false, 'approval scope must not be wildcard');
  assert(approval.single_use_approval === true, 'single-use approval must be required');
  assert(approval.approval_used === false, 'approval must not be consumed in receipt-only contract');
  assert(approval.expiry_present === true, 'expiry must be present');
  assert(approval.revocation_available === true, 'revocation must be available');
  assert(approval.execution_authorized === false, 'approval must not authorize execution in receipt-only contract');
  assert(approval.live_call_performed === false, 'approval must not perform live call');
  assert(approval.credential_persistence_allowed === false, 'credential persistence must be false');
  assert(approval.browser_session_persistence_allowed === false, 'browser session persistence must be false');
}

function createRollbackPlan(lock, overrides = {}) {
  return {
    rollback_plan_id: `rollback_plan_${lock.source_job_id}_v7_3_contract`,
    source_job_id: lock.source_job_id,
    rollback_mode: 'receipt_only_contract',
    rollback_plan_present: true,
    rollback_status: 'contract_verified_not_executed',
    rollback_executed: false,
    destructive_operation: false,
    reversible_or_noop: true,
    safety_notes: [
      'rollback contract is present',
      'no destructive operation is allowed',
      'rollback is not executed because v7.3 is receipt-only'
    ],
    ...overrides
  };
}

function validateRollbackPlan(rollback, lock) {
  assert(rollback && typeof rollback === 'object', 'rollback plan is missing');
  assert(rollback.source_job_id === lock.source_job_id, 'rollback source_job_id mismatch');
  assert(rollback.rollback_mode === 'receipt_only_contract', 'rollback mode must be receipt_only_contract');
  assert(rollback.rollback_plan_present === true, 'rollback plan must be present');
  assert(rollback.rollback_status === 'contract_verified_not_executed', 'rollback status mismatch');
  assert(rollback.rollback_executed === false, 'rollback must not execute in receipt-only contract');
  assert(rollback.destructive_operation === false, 'destructive operation must be false');
  assert(rollback.reversible_or_noop === true, 'operation must be reversible or no-op');
}

function createPostRunVerification(lock, overrides = {}) {
  return {
    post_run_verification_id: `post_run_verification_${lock.source_job_id}_v7_3_contract`,
    source_job_id: lock.source_job_id,
    verification_mode: 'receipt_only_contract',
    post_run_verification_present: true,
    post_run_verification_status: 'contract_verified_no_live_run',
    actual_live_run_observed: false,
    no_live_tool_called: true,
    execution_count_verified: true,
    ...overrides
  };
}

function validatePostRunVerification(post, lock) {
  assert(post && typeof post === 'object', 'post-run verification is missing');
  assert(post.source_job_id === lock.source_job_id, 'post-run source_job_id mismatch');
  assert(post.verification_mode === 'receipt_only_contract', 'post-run mode must be receipt_only_contract');
  assert(post.post_run_verification_present === true, 'post-run verification must be present');
  assert(post.post_run_verification_status === 'contract_verified_no_live_run', 'post-run status mismatch');
  assert(post.actual_live_run_observed === false, 'actual live run must not be observed');
  assert(post.no_live_tool_called === true, 'live tool must not be called');
  assert(post.execution_count_verified === true, 'execution count must be verified');
}

function createControlledReceipt(lock, approval, rollback, post, overrides = {}) {
  validateApprovalRecord(approval, lock);
  validateRollbackPlan(rollback, lock);
  validatePostRunVerification(post, lock);

  const receipt = {
    controlled_receipt_id: `controlled_receipt_${lock.source_job_id}_v7_3_contract`,
    source_job_id: lock.source_job_id,
    source_gate_contract_id: lock.source_gate_contract_id,
    source_approval_intake_gate_id: lock.source_approval_intake_gate_id,
    source_preflight_lock_id: lock.preflight_lock_id,
    final_operator_approval_id: approval.final_operator_approval_id,
    rollback_plan_id: rollback.rollback_plan_id,
    post_run_verification_id: post.post_run_verification_id,
    target: lock.target,
    agent: lock.agent,
    risk_level: lock.risk_level,
    live_tool: lock.planned_live_tool,
    receipt_mode: 'receipt_only_contract',
    receipt_status: 'controlled_receipt_contract_verified',
    receipt_contract_verified: true,
    approval_contract_verified: true,
    rollback_contract_verified: true,
    post_run_verification_contract_verified: true,
    planned_execution_count: 1,
    actual_execution_count: 0,
    execution_authorized: false,
    live_call_performed: false,
    repeated_execution_allowed: false,
    chained_execution_allowed: false,
    autonomous_execution_allowed: false,
    stdout_path_contract_required: true,
    stdout_path_present: false,
    stderr_path_contract_required: true,
    stderr_path_present: false,
    artifact_paths_contract_required: true,
    artifact_paths_present: false,
    credential_persistence_allowed: false,
    browser_session_persistence_allowed: false,
    cookie_persistence_allowed: false,
    api_key_persistence_allowed: false,
    single_use_consumed: false,
    safety_notes: [
      'receipt-only contract verified',
      'no real live execution was authorized',
      'no live execution tool was called',
      'no credentials were persisted',
      'no browser sessions were persisted',
      'no cookies were persisted',
      'no API keys were persisted',
      'rollback contract is available',
      'post-run verification contract is available'
    ]
  };

  return { ...receipt, ...overrides };
}

function validateControlledReceipt(receipt, lock, approval, rollback, post) {
  assert(receipt && typeof receipt === 'object', 'controlled receipt is missing');
  assert(receipt.source_job_id === lock.source_job_id, 'receipt source_job_id mismatch');
  assert(receipt.source_preflight_lock_id === lock.preflight_lock_id, 'receipt preflight lock mismatch');
  assert(receipt.final_operator_approval_id === approval.final_operator_approval_id, 'receipt approval id mismatch');
  assert(receipt.rollback_plan_id === rollback.rollback_plan_id, 'receipt rollback id mismatch');
  assert(receipt.post_run_verification_id === post.post_run_verification_id, 'receipt post-run verification id mismatch');
  assert(receipt.target === 'openclaw', 'receipt target must be openclaw');
  assert(receipt.agent === 'planner', 'receipt agent must be planner');
  assert(receipt.risk_level === 'low', 'receipt risk level must remain low');
  assert(receipt.live_tool === 'openclaw_send_task_live', 'receipt live tool mismatch');
  assert(receipt.receipt_mode === 'receipt_only_contract', 'receipt mode must be receipt_only_contract');
  assert(receipt.receipt_status === 'controlled_receipt_contract_verified', 'receipt status mismatch');
  assert(receipt.receipt_contract_verified === true, 'receipt contract must be verified');
  assert(receipt.approval_contract_verified === true, 'approval contract must be verified');
  assert(receipt.rollback_contract_verified === true, 'rollback contract must be verified');
  assert(receipt.post_run_verification_contract_verified === true, 'post-run verification contract must be verified');
  assert(receipt.planned_execution_count === 1, 'planned execution count must be exactly 1');
  assert(receipt.actual_execution_count === 0, 'actual execution count must remain 0 in receipt-only contract');
  assert(receipt.execution_authorized === false, 'execution_authorized must remain false');
  assert(receipt.live_call_performed === false, 'live_call_performed must remain false');
  assert(receipt.repeated_execution_allowed === false, 'repeated execution must not be allowed');
  assert(receipt.chained_execution_allowed === false, 'chained execution must not be allowed');
  assert(receipt.autonomous_execution_allowed === false, 'autonomous execution must not be allowed');
  assert(receipt.stdout_path_contract_required === true, 'stdout path contract must be required');
  assert(receipt.stdout_path_present === false, 'stdout path must not be present in receipt-only contract');
  assert(receipt.stderr_path_contract_required === true, 'stderr path contract must be required');
  assert(receipt.stderr_path_present === false, 'stderr path must not be present in receipt-only contract');
  assert(receipt.artifact_paths_contract_required === true, 'artifact paths contract must be required');
  assert(receipt.artifact_paths_present === false, 'artifact paths must not be present in receipt-only contract');
  assert(receipt.credential_persistence_allowed === false, 'credential persistence must be false');
  assert(receipt.browser_session_persistence_allowed === false, 'browser session persistence must be false');
  assert(receipt.cookie_persistence_allowed === false, 'cookie persistence must be false');
  assert(receipt.api_key_persistence_allowed === false, 'API key persistence must be false');
  assert(receipt.single_use_consumed === false, 'single-use must not be consumed in receipt-only contract');
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

validateDecisionBaselines();

const v72 = runV72Verifier();
const lock = normalizePreflightLock(v72);
const approval = createApprovalRecord(lock);
const rollback = createRollbackPlan(lock);
const post = createPostRunVerification(lock);
const receipt = createControlledReceipt(lock, approval, rollback, post);

const checks = [
  expectPass('valid v7.3 receipt-only controlled execution receipt contract passes', () => {
    validateControlledReceipt(receipt, lock, approval, rollback, post);
  }),
  expectReject('missing final approval is rejected', () => {
    createControlledReceipt(lock, null, rollback, post);
  }),
  expectReject('missing operator identity reference is rejected', () => {
    createControlledReceipt(lock, createApprovalRecord(lock, { operator_identity_reference_present: false }), rollback, post);
  }),
  expectReject('missing explicit approval text is rejected', () => {
    createControlledReceipt(lock, createApprovalRecord(lock, { explicit_approval_text_present: false }), rollback, post);
  }),
  expectReject('missing expiry is rejected', () => {
    createControlledReceipt(lock, createApprovalRecord(lock, { expiry_present: false }), rollback, post);
  }),
  expectReject('missing revocation capability is rejected', () => {
    createControlledReceipt(lock, createApprovalRecord(lock, { revocation_available: false }), rollback, post);
  }),
  expectReject('wildcard approval scope is rejected', () => {
    createControlledReceipt(lock, createApprovalRecord(lock, { approval_scope_wildcard: true }), rollback, post);
  }),
  expectReject('reused approval id is rejected', () => {
    createControlledReceipt(lock, createApprovalRecord(lock, { approval_used: true }), rollback, post);
  }),
  expectReject('risk above low is rejected', () => {
    createControlledReceipt(lock, createApprovalRecord(lock, { risk_level: 'medium' }), rollback, post);
  }),
  expectReject('repeated execution is rejected', () => {
    validateControlledReceipt(createControlledReceipt(lock, approval, rollback, post, { repeated_execution_allowed: true }), lock, approval, rollback, post);
  }),
  expectReject('chained execution is rejected', () => {
    validateControlledReceipt(createControlledReceipt(lock, approval, rollback, post, { chained_execution_allowed: true }), lock, approval, rollback, post);
  }),
  expectReject('autonomous execution is rejected', () => {
    validateControlledReceipt(createControlledReceipt(lock, approval, rollback, post, { autonomous_execution_allowed: true }), lock, approval, rollback, post);
  }),
  expectReject('actual execution count above zero is rejected', () => {
    validateControlledReceipt(createControlledReceipt(lock, approval, rollback, post, { actual_execution_count: 1 }), lock, approval, rollback, post);
  }),
  expectReject('execution_authorized=true is rejected', () => {
    validateControlledReceipt(createControlledReceipt(lock, approval, rollback, post, { execution_authorized: true }), lock, approval, rollback, post);
  }),
  expectReject('live_call_performed=true is rejected', () => {
    validateControlledReceipt(createControlledReceipt(lock, approval, rollback, post, { live_call_performed: true }), lock, approval, rollback, post);
  }),
  expectReject('missing receipt path contract is rejected', () => {
    validateControlledReceipt(createControlledReceipt(lock, approval, rollback, post, { stdout_path_contract_required: false }), lock, approval, rollback, post);
  }),
  expectReject('real stdout path presence is rejected', () => {
    validateControlledReceipt(createControlledReceipt(lock, approval, rollback, post, { stdout_path_present: true }), lock, approval, rollback, post);
  }),
  expectReject('missing rollback plan is rejected', () => {
    createControlledReceipt(lock, approval, null, post);
  }),
  expectReject('missing post-run verification is rejected', () => {
    createControlledReceipt(lock, approval, rollback, null);
  }),
  expectReject('credential persistence is rejected', () => {
    validateControlledReceipt(createControlledReceipt(lock, approval, rollback, post, { credential_persistence_allowed: true }), lock, approval, rollback, post);
  }),
  expectReject('browser session persistence is rejected', () => {
    validateControlledReceipt(createControlledReceipt(lock, approval, rollback, post, { browser_session_persistence_allowed: true }), lock, approval, rollback, post);
  }),
  expectReject('cookie persistence is rejected', () => {
    validateControlledReceipt(createControlledReceipt(lock, approval, rollback, post, { cookie_persistence_allowed: true }), lock, approval, rollback, post);
  }),
  expectReject('API key persistence is rejected', () => {
    validateControlledReceipt(createControlledReceipt(lock, approval, rollback, post, { api_key_persistence_allowed: true }), lock, approval, rollback, post);
  })
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v7.3',
  mode: 'receipt-only-contract',
  verdict,
  source_job_id: lock.source_job_id,
  source_gate_contract_id: lock.source_gate_contract_id,
  source_approval_intake_gate_id: lock.source_approval_intake_gate_id,
  source_preflight_lock_id: lock.preflight_lock_id,
  final_operator_approval_id: approval.final_operator_approval_id,
  rollback_plan_id: rollback.rollback_plan_id,
  post_run_verification_id: post.post_run_verification_id,
  generated_receipt_mode: receipt.receipt_mode,
  generated_receipt_status: receipt.receipt_status,
  generated_receipt_contract_verified: receipt.receipt_contract_verified,
  generated_approval_contract_verified: receipt.approval_contract_verified,
  generated_rollback_contract_verified: receipt.rollback_contract_verified,
  generated_post_run_verification_contract_verified: receipt.post_run_verification_contract_verified,
  generated_planned_execution_count: receipt.planned_execution_count,
  generated_actual_execution_count: receipt.actual_execution_count,
  generated_execution_authorized: receipt.execution_authorized,
  generated_live_call_performed: receipt.live_call_performed,
  generated_repeated_execution_allowed: receipt.repeated_execution_allowed,
  generated_chained_execution_allowed: receipt.chained_execution_allowed,
  generated_autonomous_execution_allowed: receipt.autonomous_execution_allowed,
  generated_credential_persistence_allowed: receipt.credential_persistence_allowed,
  generated_browser_session_persistence_allowed: receipt.browser_session_persistence_allowed,
  generated_cookie_persistence_allowed: receipt.cookie_persistence_allowed,
  generated_api_key_persistence_allowed: receipt.api_key_persistence_allowed,
  no_live_execution_tool_called: true,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
