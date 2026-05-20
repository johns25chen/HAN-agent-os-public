import { spawnSync } from 'node:child_process';

const expectedApprovalText = 'I approve exactly one v8.3 no-op live adapter ping for source_job_id job_20260519115852_b784842d, target openclaw, agent planner, live tool openclaw_send_task_live, with exact scope, single-use approval, receipt materialization, rollback/no-op record, post-run verification, and no credential, browser session, cookie, or API key persistence.';

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
  assert(tagExists('han-agent-bus-v8.3-final-operator-approval-decision-gate'), 'missing v8.3 final operator approval decision gate tag');
}

function createApprovalRecord(overrides = {}) {
  validateBaselineTags();

  const record = {
    approval_record_id: 'final_operator_approval_job_20260519115852_b784842d_v8_3',
    source_job_id: 'job_20260519115852_b784842d',
    source_v8_2_stable_tag: 'han-agent-bus-v8.2-stable',
    source_v8_3_decision_gate_tag: 'han-agent-bus-v8.3-final-operator-approval-decision-gate',
    approval_text: expectedApprovalText,
    approval_text_present: true,
    approval_text_exact_match: true,
    selected_pilot_task_class: 'noop_live_adapter_ping_only',
    operation_type: 'no_op_ping',
    target: 'openclaw',
    agent: 'planner',
    live_tool: 'openclaw_send_task_live',
    execution_count: 1,
    approval_scope_exact: true,
    approval_scope_wildcard_allowed: false,
    single_use_approval: true,
    approval_consumed: false,
    receipt_materialization_required: true,
    rollback_noop_record_required: true,
    post_run_verification_required: true,
    credential_persistence_allowed: false,
    browser_session_persistence_allowed: false,
    cookie_persistence_allowed: false,
    api_key_persistence_allowed: false,
    execution_authorized_for_future_package: true,
    live_call_performed: false,
    noop_ping_performed: false,
    created_at: '2026-05-20T09:30:00.000Z',
    safety_boundary: 'v8.3 final approval record verifies approval text only. It does not perform a no-op ping, call live execution tools, materialize a live receipt, or persist credentials.'
  };

  return { ...record, ...overrides };
}

