import { spawnSync } from 'node:child_process';

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function runV71Verifier() {
  const result = spawnSync(
    process.execPath,
    ['scripts/han-agent-bus/verify-v7.1-final-operator-approval-intake-gate.mjs'],
    { encoding: 'utf8' }
  );

  if (result.status !== 0) {
    throw new Error(`v7.1 verifier failed: ${result.stderr || result.stdout}`);
  }

  return JSON.parse(result.stdout);
}

function normalizeApprovalIntakeGate(v71) {
  return {
    approval_intake_gate_id: `approval_intake_gate_${v71.source_job_id}_v7_1`,
    source_gate_contract_id: v71.source_gate_contract_id,
    source_job_id: v71.source_job_id,
    target: 'openclaw',
    agent: 'planner',
    risk_level: 'low',
    planned_live_tool: 'openclaw_send_task_live',
    intake_mode: v71.generated_intake_mode,
    intake_status: v71.generated_intake_status,
    approval_record_required: v71.generated_approval_record_required,
    approval_record_present: v71.generated_approval_record_present,
    operator_identity_reference_required: v71.generated_operator_identity_reference_required,
    operator_identity_reference_present: v71.generated_operator_identity_reference_present,
    explicit_approval_text_required: v71.generated_explicit_approval_text_required,
    explicit_approval_text_present: v71.generated_explicit_approval_text_present,
    approval_scope_exact_required: v71.generated_approval_scope_exact_required,
    approval_scope_wildcard_allowed: v71.generated_approval_scope_wildcard_allowed,
    single_use_approval_required: v71.generated_single_use_approval_required,
    single_use_approval_present: v71.generated_single_use_approval_present,
    expiry_required: v71.generated_expiry_required,
    expiry_present: v71.generated_expiry_present,
    revocation_required: v71.generated_revocation_required,
    revocation_present: v71.generated_revocation_present,
    execution_authorized: v71.generated_execution_authorized,
    live_execution_allowed: v71.generated_live_execution_allowed,
    live_call_performed: v71.generated_live_call_performed,
    v71_verdict: v71.verdict,
    no_live_execution_tool_called: v71.no_live_execution_tool_called
  };
}

function validateSourceIntake(intake) {
  assert(intake && typeof intake === 'object', 'approval intake gate is missing');
  assert(intake.v71_verdict === 'PASS', 'v7.1 verifier result must be PASS');
  assert(intake.no_live_execution_tool_called === true, 'v7.1 must not call live execution tool');
  assert(intake.approval_intake_gate_id && intake.approval_intake_gate_id.length >= 8, 'approval_intake_gate_id is missing');
  assert(intake.source_gate_contract_id && intake.source_gate_contract_id.length >= 8, 'source_gate_contract_id is missing');
  assert(intake.source_job_id && intake.source_job_id.startsWith('job_'), 'source_job_id is invalid');
  assert(intake.target === 'openclaw', 'intake target must be openclaw');
  assert(intake.agent === 'planner', 'intake agent must be planner');
  assert(intake.risk_level === 'low', 'intake risk level must remain low');
  assert(intake.planned_live_tool === 'openclaw_send_task_live', 'planned live tool mismatch');
  assert(intake.intake_mode === 'intake_gate_only', 'intake mode must be intake_gate_only');
  assert(intake.intake_status === 'final_operator_approval_intake_required', 'intake status mismatch');
  assert(intake.approval_record_required === true, 'approval record must be required');
  assert(intake.approval_record_present === false, 'approval record must not be present before v7.2');
  assert(intake.operator_identity_reference_required === true, 'operator identity reference must be required');
  assert(intake.operator_identity_reference_present === false, 'operator identity reference must not be present before v7.2');
  assert(intake.explicit_approval_text_required === true, 'explicit approval text must be required');
  assert(intake.explicit_approval_text_present === false, 'explicit approval text must not be present before v7.2');
  assert(intake.approval_scope_exact_required === true, 'approval scope exact must be required');
  assert(intake.approval_scope_wildcard_allowed === false, 'wildcard approval scope must not be allowed');
  assert(intake.single_use_approval_required === true, 'single-use approval must be required');
  assert(intake.single_use_approval_present === false, 'single-use approval must not be present before v7.2');
  assert(intake.expiry_required === true, 'expiry must be required');
  assert(intake.expiry_present === false, 'expiry must not be present before v7.2');
  assert(intake.revocation_required === true, 'revocation must be required');
  assert(intake.revocation_present === false, 'revocation must not be present before v7.2');
  assert(intake.execution_authorized === false, 'execution_authorized must remain false');
  assert(intake.live_execution_allowed === false, 'live_execution_allowed must remain false');
  assert(intake.live_call_performed === false, 'live_call_performed must remain false');
  return true;
}

