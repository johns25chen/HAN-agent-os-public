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
}

function runV80Verifier() {
  const result = spawnSync(
    process.execPath,
    ['scripts/han-agent-bus/verify-v8.0-pilot-task-class-selection-and-threat-model.mjs'],
    { encoding: 'utf8' }
  );

  if (result.status !== 0) {
    throw new Error(`v8.0 verifier failed: ${result.stderr || result.stdout}`);
  }

  return JSON.parse(result.stdout);
}

function normalizeTaskClassSelection(v80) {
  return {
    task_class_selection_id: `task_class_selection_${v80.source_job_id}_v8_0`,
    source_job_id: v80.source_job_id,
    source_v8_phase_charter_tag: 'han-agent-bus-v8-phase-charter',
    source_v8_operator_decision_tag: 'han-agent-bus-v8-operator-decision-noop-live-adapter-ping',
    source_v8_0_stable_tag: 'han-agent-bus-v8.0-stable',
    selected_pilot_task_class: v80.generated_selected_pilot_task_class,
    operation_type: v80.generated_operation_type,
    risk_level: v80.generated_risk_level,
    target: 'openclaw',
    agent: 'planner',
    planned_live_tool: 'openclaw_send_task_live',
    live_call_performed: v80.generated_live_call_performed,
    execution_authorized: v80.generated_execution_authorized,
    operation_has_business_side_effect: v80.generated_operation_has_business_side_effect,
    credential_access_allowed: v80.generated_credential_access_allowed,
    browser_session_access_allowed: v80.generated_browser_session_access_allowed,
    cookie_access_allowed: v80.generated_cookie_access_allowed,
    api_key_access_allowed: v80.generated_api_key_access_allowed,
    repeated_execution_allowed: v80.generated_repeated_execution_allowed,
    chained_execution_allowed: v80.generated_chained_execution_allowed,
    autonomous_execution_allowed: v80.generated_autonomous_execution_allowed,
    approval_scope_wildcard_allowed: v80.generated_approval_scope_wildcard_allowed,
    receipt_required_in_future_gate: v80.generated_receipt_required_in_future_gate,
    rollback_required_in_future_gate: v80.generated_rollback_required_in_future_gate,
    post_run_verification_required_in_future_gate: v80.generated_post_run_verification_required_in_future_gate,
    v80_verdict: v80.verdict,
    no_live_execution_tool_called: v80.no_live_execution_tool_called
  };
}

function validateSourceSelection(selection) {
  assert(selection && typeof selection === 'object', 'source task class selection is missing');
  assert(selection.v80_verdict === 'PASS', 'v8.0 verifier result must be PASS');
  assert(selection.no_live_execution_tool_called === true, 'v8.0 must not call live execution tool');
  assert(selection.selected_pilot_task_class === 'noop_live_adapter_ping_only', 'source task class must be no-op live adapter ping only');
  assert(selection.operation_type === 'no_op_ping', 'source operation type must be no_op_ping');
  assert(selection.risk_level === 'low', 'source risk level must remain low');
  assert(selection.live_call_performed === false, 'source live_call_performed must remain false');
  assert(selection.execution_authorized === false, 'source execution_authorized must remain false');
  assert(selection.operation_has_business_side_effect === false, 'source operation must have no business side effect');
  assert(selection.credential_access_allowed === false, 'source credential access must be false');
  assert(selection.browser_session_access_allowed === false, 'source browser session access must be false');
  assert(selection.cookie_access_allowed === false, 'source cookie access must be false');
  assert(selection.api_key_access_allowed === false, 'source API key access must be false');
  assert(selection.repeated_execution_allowed === false, 'source repeated execution must be false');
  assert(selection.chained_execution_allowed === false, 'source chained execution must be false');
  assert(selection.autonomous_execution_allowed === false, 'source autonomous execution must be false');
  assert(selection.approval_scope_wildcard_allowed === false, 'source wildcard approval scope must be false');
  assert(selection.receipt_required_in_future_gate === true, 'source future receipt requirement must be true');
  assert(selection.rollback_required_in_future_gate === true, 'source future rollback requirement must be true');
  assert(selection.post_run_verification_required_in_future_gate === true, 'source future post-run verification requirement must be true');
}

