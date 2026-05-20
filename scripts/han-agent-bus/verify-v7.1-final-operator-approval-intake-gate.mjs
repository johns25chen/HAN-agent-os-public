import { spawnSync } from 'node:child_process';

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function runV70Verifier() {
  const result = spawnSync(
    process.execPath,
    ['scripts/han-agent-bus/verify-v7.0-controlled-live-execution-gate-contract.mjs'],
    { encoding: 'utf8' }
  );

  if (result.status !== 0) {
    throw new Error(`v7.0 verifier failed: ${result.stderr || result.stdout}`);
  }

  return JSON.parse(result.stdout);
}

function normalizeGateContract(v70) {
  return {
    gate_contract_id: `gate_contract_${v70.source_job_id}_v7_0`,
    source_job_id: v70.source_job_id,
    target: 'openclaw',
    agent: 'planner',
    risk_level: 'low',
    planned_live_tool: 'openclaw_send_task_live',
    gate_mode: v70.generated_gate_mode,
    gate_status: v70.generated_gate_status,
    live_execution_allowed: v70.generated_live_execution_allowed,
    execution_authorized: v70.generated_execution_authorized,
    live_call_performed: v70.generated_live_call_performed,
    operator_final_approval_required: v70.generated_operator_final_approval_required,
    operator_final_approval_present: v70.generated_operator_final_approval_present,
    receipt_required: v70.generated_receipt_required,
    rollback_required: v70.generated_rollback_required,
    single_use_required: v70.generated_single_use_required,
    repeated_execution_allowed: v70.generated_repeated_execution_allowed,
    autonomous_execution_allowed: v70.generated_autonomous_execution_allowed,
    v70_verdict: v70.verdict,
    no_live_execution_tool_called: v70.no_live_execution_tool_called
  };
}

function validateSourceGate(gate) {
  assert(gate && typeof gate === 'object', 'source gate contract is missing');
  assert(gate.v70_verdict === 'PASS', 'v7.0 verifier result must be PASS');
  assert(gate.no_live_execution_tool_called === true, 'v7.0 must not call live execution tool');
  assert(gate.gate_contract_id && gate.gate_contract_id.length >= 8, 'gate_contract_id is missing');
  assert(gate.source_job_id && gate.source_job_id.startsWith('job_'), 'source_job_id is invalid');
  assert(gate.target === 'openclaw', 'source gate target must be openclaw');
  assert(gate.agent === 'planner', 'source gate agent must be planner');
  assert(gate.risk_level === 'low', 'source gate risk level must remain low');
  assert(gate.planned_live_tool === 'openclaw_send_task_live', 'planned live tool mismatch');
  assert(gate.gate_mode === 'contract_only', 'source gate mode must be contract_only');
  assert(gate.gate_status === 'gate_contract_verified', 'source gate status must be gate_contract_verified');
  assert(gate.live_execution_allowed === false, 'source gate live_execution_allowed must remain false');
  assert(gate.execution_authorized === false, 'source gate execution_authorized must remain false');
  assert(gate.live_call_performed === false, 'source gate live_call_performed must remain false');
  assert(gate.operator_final_approval_required === true, 'operator final approval must be required');
  assert(gate.operator_final_approval_present === false, 'operator final approval must not be present before v7.1');
  assert(gate.receipt_required === true, 'receipt must be required');
  assert(gate.rollback_required === true, 'rollback must be required');
  assert(gate.single_use_required === true, 'single-use must be required');
  assert(gate.repeated_execution_allowed === false, 'repeated execution must not be allowed');
  assert(gate.autonomous_execution_allowed === false, 'autonomous execution must not be allowed');
  return true;
}