function createPreflightLock(intake, overrides = {}) {
  validateSourceIntake(intake);

  const lock = {
    preflight_lock_id: `preflight_lock_${intake.source_job_id}_v7_2`,
    source_approval_intake_gate_id: intake.approval_intake_gate_id,
    source_gate_contract_id: intake.source_gate_contract_id,
    source_job_id: intake.source_job_id,
    target: intake.target,
    agent: intake.agent,
    risk_level: intake.risk_level,
    planned_live_tool: intake.planned_live_tool,
    preflight_mode: 'preflight_lock_only',
    preflight_status: 'preflight_lock_verified',
    preflight_lock_active: true,
    final_operator_approval_required: true,
    final_operator_approval_present: false,
    receipt_required: true,
    receipt_paths_required: true,
    stdout_path_required: true,
    stdout_path_present: false,
    stderr_path_required: true,
    stderr_path_present: false,
    artifact_paths_required: true,
    artifact_paths_present: false,
    rollback_plan_required: true,
    rollback_plan_present: false,
    rollback_verification_required: true,
    rollback_verification_present: false,
    post_run_verification_required: true,
    post_run_verification_present: false,
    single_use_required: true,
    single_use_consumed: false,
    execution_authorized: false,
    live_execution_allowed: false,
    live_call_performed: false,
    credential_persistence_allowed: false,
    browser_session_persistence_allowed: false,
    created_at: '2026-05-20T01:10:00.000Z',
    preflight_requirements: {
      final_operator_approval_required: true,
      exact_source_job_binding_required: true,
      receipt_paths_required: true,
      stdout_path_required: true,
      stderr_path_required: true,
      artifact_paths_required: true,
      rollback_plan_required: true,
      rollback_verification_required: true,
      post_run_verification_required: true,
      single_use_required: true,
      no_credential_persistence: true,
      no_browser_session_persistence: true
    },
    rejection_rules: {
      reject_missing_source_intake_gate: true,
      reject_failed_v7_1_verifier: true,
      reject_approval_record_present_before_v7_3: true,
      reject_operator_identity_present_before_v7_3: true,
      reject_approval_text_present_before_v7_3: true,
      reject_wildcard_approval_scope: true,
      reject_real_receipt_paths_in_v7_2: true,
      reject_rollback_plan_present_in_v7_2: true,
      reject_execution_authorized_true: true,
      reject_live_execution_allowed_true: true,
      reject_live_call_performed_true: true,
      reject_credential_persistence: true,
      reject_browser_session_persistence: true
    },
    safety_boundary: 'v7.2 defines the live execution preflight lock only. It does not accept final approval, allocate receipt paths, authorize execution, call live execution tools, or perform live actions.'
  };

  return { ...lock, ...overrides };
}

