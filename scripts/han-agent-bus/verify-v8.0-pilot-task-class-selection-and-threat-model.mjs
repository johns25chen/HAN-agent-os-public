import { spawnSync } from 'node:child_process';

const sourceJobId = 'job_20260519115852_b784842d';

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

function validateBaselines() {
  assert(tagExists('han-agent-bus-v6-final-stable'), 'missing V6 final stable tag');
  assert(tagExists('han-agent-bus-v7-final-stable'), 'missing V7 final stable tag');
  assert(tagExists('han-agent-bus-v8-phase-charter'), 'missing V8 phase charter tag');
  assert(tagExists('han-agent-bus-v8-operator-decision-noop-live-adapter-ping'), 'missing V8 no-op live adapter ping operator decision tag');
}

function createTaskClassSelection(overrides = {}) {
  validateBaselines();

  const selection = {
    task_class_selection_id: `task_class_selection_${sourceJobId}_v8_0`,
    source_v8_phase_charter_tag: 'han-agent-bus-v8-phase-charter',
    source_v8_operator_decision_tag: 'han-agent-bus-v8-operator-decision-noop-live-adapter-ping',
    source_job_id: sourceJobId,
    task_class_mode: 'selection_and_threat_model_only',
    task_class_status: 'noop_live_adapter_ping_selected',
    selected_pilot_task_class: 'noop_live_adapter_ping_only',
    operation_type: 'no_op_ping',
    risk_level: 'low',
    target: 'openclaw',
    agent: 'planner',
    planned_live_tool: 'openclaw_send_task_live',
    live_call_performed: false,
    execution_authorized: false,
    operation_has_business_side_effect: false,
    file_mutation_allowed: false,
    shell_mutation_allowed: false,
    credential_access_allowed: false,
    browser_session_access_allowed: false,
    cookie_access_allowed: false,
    api_key_access_allowed: false,
    account_change_allowed: false,
    permission_change_allowed: false,
    network_scanning_allowed: false,
    repeated_execution_allowed: false,
    chained_execution_allowed: false,
    autonomous_execution_allowed: false,
    approval_scope_wildcard_allowed: false,
    receipt_required_in_future_gate: true,
    rollback_required_in_future_gate: true,
    post_run_verification_required_in_future_gate: true,
    created_at: '2026-05-20T08:25:00.000Z',
    allowed_operation_definition: {
      no_op_only: true,
      single_action_only: true,
      no_business_side_effect: true,
      no_state_mutation: true,
      adapter_identity_binding_required: true
    },
    disallowed_operation_definition: {
      status_read: true,
      task_execution: true,
      shell_execution: true,
      file_mutation: true,
      credential_access: true,
      browser_session_access: true,
      cookie_access: true,
      api_key_access: true,
      repeated_execution: true,
      chained_execution: true,
      autonomous_execution: true
    },
    threat_model: {
      accidental_scope_expansion: 'reject',
      hidden_side_effect: 'reject',
      credential_exposure: 'reject',
      session_persistence: 'reject',
      approval_reuse: 'reject',
      wildcard_scope: 'reject'
    },
    hard_stop_conditions: {
      live_call_before_v8_3: true,
      execution_authorized_before_v8_3: true,
      selected_task_class_not_noop_ping: true,
      any_secret_access: true,
      any_mutation: true,
      repeated_or_chained_execution: true
    },
    safety_boundary: 'v8.0 selects and threat-models the no-op live adapter ping task class only. It does not authorize execution, perform live calls, mutate state, or access credentials.'
  };

  return { ...selection, ...overrides };
}