function createApprovalIntakeGate(gate, overrides = {}) {
  validateSourceGate(gate);

  const intake = {
    approval_intake_gate_id: `approval_intake_gate_${gate.source_job_id}_v7_1`,
    source_gate_contract_id: gate.gate_contract_id,
    source_job_id: gate.source_job_id,
    target: gate.target,
    agent: gate.agent,
    risk_level: gate.risk_level,
    planned_live_tool: gate.planned_live_tool,
    intake_mode: 'intake_gate_only',
    intake_status: 'final_operator_approval_intake_required',
    approval_record_required: true,
    approval_record_present: false,
    operator_identity_reference_required: true,
    operator_identity_reference_present: false,
    explicit_approval_text_required: true,
    explicit_approval_text_present: false,
    approval_scope_exact_required: true,
    approval_scope_wildcard_allowed: false,
    single_use_approval_required: true,
    single_use_approval_present: false,
    expiry_required: true,
    expiry_present: false,
    revocation_required: true,
    revocation_present: false,
    execution_authorized: false,
    live_execution_allowed: false,
    live_call_performed: false,
    created_at: '2026-05-20T00:55:00.000Z',
    intake_requirements: {
      exact_source_job_id_required: true,
      exact_target_required: true,
      exact_agent_required: true,
      exact_live_tool_required: true,
      operator_identity_reference_required: true,
      explicit_approval_text_required: true,
      approval_scope_exact_required: true,
      wildcard_scope_forbidden: true,
      single_use_approval_required: true,
      expiry_required: true,
      revocation_required: true
    },
    rejection_rules: {
      reject_missing_source_gate: true,
      reject_failed_v7_0_verifier: true,
      reject_live_execution_allowed_true: true,
      reject_execution_authorized_true: true,
      reject_live_call_performed_true: true,
      reject_approval_record_present_in_v7_1: true,
      reject_operator_identity_present_in_v7_1: true,
      reject_approval_text_present_in_v7_1: true,
      reject_wildcard_approval_scope: true,
      reject_missing_single_use_requirement: true,
      reject_missing_expiry_requirement: true,
      reject_missing_revocation_requirement: true
    },
    safety_boundary: 'v7.1 defines the final operator approval intake gate only. It does not accept approval records, authorize execution, call live execution tools, or perform live actions.'
  };

  return { ...intake, ...overrides };
}

