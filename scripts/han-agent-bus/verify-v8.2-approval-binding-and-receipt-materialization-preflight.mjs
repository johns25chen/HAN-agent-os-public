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
  assert(tagExists('han-agent-bus-v8-phase-charter'), 'missing V8 phase charter tag');
  assert(tagExists('han-agent-bus-v8-operator-decision-noop-live-adapter-ping'), 'missing V8 no-op operator decision tag');
  assert(tagExists('han-agent-bus-v8.0-stable'), 'missing v8.0 stable tag');
  assert(tagExists('han-agent-bus-v8.1-stable'), 'missing v8.1 stable tag');
}

function runV81Verifier() {
  const result = spawnSync(
    process.execPath,
    ['scripts/han-agent-bus/verify-v8.1-live-adapter-sandbox-contract.mjs'],
    { encoding: 'utf8' }
  );

  if (result.status !== 0) {
    throw new Error(`v8.1 verifier failed: ${result.stderr || result.stdout}`);
  }

  return JSON.parse(result.stdout);
}

function normalizeSandbox(v81) {
  return {
    sandbox_contract_id: `live_adapter_sandbox_${v81.source_job_id}_v8_1`,
    source_task_class_selection_id: `task_class_selection_${v81.source_job_id}_v8_0`,
    source_job_id: v81.source_job_id,
    source_v8_phase_charter_tag: 'han-agent-bus-v8-phase-charter',
    source_v8_operator_decision_tag: 'han-agent-bus-v8-operator-decision-noop-live-adapter-ping',
    source_v8_0_stable_tag: 'han-agent-bus-v8.0-stable',
    source_v8_1_stable_tag: 'han-agent-bus-v8.1-stable',
    selected_pilot_task_class: v81.generated_selected_pilot_task_class,
    operation_type: v81.generated_allowed_operation_type,
    risk_level: 'low',
    target: v81.generated_adapter_target,
    agent: v81.generated_adapter_agent,
    live_tool: v81.generated_allowed_live_tool,
    live_call_performed: v81.generated_live_call_performed,
    execution_authorized: v81.generated_execution_authorized,
    noop_ping_performed: v81.generated_noop_ping_performed,
    adapter_identity_bound: v81.generated_adapter_identity_bound,
    adapter_input_schema_locked: v81.generated_adapter_input_schema_locked,
    adapter_output_schema_locked: v81.generated_adapter_output_schema_locked,
    only_noop_payload_allowed: v81.generated_only_noop_payload_allowed,
    status_read_allowed: v81.generated_status_read_allowed,
    task_execution_allowed: v81.generated_task_execution_allowed,
    file_mutation_allowed: v81.generated_file_mutation_allowed,
    shell_execution_allowed: v81.generated_shell_execution_allowed,
    credential_field_allowed: v81.generated_credential_field_allowed,
    browser_session_field_allowed: v81.generated_browser_session_field_allowed,
    cookie_field_allowed: v81.generated_cookie_field_allowed,
    api_key_field_allowed: v81.generated_api_key_field_allowed,
    credential_persistence_allowed: v81.generated_credential_persistence_allowed,
    browser_session_persistence_allowed: v81.generated_browser_session_persistence_allowed,
    cookie_persistence_allowed: v81.generated_cookie_persistence_allowed,
    api_key_persistence_allowed: v81.generated_api_key_persistence_allowed,
    v81_verdict: v81.verdict,
    no_live_execution_tool_called: v81.no_live_execution_tool_called
  };
}