function createSandboxContract(selection, overrides = {}) {
  validateBaselineTags();
  validateSourceSelection(selection);

  const sandbox = {
    sandbox_contract_id: `live_adapter_sandbox_${selection.source_job_id}_v8_1`,
    source_task_class_selection_id: selection.task_class_selection_id,
    source_job_id: selection.source_job_id,
    source_v8_phase_charter_tag: selection.source_v8_phase_charter_tag,
    source_v8_operator_decision_tag: selection.source_v8_operator_decision_tag,
    source_v8_0_stable_tag: selection.source_v8_0_stable_tag,
    sandbox_mode: 'sandbox_contract_only',
    sandbox_status: 'live_adapter_sandbox_contract_verified',
    selected_pilot_task_class: selection.selected_pilot_task_class,
    allowed_operation_type: selection.operation_type,
    risk_level: selection.risk_level,
    adapter_target: selection.target,
    adapter_agent: selection.agent,
    allowed_live_tool: selection.planned_live_tool,
    live_call_performed: false,
    execution_authorized: false,
    noop_ping_performed: false,
    adapter_identity_bound: true,
    adapter_input_schema_locked: true,
    adapter_output_schema_locked: true,
    only_noop_payload_allowed: true,
    status_read_allowed: false,
    task_execution_allowed: false,
    file_mutation_allowed: false,
    shell_execution_allowed: false,
    credential_field_allowed: false,
    browser_session_field_allowed: false,
    cookie_field_allowed: false,
    api_key_field_allowed: false,
    credential_persistence_allowed: false,
    browser_session_persistence_allowed: false,
    cookie_persistence_allowed: false,
    api_key_persistence_allowed: false,
    repeated_execution_allowed: false,
    chained_execution_allowed: false,
    autonomous_execution_allowed: false,
    receipt_required_in_future_gate: true,
    rollback_required_in_future_gate: true,
    post_run_verification_required_in_future_gate: true,
    created_at: '2026-05-20T08:40:00.000Z',
    allowed_adapter_input: {
      noop_payload_only: true,
      source_job_id_required: true,
      adapter_target_required: true,
      adapter_agent_required: true,
      requested_operation_must_equal_no_op_ping: true
    },
    forbidden_adapter_input: {
      credentials: true,
      browser_session: true,
      cookies: true,
      api_keys: true,
      shell_commands: true,
      file_paths_for_mutation: true,
      status_read_request: true,
      task_execution_request: true
    },
    allowed_adapter_output: {
      sandbox_contract_ack_only: true,
      no_runtime_secret_output: true,
      no_session_output: true,
      no_cookie_output: true,
      no_api_key_output: true
    },
    forbidden_adapter_output: {
      credentials: true,
      browser_session: true,
      cookies: true,
      api_keys: true,
      file_mutation_result: true,
      shell_execution_result: true,
      status_read_result: true
    },
    safety_boundary: 'v8.1 defines the live adapter sandbox contract only. It does not authorize execution, perform a no-op ping, call live execution tools, mutate state, or access credentials.'
  };

  return { ...sandbox, ...overrides };
}