function validateApprovalRecord(record) {
  assert(record && typeof record === 'object', 'approval record is missing');
  assert(record.source_job_id === 'job_20260519115852_b784842d', 'source_job_id mismatch');
  assert(record.source_v8_2_stable_tag === 'han-agent-bus-v8.2-stable', 'v8.2 stable tag mismatch');
  assert(record.source_v8_3_decision_gate_tag === 'han-agent-bus-v8.3-final-operator-approval-decision-gate', 'v8.3 decision gate tag mismatch');
  assert(record.approval_text_present === true, 'approval text must be present');
  assert(record.approval_text === expectedApprovalText, 'approval text mismatch');
  assert(record.approval_text_exact_match === true, 'approval text exact match must be true');
  assert(record.selected_pilot_task_class === 'noop_live_adapter_ping_only', 'selected task class mismatch');
  assert(record.operation_type === 'no_op_ping', 'operation type mismatch');
  assert(record.target === 'openclaw', 'target mismatch');
  assert(record.agent === 'planner', 'agent mismatch');
  assert(record.live_tool === 'openclaw_send_task_live', 'live tool mismatch');
  assert(record.execution_count === 1, 'execution count must be exactly one');
  assert(record.approval_scope_exact === true, 'approval scope must be exact');
  assert(record.approval_scope_wildcard_allowed === false, 'wildcard approval scope must not be allowed');
  assert(record.single_use_approval === true, 'single-use approval must be true');
  assert(record.approval_consumed === false, 'approval must not be consumed yet');
  assert(record.receipt_materialization_required === true, 'receipt materialization must be required');
  assert(record.rollback_noop_record_required === true, 'rollback/no-op record must be required');
  assert(record.post_run_verification_required === true, 'post-run verification must be required');
  assert(record.credential_persistence_allowed === false, 'credential persistence must be false');
  assert(record.browser_session_persistence_allowed === false, 'browser session persistence must be false');
  assert(record.cookie_persistence_allowed === false, 'cookie persistence must be false');
  assert(record.api_key_persistence_allowed === false, 'API key persistence must be false');
  assert(record.execution_authorized_for_future_package === true, 'future package authorization must be true');
  assert(record.live_call_performed === false, 'live call must not be performed by approval record');
  assert(record.noop_ping_performed === false, 'noop ping must not be performed by approval record');
  assert(String(record.safety_boundary).includes('does not perform a no-op ping'), 'safety boundary must deny no-op ping');
  assert(String(record.safety_boundary).includes('call live execution tools'), 'safety boundary must deny live tool calls');
  assert(String(record.safety_boundary).includes('materialize a live receipt'), 'safety boundary must deny live receipt materialization');
  assert(String(record.safety_boundary).includes('persist credentials'), 'safety boundary must deny credential persistence');
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

const validRecord = createApprovalRecord();

const checks = [
  expectPass('valid v8.3 final operator approval record passes', () => {
    validateApprovalRecord(validRecord);
  }),
  expectReject('missing approval record is rejected', () => {
    validateApprovalRecord(null);
  }),
  expectReject('approval text mismatch is rejected', () => {
    validateApprovalRecord(createApprovalRecord({ approval_text: 'generic approval' }));
  }),
  expectReject('wrong source_job_id is rejected', () => {
    validateApprovalRecord(createApprovalRecord({ source_job_id: 'job_wrong' }));
  }),
  expectReject('wrong target is rejected', () => {
    validateApprovalRecord(createApprovalRecord({ target: 'shell' }));
  }),
  expectReject('wrong agent is rejected', () => {
    validateApprovalRecord(createApprovalRecord({ agent: 'executor' }));
  }),
  expectReject('wrong live tool is rejected', () => {
    validateApprovalRecord(createApprovalRecord({ live_tool: 'shell_exec' }));
  }),
  expectReject('execution count other than one is rejected', () => {
    validateApprovalRecord(createApprovalRecord({ execution_count: 2 }));
  }),
  expectReject('wildcard approval scope is rejected', () => {
    validateApprovalRecord(createApprovalRecord({ approval_scope_wildcard_allowed: true }));
  }),
  expectReject('reusable approval is rejected', () => {
    validateApprovalRecord(createApprovalRecord({ single_use_approval: false }));
  }),
  expectReject('consumed approval is rejected', () => {
    validateApprovalRecord(createApprovalRecord({ approval_consumed: true }));
  }),
  expectReject('missing receipt materialization requirement is rejected', () => {
    validateApprovalRecord(createApprovalRecord({ receipt_materialization_required: false }));
  }),
  expectReject('missing rollback/no-op record requirement is rejected', () => {
    validateApprovalRecord(createApprovalRecord({ rollback_noop_record_required: false }));
  }),
  expectReject('missing post-run verification requirement is rejected', () => {
    validateApprovalRecord(createApprovalRecord({ post_run_verification_required: false }));
  }),
  expectReject('credential persistence allowed is rejected', () => {
    validateApprovalRecord(createApprovalRecord({ credential_persistence_allowed: true }));
  }),
  expectReject('browser session persistence allowed is rejected', () => {
    validateApprovalRecord(createApprovalRecord({ browser_session_persistence_allowed: true }));
  }),
  expectReject('cookie persistence allowed is rejected', () => {
    validateApprovalRecord(createApprovalRecord({ cookie_persistence_allowed: true }));
  }),
  expectReject('API key persistence allowed is rejected', () => {
    validateApprovalRecord(createApprovalRecord({ api_key_persistence_allowed: true }));
  }),
  expectReject('live_call_performed=true is rejected in approval record', () => {
    validateApprovalRecord(createApprovalRecord({ live_call_performed: true }));
  }),
  expectReject('noop_ping_performed=true is rejected in approval record', () => {
    validateApprovalRecord(createApprovalRecord({ noop_ping_performed: true }));
  })
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v8.3-approval-record',
  verdict,
  source_job_id: validRecord.source_job_id,
  approval_record_id: validRecord.approval_record_id,
  approval_text_present: validRecord.approval_text_present,
  approval_text_exact_match: validRecord.approval_text_exact_match,
  selected_pilot_task_class: validRecord.selected_pilot_task_class,
  operation_type: validRecord.operation_type,
  target: validRecord.target,
  agent: validRecord.agent,
  live_tool: validRecord.live_tool,
  execution_count: validRecord.execution_count,
  approval_scope_exact: validRecord.approval_scope_exact,
  approval_scope_wildcard_allowed: validRecord.approval_scope_wildcard_allowed,
  single_use_approval: validRecord.single_use_approval,
  approval_consumed: validRecord.approval_consumed,
  execution_authorized_for_future_package: validRecord.execution_authorized_for_future_package,
  live_call_performed: validRecord.live_call_performed,
  noop_ping_performed: validRecord.noop_ping_performed,
  no_live_execution_tool_called: true,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