function validateSourceSandbox(sandbox) {
  assert(sandbox && typeof sandbox === 'object', 'source sandbox contract is missing');
  assert(sandbox.v81_verdict === 'PASS', 'v8.1 verifier result must be PASS');
  assert(sandbox.no_live_execution_tool_called === true, 'v8.1 must not call live execution tool');
  assert(sandbox.selected_pilot_task_class === 'noop_live_adapter_ping_only', 'source task class must be no-op live adapter ping only');
  assert(sandbox.operation_type === 'no_op_ping', 'source operation type must be no_op_ping');
  assert(sandbox.target === 'openclaw', 'source adapter target must be openclaw');
  assert(sandbox.agent === 'planner', 'source adapter agent must be planner');
  assert(sandbox.live_tool === 'openclaw_send_task_live', 'source live tool mismatch');
  assert(sandbox.live_call_performed === false, 'source live_call_performed must remain false');
  assert(sandbox.execution_authorized === false, 'source execution_authorized must remain false');
  assert(sandbox.noop_ping_performed === false, 'source noop_ping_performed must remain false');
  assert(sandbox.adapter_identity_bound === true, 'source adapter identity must be bound');
  assert(sandbox.adapter_input_schema_locked === true, 'source input schema must be locked');
  assert(sandbox.adapter_output_schema_locked === true, 'source output schema must be locked');
  assert(sandbox.only_noop_payload_allowed === true, 'source must allow only noop payload');
  assert(sandbox.status_read_allowed === false, 'source status read must be false');
  assert(sandbox.task_execution_allowed === false, 'source task execution must be false');
  assert(sandbox.file_mutation_allowed === false, 'source file mutation must be false');
  assert(sandbox.shell_execution_allowed === false, 'source shell execution must be false');
  assert(sandbox.credential_field_allowed === false, 'source credential field must be false');
  assert(sandbox.browser_session_field_allowed === false, 'source browser session field must be false');
  assert(sandbox.cookie_field_allowed === false, 'source cookie field must be false');
  assert(sandbox.api_key_field_allowed === false, 'source API key field must be false');
  assert(sandbox.credential_persistence_allowed === false, 'source credential persistence must be false');
  assert(sandbox.browser_session_persistence_allowed === false, 'source browser session persistence must be false');
  assert(sandbox.cookie_persistence_allowed === false, 'source cookie persistence must be false');
  assert(sandbox.api_key_persistence_allowed === false, 'source API key persistence must be false');
}