function validatePreflightLock(lock, intake) {
  assert(lock && typeof lock === 'object', 'preflight lock is missing');
  assert(lock.source_approval_intake_gate_id === intake.approval_intake_gate_id, 'source_approval_intake_gate_id mismatch');
  assert(lock.source_gate_contract_id === intake.source_gate_contract_id, 'source_gate_contract_id mismatch');
  assert(lock.source_job_id === intake.source_job_id, 'source_job_id mismatch');
  assert(lock.target === 'openclaw', 'preflight target must be openclaw');
  assert(lock.agent === 'planner', 'preflight agent must be planner');
  assert(lock.risk_level === 'low', 'preflight risk level must remain low');
  assert(lock.planned_live_tool === 'openclaw_send_task_live', 'planned live tool mismatch');
  assert(lock.preflight_mode === 'preflight_lock_only', 'preflight mode must be preflight_lock_only');
  assert(lock.preflight_status === 'preflight_lock_verified', 'preflight status must be preflight_lock_verified');
  assert(lock.preflight_lock_active === true, 'preflight lock must be active');
  assert(lock.final_operator_approval_required === true, 'final operator approval must be required');
  assert(lock.final_operator_approval_present === false, 'final operator approval must not be present in v7.2');
  assert(lock.receipt_required === true, 'receipt must be required');
  assert(lock.receipt_paths_required === true, 'receipt paths must be required');
  assert(lock.stdout_path_required === true, 'stdout path must be required');
  assert(lock.stdout_path_present === false, 'stdout path must not be present in v7.2');
  assert(lock.stderr_path_required === true, 'stderr path must be required');
  assert(lock.stderr_path_present === false, 'stderr path must not be present in v7.2');
  assert(lock.artifact_paths_required === true, 'artifact paths must be required');
  assert(lock.artifact_paths_present === false, 'artifact paths must not be present in v7.2');
  assert(lock.rollback_plan_required === true, 'rollback plan must be required');
  assert(lock.rollback_plan_present === false, 'rollback plan must not be present in v7.2');
  assert(lock.rollback_verification_required === true, 'rollback verification must be required');
  assert(lock.rollback_verification_present === false, 'rollback verification must not be present in v7.2');
  assert(lock.post_run_verification_required === true, 'post-run verification must be required');
  assert(lock.post_run_verification_present === false, 'post-run verification must not be present in v7.2');
  assert(lock.single_use_required === true, 'single-use must be required');
  assert(lock.single_use_consumed === false, 'single-use must not be consumed in v7.2');
  assert(lock.execution_authorized === false, 'execution_authorized must remain false in v7.2');
  assert(lock.live_execution_allowed === false, 'live_execution_allowed must remain false in v7.2');
  assert(lock.live_call_performed === false, 'live_call_performed must remain false in v7.2');
  assert(lock.credential_persistence_allowed === false, 'credential persistence must not be allowed');
  assert(lock.browser_session_persistence_allowed === false, 'browser session persistence must not be allowed');
  assert(lock.preflight_requirements?.rollback_plan_required === true, 'preflight requirements must require rollback plan');
  assert(lock.rejection_rules?.reject_live_execution_allowed_true === true, 'rejection rules must block live execution allowed');
  assert(String(lock.safety_boundary).includes('does not accept final approval'), 'safety boundary must deny final approval intake');
  assert(String(lock.safety_boundary).includes('allocate receipt paths'), 'safety boundary must deny receipt path allocation');
  assert(String(lock.safety_boundary).includes('authorize execution'), 'safety boundary must deny authorization');
  assert(String(lock.safety_boundary).includes('call live execution tools'), 'safety boundary must deny live tool calls');
  assert(String(lock.safety_boundary).includes('perform live actions'), 'safety boundary must deny live actions');
  return true;
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

const v71 = runV71Verifier();
const validIntake = normalizeApprovalIntakeGate(v71);
const validLock = createPreflightLock(validIntake);

const checks = [
  expectPass('valid v7.1 intake gate creates v7.2 live execution preflight lock', () => {
    validatePreflightLock(validLock, validIntake);
  }),
  expectReject('missing approval intake gate is rejected', () => {
    createPreflightLock(null);
  }),
  expectReject('failed v7.1 verifier result is rejected', () => {
    createPreflightLock({ ...validIntake, v71_verdict: 'FAIL' });
  }),
  expectReject('source approval_record_present=true is rejected', () => {
    createPreflightLock({ ...validIntake, approval_record_present: true });
  }),
  expectReject('source operator_identity_reference_present=true is rejected', () => {
    createPreflightLock({ ...validIntake, operator_identity_reference_present: true });
  }),
  expectReject('source explicit_approval_text_present=true is rejected', () => {
    createPreflightLock({ ...validIntake, explicit_approval_text_present: true });
  }),
  expectReject('source approval_scope_wildcard_allowed=true is rejected', () => {
    createPreflightLock({ ...validIntake, approval_scope_wildcard_allowed: true });
  }),
  expectReject('source execution_authorized=true is rejected', () => {
    createPreflightLock({ ...validIntake, execution_authorized: true });
  }),
  expectReject('source live_execution_allowed=true is rejected', () => {
    createPreflightLock({ ...validIntake, live_execution_allowed: true });
  }),
  expectReject('source live_call_performed=true is rejected', () => {
    createPreflightLock({ ...validIntake, live_call_performed: true });
  }),
  expectReject('stdout_path_present=true is rejected', () => {
    validatePreflightLock(createPreflightLock(validIntake, { stdout_path_present: true }), validIntake);
  }),
  expectReject('stderr_path_present=true is rejected', () => {
    validatePreflightLock(createPreflightLock(validIntake, { stderr_path_present: true }), validIntake);
  }),
  expectReject('artifact_paths_present=true is rejected', () => {
    validatePreflightLock(createPreflightLock(validIntake, { artifact_paths_present: true }), validIntake);
  }),
  expectReject('rollback_plan_present=true is rejected', () => {
    validatePreflightLock(createPreflightLock(validIntake, { rollback_plan_present: true }), validIntake);
  }),
  expectReject('preflight execution_authorized=true is rejected', () => {
    validatePreflightLock(createPreflightLock(validIntake, { execution_authorized: true }), validIntake);
  }),
  expectReject('preflight live_execution_allowed=true is rejected', () => {
    validatePreflightLock(createPreflightLock(validIntake, { live_execution_allowed: true }), validIntake);
  }),
  expectReject('preflight live_call_performed=true is rejected', () => {
    validatePreflightLock(createPreflightLock(validIntake, { live_call_performed: true }), validIntake);
  }),
  expectReject('credential_persistence_allowed=true is rejected', () => {
    validatePreflightLock(createPreflightLock(validIntake, { credential_persistence_allowed: true }), validIntake);
  }),
  expectReject('browser_session_persistence_allowed=true is rejected', () => {
    validatePreflightLock(createPreflightLock(validIntake, { browser_session_persistence_allowed: true }), validIntake);
  })
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v7.2',
  verdict,
  source_job_id: validIntake.source_job_id,
  source_gate_contract_id: validIntake.source_gate_contract_id,
  source_approval_intake_gate_id: validIntake.approval_intake_gate_id,
  generated_preflight_mode: validLock.preflight_mode,
  generated_preflight_status: validLock.preflight_status,
  generated_preflight_lock_active: validLock.preflight_lock_active,
  generated_final_operator_approval_required: validLock.final_operator_approval_required,
  generated_final_operator_approval_present: validLock.final_operator_approval_present,
  generated_receipt_required: validLock.receipt_required,
  generated_receipt_paths_required: validLock.receipt_paths_required,
  generated_stdout_path_required: validLock.stdout_path_required,
  generated_stdout_path_present: validLock.stdout_path_present,
  generated_stderr_path_required: validLock.stderr_path_required,
  generated_stderr_path_present: validLock.stderr_path_present,
  generated_artifact_paths_required: validLock.artifact_paths_required,
  generated_artifact_paths_present: validLock.artifact_paths_present,
  generated_rollback_plan_required: validLock.rollback_plan_required,
  generated_rollback_plan_present: validLock.rollback_plan_present,
  generated_post_run_verification_required: validLock.post_run_verification_required,
  generated_post_run_verification_present: validLock.post_run_verification_present,
  generated_execution_authorized: validLock.execution_authorized,
  generated_live_execution_allowed: validLock.live_execution_allowed,
  generated_live_call_performed: validLock.live_call_performed,
  generated_credential_persistence_allowed: validLock.credential_persistence_allowed,
  generated_browser_session_persistence_allowed: validLock.browser_session_persistence_allowed,
  no_live_execution_tool_called: true,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