function validateApprovalIntakeGate(intake, gate) {
  assert(intake && typeof intake === 'object', 'approval intake gate is missing');
  assert(intake.source_gate_contract_id === gate.gate_contract_id, 'source_gate_contract_id mismatch');
  assert(intake.source_job_id === gate.source_job_id, 'source_job_id mismatch');
  assert(intake.target === 'openclaw', 'intake target must be openclaw');
  assert(intake.agent === 'planner', 'intake agent must be planner');
  assert(intake.risk_level === 'low', 'intake risk level must remain low');
  assert(intake.planned_live_tool === 'openclaw_send_task_live', 'planned live tool mismatch');
  assert(intake.intake_mode === 'intake_gate_only', 'intake mode must be intake_gate_only');
  assert(intake.intake_status === 'final_operator_approval_intake_required', 'intake status must require final operator approval intake');
  assert(intake.approval_record_required === true, 'approval record must be required');
  assert(intake.approval_record_present === false, 'approval record must not be present in v7.1');
  assert(intake.operator_identity_reference_required === true, 'operator identity reference must be required');
  assert(intake.operator_identity_reference_present === false, 'operator identity reference must not be present in v7.1');
  assert(intake.explicit_approval_text_required === true, 'explicit approval text must be required');
  assert(intake.explicit_approval_text_present === false, 'explicit approval text must not be present in v7.1');
  assert(intake.approval_scope_exact_required === true, 'exact approval scope must be required');
  assert(intake.approval_scope_wildcard_allowed === false, 'wildcard approval scope must not be allowed');
  assert(intake.single_use_approval_required === true, 'single-use approval must be required');
  assert(intake.single_use_approval_present === false, 'single-use approval must not be present in v7.1');
  assert(intake.expiry_required === true, 'expiry must be required');
  assert(intake.expiry_present === false, 'expiry must not be present in v7.1');
  assert(intake.revocation_required === true, 'revocation must be required');
  assert(intake.revocation_present === false, 'revocation must not be present in v7.1');
  assert(intake.execution_authorized === false, 'execution_authorized must remain false in v7.1');
  assert(intake.live_execution_allowed === false, 'live_execution_allowed must remain false in v7.1');
  assert(intake.live_call_performed === false, 'live_call_performed must remain false in v7.1');
  assert(intake.intake_requirements?.wildcard_scope_forbidden === true, 'wildcard scope must be forbidden');
  assert(intake.rejection_rules?.reject_live_execution_allowed_true === true, 'rejection rules must block live execution allowed');
  assert(String(intake.safety_boundary).includes('does not accept approval records'), 'safety boundary must deny approval record intake');
  assert(String(intake.safety_boundary).includes('authorize execution'), 'safety boundary must deny authorization');
  assert(String(intake.safety_boundary).includes('call live execution tools'), 'safety boundary must deny live tool calls');
  assert(String(intake.safety_boundary).includes('perform live actions'), 'safety boundary must deny live actions');
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

const v70 = runV70Verifier();
const validGate = normalizeGateContract(v70);
const validIntake = createApprovalIntakeGate(validGate);

const checks = [
  expectPass('valid v7.0 gate creates v7.1 final operator approval intake gate', () => {
    validateApprovalIntakeGate(validIntake, validGate);
  }),
  expectReject('missing source gate is rejected', () => {
    createApprovalIntakeGate(null);
  }),
  expectReject('failed v7.0 verifier result is rejected', () => {
    createApprovalIntakeGate({ ...validGate, v70_verdict: 'FAIL' });
  }),
  expectReject('source gate live_execution_allowed=true is rejected', () => {
    createApprovalIntakeGate({ ...validGate, live_execution_allowed: true });
  }),
  expectReject('source gate execution_authorized=true is rejected', () => {
    createApprovalIntakeGate({ ...validGate, execution_authorized: true });
  }),
  expectReject('source gate live_call_performed=true is rejected', () => {
    createApprovalIntakeGate({ ...validGate, live_call_performed: true });
  }),
  expectReject('source gate receipt_required=false is rejected', () => {
    createApprovalIntakeGate({ ...validGate, receipt_required: false });
  }),
  expectReject('source gate rollback_required=false is rejected', () => {
    createApprovalIntakeGate({ ...validGate, rollback_required: false });
  }),
  expectReject('source gate single_use_required=false is rejected', () => {
    createApprovalIntakeGate({ ...validGate, single_use_required: false });
  }),
  expectReject('approval_record_present=true is rejected in v7.1', () => {
    validateApprovalIntakeGate(createApprovalIntakeGate(validGate, { approval_record_present: true }), validGate);
  }),
  expectReject('operator_identity_reference_present=true is rejected in v7.1', () => {
    validateApprovalIntakeGate(createApprovalIntakeGate(validGate, { operator_identity_reference_present: true }), validGate);
  }),
  expectReject('explicit_approval_text_present=true is rejected in v7.1', () => {
    validateApprovalIntakeGate(createApprovalIntakeGate(validGate, { explicit_approval_text_present: true }), validGate);
  }),
  expectReject('approval_scope_wildcard_allowed=true is rejected', () => {
    validateApprovalIntakeGate(createApprovalIntakeGate(validGate, { approval_scope_wildcard_allowed: true }), validGate);
  }),
  expectReject('single_use_approval_required=false is rejected', () => {
    validateApprovalIntakeGate(createApprovalIntakeGate(validGate, { single_use_approval_required: false }), validGate);
  }),
  expectReject('expiry_required=false is rejected', () => {
    validateApprovalIntakeGate(createApprovalIntakeGate(validGate, { expiry_required: false }), validGate);
  }),
  expectReject('revocation_required=false is rejected', () => {
    validateApprovalIntakeGate(createApprovalIntakeGate(validGate, { revocation_required: false }), validGate);
  }),
  expectReject('execution_authorized=true is rejected', () => {
    validateApprovalIntakeGate(createApprovalIntakeGate(validGate, { execution_authorized: true }), validGate);
  }),
  expectReject('live_execution_allowed=true is rejected', () => {
    validateApprovalIntakeGate(createApprovalIntakeGate(validGate, { live_execution_allowed: true }), validGate);
  }),
  expectReject('live_call_performed=true is rejected', () => {
    validateApprovalIntakeGate(createApprovalIntakeGate(validGate, { live_call_performed: true }), validGate);
  })
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v7.1',
  verdict,
  source_job_id: validGate.source_job_id,
  source_gate_contract_id: validGate.gate_contract_id,
  generated_intake_mode: validIntake.intake_mode,
  generated_intake_status: validIntake.intake_status,
  generated_approval_record_required: validIntake.approval_record_required,
  generated_approval_record_present: validIntake.approval_record_present,
  generated_operator_identity_reference_required: validIntake.operator_identity_reference_required,
  generated_operator_identity_reference_present: validIntake.operator_identity_reference_present,
  generated_explicit_approval_text_required: validIntake.explicit_approval_text_required,
  generated_explicit_approval_text_present: validIntake.explicit_approval_text_present,
  generated_approval_scope_exact_required: validIntake.approval_scope_exact_required,
  generated_approval_scope_wildcard_allowed: validIntake.approval_scope_wildcard_allowed,
  generated_single_use_approval_required: validIntake.single_use_approval_required,
  generated_single_use_approval_present: validIntake.single_use_approval_present,
  generated_expiry_required: validIntake.expiry_required,
  generated_expiry_present: validIntake.expiry_present,
  generated_revocation_required: validIntake.revocation_required,
  generated_revocation_present: validIntake.revocation_present,
  generated_execution_authorized: validIntake.execution_authorized,
  generated_live_execution_allowed: validIntake.live_execution_allowed,
  generated_live_call_performed: validIntake.live_call_performed,
  no_live_execution_tool_called: true,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