function validateTaskClassSelection(selection) {
  assert(selection && typeof selection === 'object', 'task class selection is missing');
  assert(selection.source_v8_phase_charter_tag === 'han-agent-bus-v8-phase-charter', 'V8 phase charter tag mismatch');
  assert(selection.source_v8_operator_decision_tag === 'han-agent-bus-v8-operator-decision-noop-live-adapter-ping', 'V8 operator decision tag mismatch');
  assert(selection.source_job_id === sourceJobId, 'source_job_id mismatch');
  assert(selection.task_class_mode === 'selection_and_threat_model_only', 'task class mode must be selection_and_threat_model_only');
  assert(selection.task_class_status === 'noop_live_adapter_ping_selected', 'task class status mismatch');
  assert(selection.selected_pilot_task_class === 'noop_live_adapter_ping_only', 'selected pilot task class must be no-op live adapter ping only');
  assert(selection.operation_type === 'no_op_ping', 'operation type must be no_op_ping');
  assert(selection.risk_level === 'low', 'risk level must remain low');
  assert(selection.target === 'openclaw', 'target must be openclaw');
  assert(selection.agent === 'planner', 'agent must be planner');
  assert(selection.planned_live_tool === 'openclaw_send_task_live', 'planned live tool mismatch');
  assert(selection.live_call_performed === false, 'live_call_performed must remain false in v8.0');
  assert(selection.execution_authorized === false, 'execution_authorized must remain false in v8.0');
  assert(selection.operation_has_business_side_effect === false, 'operation must have no business side effect');
  assert(selection.file_mutation_allowed === false, 'file mutation must not be allowed');
  assert(selection.shell_mutation_allowed === false, 'shell mutation must not be allowed');
  assert(selection.credential_access_allowed === false, 'credential access must not be allowed');
  assert(selection.browser_session_access_allowed === false, 'browser session access must not be allowed');
  assert(selection.cookie_access_allowed === false, 'cookie access must not be allowed');
  assert(selection.api_key_access_allowed === false, 'API key access must not be allowed');
  assert(selection.account_change_allowed === false, 'account change must not be allowed');
  assert(selection.permission_change_allowed === false, 'permission change must not be allowed');
  assert(selection.network_scanning_allowed === false, 'network scanning must not be allowed');
  assert(selection.repeated_execution_allowed === false, 'repeated execution must not be allowed');
  assert(selection.chained_execution_allowed === false, 'chained execution must not be allowed');
  assert(selection.autonomous_execution_allowed === false, 'autonomous execution must not be allowed');
  assert(selection.approval_scope_wildcard_allowed === false, 'wildcard approval scope must not be allowed');
  assert(selection.receipt_required_in_future_gate === true, 'future receipt requirement must be true');
  assert(selection.rollback_required_in_future_gate === true, 'future rollback requirement must be true');
  assert(selection.post_run_verification_required_in_future_gate === true, 'future post-run verification requirement must be true');
  assert(selection.allowed_operation_definition?.no_op_only === true, 'allowed operation must be no-op only');
  assert(selection.disallowed_operation_definition?.status_read === true, 'status-read operation must remain disallowed in v8.0');
  assert(selection.threat_model?.credential_exposure === 'reject', 'threat model must reject credential exposure');
  assert(selection.hard_stop_conditions?.live_call_before_v8_3 === true, 'hard stop must block live call before v8.3');
  assert(String(selection.safety_boundary).includes('does not authorize execution'), 'safety boundary must deny authorization');
  assert(String(selection.safety_boundary).includes('perform live calls'), 'safety boundary must deny live calls');
  assert(String(selection.safety_boundary).includes('mutate state'), 'safety boundary must deny state mutation');
  assert(String(selection.safety_boundary).includes('access credentials'), 'safety boundary must deny credential access');
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

const validSelection = createTaskClassSelection();

const checks = [
  expectPass('valid v8.0 no-op live adapter ping task class selection passes', () => {
    validateTaskClassSelection(validSelection);
  }),
  expectReject('missing task class selection is rejected', () => {
    validateTaskClassSelection(null);
  }),
  expectReject('wrong V8 phase charter tag is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ source_v8_phase_charter_tag: 'wrong-tag' }));
  }),
  expectReject('wrong V8 operator decision tag is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ source_v8_operator_decision_tag: 'wrong-tag' }));
  }),
  expectReject('selected task class other than no-op ping is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ selected_pilot_task_class: 'status_read_only' }));
  }),
  expectReject('operation type other than no_op_ping is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ operation_type: 'status_read' }));
  }),
  expectReject('risk above low is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ risk_level: 'medium' }));
  }),
  expectReject('live_call_performed=true is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ live_call_performed: true }));
  }),
  expectReject('execution_authorized=true is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ execution_authorized: true }));
  }),
  expectReject('business side effect is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ operation_has_business_side_effect: true }));
  }),
  expectReject('file mutation allowed is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ file_mutation_allowed: true }));
  }),
  expectReject('shell mutation allowed is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ shell_mutation_allowed: true }));
  }),
  expectReject('credential access allowed is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ credential_access_allowed: true }));
  }),
  expectReject('browser session access allowed is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ browser_session_access_allowed: true }));
  }),
  expectReject('cookie access allowed is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ cookie_access_allowed: true }));
  }),
  expectReject('API key access allowed is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ api_key_access_allowed: true }));
  }),
  expectReject('account change allowed is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ account_change_allowed: true }));
  }),
  expectReject('permission change allowed is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ permission_change_allowed: true }));
  }),
  expectReject('network scanning allowed is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ network_scanning_allowed: true }));
  }),
  expectReject('repeated execution allowed is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ repeated_execution_allowed: true }));
  }),
  expectReject('chained execution allowed is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ chained_execution_allowed: true }));
  }),
  expectReject('autonomous execution allowed is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ autonomous_execution_allowed: true }));
  }),
  expectReject('wildcard approval scope allowed is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ approval_scope_wildcard_allowed: true }));
  }),
  expectReject('missing future receipt requirement is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ receipt_required_in_future_gate: false }));
  }),
  expectReject('missing future rollback requirement is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ rollback_required_in_future_gate: false }));
  }),
  expectReject('missing future post-run verification requirement is rejected', () => {
    validateTaskClassSelection(createTaskClassSelection({ post_run_verification_required_in_future_gate: false }));
  })
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v8.0',
  verdict,
  source_job_id: validSelection.source_job_id,
  generated_task_class_mode: validSelection.task_class_mode,
  generated_task_class_status: validSelection.task_class_status,
  generated_selected_pilot_task_class: validSelection.selected_pilot_task_class,
  generated_operation_type: validSelection.operation_type,
  generated_risk_level: validSelection.risk_level,
  generated_live_call_performed: validSelection.live_call_performed,
  generated_execution_authorized: validSelection.execution_authorized,
  generated_operation_has_business_side_effect: validSelection.operation_has_business_side_effect,
  generated_file_mutation_allowed: validSelection.file_mutation_allowed,
  generated_shell_mutation_allowed: validSelection.shell_mutation_allowed,
  generated_credential_access_allowed: validSelection.credential_access_allowed,
  generated_browser_session_access_allowed: validSelection.browser_session_access_allowed,
  generated_cookie_access_allowed: validSelection.cookie_access_allowed,
  generated_api_key_access_allowed: validSelection.api_key_access_allowed,
  generated_repeated_execution_allowed: validSelection.repeated_execution_allowed,
  generated_chained_execution_allowed: validSelection.chained_execution_allowed,
  generated_autonomous_execution_allowed: validSelection.autonomous_execution_allowed,
  generated_approval_scope_wildcard_allowed: validSelection.approval_scope_wildcard_allowed,
  generated_receipt_required_in_future_gate: validSelection.receipt_required_in_future_gate,
  generated_rollback_required_in_future_gate: validSelection.rollback_required_in_future_gate,
  generated_post_run_verification_required_in_future_gate: validSelection.post_run_verification_required_in_future_gate,
  no_live_execution_tool_called: true,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