function validateSandboxContract(sandbox, selection) {
  assert(sandbox && typeof sandbox === 'object', 'sandbox contract is missing');
  assert(sandbox.source_task_class_selection_id === selection.task_class_selection_id, 'source task class selection mismatch');
  assert(sandbox.source_job_id === selection.source_job_id, 'source_job_id mismatch');
  assert(sandbox.source_v8_phase_charter_tag === 'han-agent-bus-v8-phase-charter', 'V8 phase charter tag mismatch');
  assert(sandbox.source_v8_operator_decision_tag === 'han-agent-bus-v8-operator-decision-noop-live-adapter-ping', 'V8 operator decision tag mismatch');
  assert(sandbox.source_v8_0_stable_tag === 'han-agent-bus-v8.0-stable', 'v8.0 stable tag mismatch');
  assert(sandbox.sandbox_mode === 'sandbox_contract_only', 'sandbox mode must be sandbox_contract_only');
  assert(sandbox.sandbox_status === 'live_adapter_sandbox_contract_verified', 'sandbox status mismatch');
  assert(sandbox.selected_pilot_task_class === 'noop_live_adapter_ping_only', 'selected task class mismatch');
  assert(sandbox.allowed_operation_type === 'no_op_ping', 'allowed operation must be no_op_ping');
  assert(sandbox.risk_level === 'low', 'risk level must remain low');
  assert(sandbox.adapter_target === 'openclaw', 'adapter target must be openclaw');
  assert(sandbox.adapter_agent === 'planner', 'adapter agent must be planner');
  assert(sandbox.allowed_live_tool === 'openclaw_send_task_live', 'allowed live tool mismatch');
  assert(sandbox.live_call_performed === false, 'live_call_performed must remain false in v8.1');
  assert(sandbox.execution_authorized === false, 'execution_authorized must remain false in v8.1');
  assert(sandbox.noop_ping_performed === false, 'noop ping must not be performed in v8.1');
  assert(sandbox.adapter_identity_bound === true, 'adapter identity must be bound');
  assert(sandbox.adapter_input_schema_locked === true, 'adapter input schema must be locked');
  assert(sandbox.adapter_output_schema_locked === true, 'adapter output schema must be locked');
  assert(sandbox.only_noop_payload_allowed === true, 'only noop payload must be allowed');
  assert(sandbox.status_read_allowed === false, 'status read must not be allowed');
  assert(sandbox.task_execution_allowed === false, 'task execution must not be allowed');
  assert(sandbox.file_mutation_allowed === false, 'file mutation must not be allowed');
  assert(sandbox.shell_execution_allowed === false, 'shell execution must not be allowed');
  assert(sandbox.credential_field_allowed === false, 'credential field must not be allowed');
  assert(sandbox.browser_session_field_allowed === false, 'browser session field must not be allowed');
  assert(sandbox.cookie_field_allowed === false, 'cookie field must not be allowed');
  assert(sandbox.api_key_field_allowed === false, 'API key field must not be allowed');
  assert(sandbox.credential_persistence_allowed === false, 'credential persistence must not be allowed');
  assert(sandbox.browser_session_persistence_allowed === false, 'browser session persistence must not be allowed');
  assert(sandbox.cookie_persistence_allowed === false, 'cookie persistence must not be allowed');
  assert(sandbox.api_key_persistence_allowed === false, 'API key persistence must not be allowed');
  assert(sandbox.repeated_execution_allowed === false, 'repeated execution must not be allowed');
  assert(sandbox.chained_execution_allowed === false, 'chained execution must not be allowed');
  assert(sandbox.autonomous_execution_allowed === false, 'autonomous execution must not be allowed');
  assert(sandbox.receipt_required_in_future_gate === true, 'future receipt requirement must be true');
  assert(sandbox.rollback_required_in_future_gate === true, 'future rollback requirement must be true');
  assert(sandbox.post_run_verification_required_in_future_gate === true, 'future post-run verification requirement must be true');
  assert(sandbox.allowed_adapter_input?.noop_payload_only === true, 'allowed input must be noop payload only');
  assert(sandbox.forbidden_adapter_input?.credentials === true, 'forbidden input must include credentials');
  assert(sandbox.forbidden_adapter_input?.browser_session === true, 'forbidden input must include browser session');
  assert(sandbox.forbidden_adapter_input?.cookies === true, 'forbidden input must include cookies');
  assert(sandbox.forbidden_adapter_input?.api_keys === true, 'forbidden input must include API keys');
  assert(sandbox.forbidden_adapter_output?.credentials === true, 'forbidden output must include credentials');
  assert(String(sandbox.safety_boundary).includes('does not authorize execution'), 'safety boundary must deny authorization');
  assert(String(sandbox.safety_boundary).includes('perform a no-op ping'), 'safety boundary must deny no-op ping');
  assert(String(sandbox.safety_boundary).includes('call live execution tools'), 'safety boundary must deny live tool calls');
  assert(String(sandbox.safety_boundary).includes('mutate state'), 'safety boundary must deny mutation');
  assert(String(sandbox.safety_boundary).includes('access credentials'), 'safety boundary must deny credential access');
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

const v80 = runV80Verifier();
const selection = normalizeTaskClassSelection(v80);
const validSandbox = createSandboxContract(selection);

const checks = [
  expectPass('valid v8.1 live adapter sandbox contract passes', () => {
    validateSandboxContract(validSandbox, selection);
  }),
  expectReject('missing source task class selection is rejected', () => {
    createSandboxContract(null);
  }),
  expectReject('failed v8.0 verifier result is rejected', () => {
    createSandboxContract({ ...selection, v80_verdict: 'FAIL' });
  }),
  expectReject('source task class other than no-op ping is rejected', () => {
    createSandboxContract({ ...selection, selected_pilot_task_class: 'status_read_only' });
  }),
  expectReject('sandbox live_call_performed=true is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { live_call_performed: true }), selection);
  }),
  expectReject('sandbox execution_authorized=true is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { execution_authorized: true }), selection);
  }),
  expectReject('noop_ping_performed=true is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { noop_ping_performed: true }), selection);
  }),
  expectReject('adapter target mismatch is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { adapter_target: 'shell' }), selection);
  }),
  expectReject('adapter agent mismatch is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { adapter_agent: 'executor' }), selection);
  }),
  expectReject('allowed live tool mismatch is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { allowed_live_tool: 'shell_exec' }), selection);
  }),
  expectReject('unlocked adapter input schema is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { adapter_input_schema_locked: false }), selection);
  }),
  expectReject('unlocked adapter output schema is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { adapter_output_schema_locked: false }), selection);
  }),
  expectReject('status read allowed is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { status_read_allowed: true }), selection);
  }),
  expectReject('task execution allowed is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { task_execution_allowed: true }), selection);
  }),
  expectReject('file mutation allowed is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { file_mutation_allowed: true }), selection);
  }),
  expectReject('shell execution allowed is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { shell_execution_allowed: true }), selection);
  }),
  expectReject('credential field allowed is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { credential_field_allowed: true }), selection);
  }),
  expectReject('browser session field allowed is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { browser_session_field_allowed: true }), selection);
  }),
  expectReject('cookie field allowed is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { cookie_field_allowed: true }), selection);
  }),
  expectReject('API key field allowed is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { api_key_field_allowed: true }), selection);
  }),
  expectReject('credential persistence allowed is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { credential_persistence_allowed: true }), selection);
  }),
  expectReject('browser session persistence allowed is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { browser_session_persistence_allowed: true }), selection);
  }),
  expectReject('cookie persistence allowed is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { cookie_persistence_allowed: true }), selection);
  }),
  expectReject('API key persistence allowed is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { api_key_persistence_allowed: true }), selection);
  }),
  expectReject('repeated execution allowed is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { repeated_execution_allowed: true }), selection);
  }),
  expectReject('chained execution allowed is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { chained_execution_allowed: true }), selection);
  }),
  expectReject('autonomous execution allowed is rejected', () => {
    validateSandboxContract(createSandboxContract(selection, { autonomous_execution_allowed: true }), selection);
  })
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v8.1',
  verdict,
  source_job_id: validSandbox.source_job_id,
  generated_sandbox_mode: validSandbox.sandbox_mode,
  generated_sandbox_status: validSandbox.sandbox_status,
  generated_selected_pilot_task_class: validSandbox.selected_pilot_task_class,
  generated_allowed_operation_type: validSandbox.allowed_operation_type,
  generated_adapter_target: validSandbox.adapter_target,
  generated_adapter_agent: validSandbox.adapter_agent,
  generated_allowed_live_tool: validSandbox.allowed_live_tool,
  generated_live_call_performed: validSandbox.live_call_performed,
  generated_execution_authorized: validSandbox.execution_authorized,
  generated_noop_ping_performed: validSandbox.noop_ping_performed,
  generated_adapter_identity_bound: validSandbox.adapter_identity_bound,
  generated_adapter_input_schema_locked: validSandbox.adapter_input_schema_locked,
  generated_adapter_output_schema_locked: validSandbox.adapter_output_schema_locked,
  generated_only_noop_payload_allowed: validSandbox.only_noop_payload_allowed,
  generated_status_read_allowed: validSandbox.status_read_allowed,
  generated_task_execution_allowed: validSandbox.task_execution_allowed,
  generated_file_mutation_allowed: validSandbox.file_mutation_allowed,
  generated_shell_execution_allowed: validSandbox.shell_execution_allowed,
  generated_credential_field_allowed: validSandbox.credential_field_allowed,
  generated_browser_session_field_allowed: validSandbox.browser_session_field_allowed,
  generated_cookie_field_allowed: validSandbox.cookie_field_allowed,
  generated_api_key_field_allowed: validSandbox.api_key_field_allowed,
  generated_credential_persistence_allowed: validSandbox.credential_persistence_allowed,
  generated_browser_session_persistence_allowed: validSandbox.browser_session_persistence_allowed,
  generated_cookie_persistence_allowed: validSandbox.cookie_persistence_allowed,
  generated_api_key_persistence_allowed: validSandbox.api_key_persistence_allowed,
  no_live_execution_tool_called: true,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