function createPreflight(sandbox, overrides = {}) {
  validateBaselineTags();
  validateSourceSandbox(sandbox);

  const preflight = {
    preflight_contract_id: `approval_receipt_preflight_${sandbox.source_job_id}_v8_2`,
    source_sandbox_contract_id: sandbox.sandbox_contract_id,
    source_task_class_selection_id: sandbox.source_task_class_selection_id,
    source_job_id: sandbox.source_job_id,
    source_v8_phase_charter_tag: sandbox.source_v8_phase_charter_tag,
    source_v8_operator_decision_tag: sandbox.source_v8_operator_decision_tag,
    source_v8_0_stable_tag: sandbox.source_v8_0_stable_tag,
    source_v8_1_stable_tag: sandbox.source_v8_1_stable_tag,
    preflight_mode: 'approval_receipt_materialization_preflight_only',
    preflight_status: 'approval_receipt_materialization_preflight_verified',
    selected_pilot_task_class: sandbox.selected_pilot_task_class,
    operation_type: sandbox.operation_type,
    risk_level: sandbox.risk_level,
    target: sandbox.target,
    agent: sandbox.agent,
    live_tool: sandbox.live_tool,
    adapter_sandbox_required: true,
    adapter_sandbox_verified: true,
    final_operator_approval_required: true,
    final_operator_approval_present: false,
    operator_identity_reference_required: true,
    operator_identity_reference_present: false,
    explicit_approval_text_required: true,
    explicit_approval_text_present: false,
    approval_expiry_required: true,
    approval_expiry_present: false,
    approval_single_use_required: true,
    approval_consumed: false,
    approval_scope_exact_required: true,
    approval_scope_wildcard_allowed: false,
    receipt_materialization_required: true,
    receipt_materialized: false,
    stdout_path_required: true,
    stdout_path_present: false,
    stderr_path_required: true,
    stderr_path_present: false,
    artifact_paths_required: true,
    artifact_paths_present: false,
    rollback_noop_plan_required: true,
    rollback_noop_plan_present: false,
    post_run_verification_required: true,
    post_run_verification_present: false,
    live_call_performed: false,
    execution_authorized: false,
    noop_ping_performed: false,
    credential_persistence_allowed: false,
    browser_session_persistence_allowed: false,
    cookie_persistence_allowed: false,
    api_key_persistence_allowed: false,
    repeated_execution_allowed: false,
    chained_execution_allowed: false,
    autonomous_execution_allowed: false,
    created_at: '2026-05-20T09:00:00.000Z',
    preflight_requirements: {
      adapter_sandbox_verified: true,
      final_operator_approval_required: true,
      operator_identity_reference_required: true,
      explicit_approval_text_required: true,
      approval_expiry_required: true,
      approval_single_use_required: true,
      exact_approval_scope_required: true,
      receipt_materialization_required: true,
      rollback_noop_plan_required: true,
      post_run_verification_required: true
    },
    rejection_rules: {
      reject_final_approval_present_in_v8_2: true,
      reject_operator_identity_present_in_v8_2: true,
      reject_approval_text_present_in_v8_2: true,
      reject_expiry_present_in_v8_2: true,
      reject_approval_consumed_in_v8_2: true,
      reject_wildcard_approval_scope: true,
      reject_receipt_materialized_in_v8_2: true,
      reject_real_paths_in_v8_2: true,
      reject_rollback_plan_present_in_v8_2: true,
      reject_post_run_verification_present_in_v8_2: true,
      reject_live_call_performed_true: true,
      reject_execution_authorized_true: true,
      reject_noop_ping_performed_true: true,
      reject_secret_persistence: true
    },
    safety_boundary: 'v8.2 defines approval binding and receipt materialization preflight only. It does not authorize execution, perform a no-op ping, call live execution tools, allocate real receipt paths, or persist credentials.'
  };

  return { ...preflight, ...overrides };
}

function validatePreflight(preflight, sandbox) {
  assert(preflight && typeof preflight === 'object', 'preflight contract is missing');
  assert(preflight.source_sandbox_contract_id === sandbox.sandbox_contract_id, 'source sandbox contract mismatch');
  assert(preflight.source_task_class_selection_id === sandbox.source_task_class_selection_id, 'source task class selection mismatch');
  assert(preflight.source_job_id === sandbox.source_job_id, 'source_job_id mismatch');
  assert(preflight.source_v8_phase_charter_tag === 'han-agent-bus-v8-phase-charter', 'V8 phase charter tag mismatch');
  assert(preflight.source_v8_operator_decision_tag === 'han-agent-bus-v8-operator-decision-noop-live-adapter-ping', 'V8 operator decision tag mismatch');
  assert(preflight.source_v8_0_stable_tag === 'han-agent-bus-v8.0-stable', 'v8.0 stable tag mismatch');
  assert(preflight.source_v8_1_stable_tag === 'han-agent-bus-v8.1-stable', 'v8.1 stable tag mismatch');
  assert(preflight.preflight_mode === 'approval_receipt_materialization_preflight_only', 'preflight mode mismatch');
  assert(preflight.preflight_status === 'approval_receipt_materialization_preflight_verified', 'preflight status mismatch');
  assert(preflight.selected_pilot_task_class === 'noop_live_adapter_ping_only', 'selected task class mismatch');
  assert(preflight.operation_type === 'no_op_ping', 'operation type mismatch');
  assert(preflight.risk_level === 'low', 'risk level must remain low');
  assert(preflight.target === 'openclaw', 'target must be openclaw');
  assert(preflight.agent === 'planner', 'agent must be planner');
  assert(preflight.live_tool === 'openclaw_send_task_live', 'live tool mismatch');
  assert(preflight.adapter_sandbox_required === true, 'adapter sandbox must be required');
  assert(preflight.adapter_sandbox_verified === true, 'adapter sandbox must be verified');
  assert(preflight.final_operator_approval_required === true, 'final operator approval must be required');
  assert(preflight.final_operator_approval_present === false, 'final operator approval must not be present in v8.2');
  assert(preflight.operator_identity_reference_required === true, 'operator identity reference must be required');
  assert(preflight.operator_identity_reference_present === false, 'operator identity reference must not be present in v8.2');
  assert(preflight.explicit_approval_text_required === true, 'explicit approval text must be required');
  assert(preflight.explicit_approval_text_present === false, 'explicit approval text must not be present in v8.2');
  assert(preflight.approval_expiry_required === true, 'approval expiry must be required');
  assert(preflight.approval_expiry_present === false, 'approval expiry must not be present in v8.2');
  assert(preflight.approval_single_use_required === true, 'single-use approval must be required');
  assert(preflight.approval_consumed === false, 'approval must not be consumed in v8.2');
  assert(preflight.approval_scope_exact_required === true, 'exact approval scope must be required');
  assert(preflight.approval_scope_wildcard_allowed === false, 'wildcard approval scope must not be allowed');
  assert(preflight.receipt_materialization_required === true, 'receipt materialization must be required');
  assert(preflight.receipt_materialized === false, 'receipt must not be materialized in v8.2');
  assert(preflight.stdout_path_required === true, 'stdout path must be required');
  assert(preflight.stdout_path_present === false, 'stdout path must not be present in v8.2');
  assert(preflight.stderr_path_required === true, 'stderr path must be required');
  assert(preflight.stderr_path_present === false, 'stderr path must not be present in v8.2');
  assert(preflight.artifact_paths_required === true, 'artifact paths must be required');
  assert(preflight.artifact_paths_present === false, 'artifact paths must not be present in v8.2');
  assert(preflight.rollback_noop_plan_required === true, 'rollback/no-op plan must be required');
  assert(preflight.rollback_noop_plan_present === false, 'rollback/no-op plan must not be present in v8.2');
  assert(preflight.post_run_verification_required === true, 'post-run verification must be required');
  assert(preflight.post_run_verification_present === false, 'post-run verification must not be present in v8.2');
  assert(preflight.live_call_performed === false, 'live_call_performed must remain false in v8.2');
  assert(preflight.execution_authorized === false, 'execution_authorized must remain false in v8.2');
  assert(preflight.noop_ping_performed === false, 'noop ping must not be performed in v8.2');
  assert(preflight.credential_persistence_allowed === false, 'credential persistence must be false');
  assert(preflight.browser_session_persistence_allowed === false, 'browser session persistence must be false');
  assert(preflight.cookie_persistence_allowed === false, 'cookie persistence must be false');
  assert(preflight.api_key_persistence_allowed === false, 'API key persistence must be false');
  assert(preflight.repeated_execution_allowed === false, 'repeated execution must be false');
  assert(preflight.chained_execution_allowed === false, 'chained execution must be false');
  assert(preflight.autonomous_execution_allowed === false, 'autonomous execution must be false');
  assert(String(preflight.safety_boundary).includes('does not authorize execution'), 'safety boundary must deny authorization');
  assert(String(preflight.safety_boundary).includes('perform a no-op ping'), 'safety boundary must deny no-op ping');
  assert(String(preflight.safety_boundary).includes('call live execution tools'), 'safety boundary must deny live tool calls');
  assert(String(preflight.safety_boundary).includes('allocate real receipt paths'), 'safety boundary must deny real path allocation');
  assert(String(preflight.safety_boundary).includes('persist credentials'), 'safety boundary must deny credential persistence');
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

const v81 = runV81Verifier();
const sandbox = normalizeSandbox(v81);
const validPreflight = createPreflight(sandbox);

const checks = [
  expectPass('valid v8.2 approval binding and receipt materialization preflight passes', () => {
    validatePreflight(validPreflight, sandbox);
  }),
  expectReject('missing source sandbox is rejected', () => {
    createPreflight(null);
  }),
  expectReject('failed v8.1 verifier result is rejected', () => {
    createPreflight({ ...sandbox, v81_verdict: 'FAIL' });
  }),
  expectReject('source sandbox live_call_performed=true is rejected', () => {
    createPreflight({ ...sandbox, live_call_performed: true });
  }),
  expectReject('source sandbox execution_authorized=true is rejected', () => {
    createPreflight({ ...sandbox, execution_authorized: true });
  }),
  expectReject('source sandbox noop_ping_performed=true is rejected', () => {
    createPreflight({ ...sandbox, noop_ping_performed: true });
  }),
  expectReject('final_operator_approval_present=true is rejected', () => {
    validatePreflight(createPreflight(sandbox, { final_operator_approval_present: true }), sandbox);
  }),
  expectReject('operator_identity_reference_present=true is rejected', () => {
    validatePreflight(createPreflight(sandbox, { operator_identity_reference_present: true }), sandbox);
  }),
  expectReject('explicit_approval_text_present=true is rejected', () => {
    validatePreflight(createPreflight(sandbox, { explicit_approval_text_present: true }), sandbox);
  }),
  expectReject('approval_expiry_present=true is rejected', () => {
    validatePreflight(createPreflight(sandbox, { approval_expiry_present: true }), sandbox);
  }),
  expectReject('approval_consumed=true is rejected', () => {
    validatePreflight(createPreflight(sandbox, { approval_consumed: true }), sandbox);
  }),
  expectReject('approval_scope_wildcard_allowed=true is rejected', () => {
    validatePreflight(createPreflight(sandbox, { approval_scope_wildcard_allowed: true }), sandbox);
  }),
  expectReject('receipt_materialized=true is rejected', () => {
    validatePreflight(createPreflight(sandbox, { receipt_materialized: true }), sandbox);
  }),
  expectReject('stdout_path_present=true is rejected', () => {
    validatePreflight(createPreflight(sandbox, { stdout_path_present: true }), sandbox);
  }),
  expectReject('stderr_path_present=true is rejected', () => {
    validatePreflight(createPreflight(sandbox, { stderr_path_present: true }), sandbox);
  }),
  expectReject('artifact_paths_present=true is rejected', () => {
    validatePreflight(createPreflight(sandbox, { artifact_paths_present: true }), sandbox);
  }),
  expectReject('rollback_noop_plan_present=true is rejected', () => {
    validatePreflight(createPreflight(sandbox, { rollback_noop_plan_present: true }), sandbox);
  }),
  expectReject('post_run_verification_present=true is rejected', () => {
    validatePreflight(createPreflight(sandbox, { post_run_verification_present: true }), sandbox);
  }),
  expectReject('preflight live_call_performed=true is rejected', () => {
    validatePreflight(createPreflight(sandbox, { live_call_performed: true }), sandbox);
  }),
  expectReject('preflight execution_authorized=true is rejected', () => {
    validatePreflight(createPreflight(sandbox, { execution_authorized: true }), sandbox);
  }),
  expectReject('preflight noop_ping_performed=true is rejected', () => {
    validatePreflight(createPreflight(sandbox, { noop_ping_performed: true }), sandbox);
  }),
  expectReject('credential persistence allowed is rejected', () => {
    validatePreflight(createPreflight(sandbox, { credential_persistence_allowed: true }), sandbox);
  }),
  expectReject('browser session persistence allowed is rejected', () => {
    validatePreflight(createPreflight(sandbox, { browser_session_persistence_allowed: true }), sandbox);
  }),
  expectReject('cookie persistence allowed is rejected', () => {
    validatePreflight(createPreflight(sandbox, { cookie_persistence_allowed: true }), sandbox);
  }),
  expectReject('API key persistence allowed is rejected', () => {
    validatePreflight(createPreflight(sandbox, { api_key_persistence_allowed: true }), sandbox);
  }),
  expectReject('repeated execution allowed is rejected', () => {
    validatePreflight(createPreflight(sandbox, { repeated_execution_allowed: true }), sandbox);
  }),
  expectReject('chained execution allowed is rejected', () => {
    validatePreflight(createPreflight(sandbox, { chained_execution_allowed: true }), sandbox);
  }),
  expectReject('autonomous execution allowed is rejected', () => {
    validatePreflight(createPreflight(sandbox, { autonomous_execution_allowed: true }), sandbox);
  })
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v8.2',
  verdict,
  source_job_id: validPreflight.source_job_id,
  generated_preflight_mode: validPreflight.preflight_mode,
  generated_preflight_status: validPreflight.preflight_status,
  generated_selected_pilot_task_class: validPreflight.selected_pilot_task_class,
  generated_operation_type: validPreflight.operation_type,
  generated_target: validPreflight.target,
  generated_agent: validPreflight.agent,
  generated_live_tool: validPreflight.live_tool,
  generated_adapter_sandbox_required: validPreflight.adapter_sandbox_required,
  generated_adapter_sandbox_verified: validPreflight.adapter_sandbox_verified,
  generated_final_operator_approval_required: validPreflight.final_operator_approval_required,
  generated_final_operator_approval_present: validPreflight.final_operator_approval_present,
  generated_operator_identity_reference_required: validPreflight.operator_identity_reference_required,
  generated_operator_identity_reference_present: validPreflight.operator_identity_reference_present,
  generated_explicit_approval_text_required: validPreflight.explicit_approval_text_required,
  generated_explicit_approval_text_present: validPreflight.explicit_approval_text_present,
  generated_approval_expiry_required: validPreflight.approval_expiry_required,
  generated_approval_expiry_present: validPreflight.approval_expiry_present,
  generated_approval_single_use_required: validPreflight.approval_single_use_required,
  generated_approval_consumed: validPreflight.approval_consumed,
  generated_approval_scope_exact_required: validPreflight.approval_scope_exact_required,
  generated_approval_scope_wildcard_allowed: validPreflight.approval_scope_wildcard_allowed,
  generated_receipt_materialization_required: validPreflight.receipt_materialization_required,
  generated_receipt_materialized: validPreflight.receipt_materialized,
  generated_stdout_path_required: validPreflight.stdout_path_required,
  generated_stdout_path_present: validPreflight.stdout_path_present,
  generated_stderr_path_required: validPreflight.stderr_path_required,
  generated_stderr_path_present: validPreflight.stderr_path_present,
  generated_artifact_paths_required: validPreflight.artifact_paths_required,
  generated_artifact_paths_present: validPreflight.artifact_paths_present,
  generated_rollback_noop_plan_required: validPreflight.rollback_noop_plan_required,
  generated_rollback_noop_plan_present: validPreflight.rollback_noop_plan_present,
  generated_post_run_verification_required: validPreflight.post_run_verification_required,
  generated_post_run_verification_present: validPreflight.post_run_verification_present,
  generated_live_call_performed: validPreflight.live_call_performed,
  generated_execution_authorized: validPreflight.execution_authorized,
  generated_noop_ping_performed: validPreflight.noop_ping_performed,
  generated_credential_persistence_allowed: validPreflight.credential_persistence_allowed,
  generated_browser_session_persistence_allowed: validPreflight.browser_session_persistence_allowed,
  generated_cookie_persistence_allowed: validPreflight.cookie_persistence_allowed,
  generated_api_key_persistence_allowed: validPreflight.api_key_persistence_allowed,
  no_live_execution_tool_called: true,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
