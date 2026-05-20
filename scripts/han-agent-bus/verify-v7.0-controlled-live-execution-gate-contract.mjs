import { spawnSync } from 'node:child_process';

const sourceJobId = 'job_20260519115852_b784842d';

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `git ${args.join(' ')} failed`);
  }
  return result.stdout.trim();
}

function tagExists(tagName) {
  const result = spawnSync('git', ['rev-parse', '--verify', `refs/tags/${tagName}`], { encoding: 'utf8' });
  return result.status === 0;
}

function validateBaselines() {
  assert(tagExists('han-agent-bus-v6-final-stable'), 'missing V6 final stable tag');
  assert(tagExists('han-agent-bus-v7-phase-charter'), 'missing V7 phase charter tag');

  const charterPath = 'docs/han-agent-bus/han-agent-bus-v7-phase-charter.md';
  const ls = spawnSync('test', ['-f', charterPath], { encoding: 'utf8' });
  assert(ls.status === 0, 'missing V7 phase charter document');

  const head = git(['rev-parse', '--short', 'HEAD']);
  assert(head.length > 0, 'unable to read HEAD');

  return {
    v6_final_tag: 'han-agent-bus-v6-final-stable',
    v7_phase_charter_tag: 'han-agent-bus-v7-phase-charter',
    head
  };
}

function createGateContract(overrides = {}) {
  const baseline = validateBaselines();

  const gate = {
    gate_contract_id: `gate_contract_${sourceJobId}_v7_0`,
    source_v6_final_tag: baseline.v6_final_tag,
    source_v7_phase_charter_tag: baseline.v7_phase_charter_tag,
    source_job_id: sourceJobId,
    target: 'openclaw',
    agent: 'planner',
    risk_level: 'low',
    planned_live_tool: 'openclaw_send_task_live',
    gate_mode: 'contract_only',
    gate_status: 'gate_contract_verified',
    live_execution_allowed: false,
    execution_authorized: false,
    live_call_performed: false,
    operator_final_approval_required: true,
    operator_final_approval_present: false,
    approval_scope_wildcard_allowed: false,
    receipt_required: true,
    rollback_required: true,
    post_run_verification_required: true,
    single_use_required: true,
    repeated_execution_allowed: false,
    autonomous_execution_allowed: false,
    created_at: '2026-05-20T00:40:00.000Z',
    eligibility_rules: {
      exact_source_job_id_required: true,
      exact_target_required: true,
      exact_agent_required: true,
      exact_live_tool_required: true,
      low_risk_only: true,
      final_operator_approval_required: true,
      receipt_required: true,
      rollback_required: true,
      post_run_verification_required: true,
      single_use_required: true
    },
    rejection_rules: {
      reject_missing_v6_final_baseline: true,
      reject_missing_v7_phase_charter: true,
      reject_non_openclaw_target: true,
      reject_non_planner_agent: true,
      reject_risk_above_low: true,
      reject_live_execution_in_v7_0: true,
      reject_execution_authorized_true: true,
      reject_live_call_performed_true: true,
      reject_wildcard_approval_scope: true,
      reject_missing_receipt_requirement: true,
      reject_missing_rollback_requirement: true,
      reject_repeated_execution: true,
      reject_autonomous_execution: true
    },
    safety_boundary: 'v7.0 defines the controlled live execution gate contract only. It does not authorize execution, call live execution tools, or perform live actions.'
  };

  return { ...gate, ...overrides };
}

function validateGateContract(gate) {
  assert(gate && typeof gate === 'object', 'gate contract is missing');
  assert(gate.source_v6_final_tag === 'han-agent-bus-v6-final-stable', 'V6 final baseline mismatch');
  assert(gate.source_v7_phase_charter_tag === 'han-agent-bus-v7-phase-charter', 'V7 phase charter baseline mismatch');
  assert(gate.source_job_id === sourceJobId, 'source_job_id mismatch');
  assert(gate.target === 'openclaw', 'target must be openclaw');
  assert(gate.agent === 'planner', 'agent must be planner');
  assert(gate.risk_level === 'low', 'risk level must remain low');
  assert(gate.planned_live_tool === 'openclaw_send_task_live', 'planned live tool mismatch');
  assert(gate.gate_mode === 'contract_only', 'gate mode must be contract_only');
  assert(gate.gate_status === 'gate_contract_verified', 'gate status must be gate_contract_verified');
  assert(gate.live_execution_allowed === false, 'live execution must not be allowed in v7.0');
  assert(gate.execution_authorized === false, 'execution_authorized must remain false in v7.0');
  assert(gate.live_call_performed === false, 'live_call_performed must remain false in v7.0');
  assert(gate.operator_final_approval_required === true, 'operator final approval must be required');
  assert(gate.operator_final_approval_present === false, 'operator final approval must not be present in v7.0');
  assert(gate.approval_scope_wildcard_allowed === false, 'wildcard approval scope must not be allowed');
  assert(gate.receipt_required === true, 'receipt must be required');
  assert(gate.rollback_required === true, 'rollback must be required');
  assert(gate.post_run_verification_required === true, 'post-run verification must be required');
  assert(gate.single_use_required === true, 'single-use must be required');
  assert(gate.repeated_execution_allowed === false, 'repeated execution must not be allowed');
  assert(gate.autonomous_execution_allowed === false, 'autonomous execution must not be allowed');
  assert(gate.eligibility_rules?.low_risk_only === true, 'eligibility must require low risk only');
  assert(gate.rejection_rules?.reject_live_execution_in_v7_0 === true, 'rejection rules must block live execution in v7.0');
  assert(String(gate.safety_boundary).includes('does not authorize execution'), 'safety boundary must deny authorization');
  assert(String(gate.safety_boundary).includes('call live execution tools'), 'safety boundary must deny live tool calls');
  assert(String(gate.safety_boundary).includes('perform live actions'), 'safety boundary must deny live actions');
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

const validGate = createGateContract();

const checks = [
  expectPass('valid v7.0 controlled live execution gate contract passes', () => {
    validateGateContract(validGate);
  }),
  expectReject('missing gate contract is rejected', () => {
    validateGateContract(null);
  }),
  expectReject('wrong V6 final baseline is rejected', () => {
    validateGateContract(createGateContract({ source_v6_final_tag: 'wrong-tag' }));
  }),
  expectReject('wrong V7 phase charter baseline is rejected', () => {
    validateGateContract(createGateContract({ source_v7_phase_charter_tag: 'wrong-tag' }));
  }),
  expectReject('non-openclaw target is rejected', () => {
    validateGateContract(createGateContract({ target: 'shell' }));
  }),
  expectReject('non-planner agent is rejected', () => {
    validateGateContract(createGateContract({ agent: 'executor' }));
  }),
  expectReject('risk above low is rejected', () => {
    validateGateContract(createGateContract({ risk_level: 'medium' }));
  }),
  expectReject('planned live tool mismatch is rejected', () => {
    validateGateContract(createGateContract({ planned_live_tool: 'shell_exec' }));
  }),
  expectReject('live_execution_allowed=true is rejected', () => {
    validateGateContract(createGateContract({ live_execution_allowed: true }));
  }),
  expectReject('execution_authorized=true is rejected', () => {
    validateGateContract(createGateContract({ execution_authorized: true }));
  }),
  expectReject('live_call_performed=true is rejected', () => {
    validateGateContract(createGateContract({ live_call_performed: true }));
  }),
  expectReject('operator final approval present is rejected in v7.0', () => {
    validateGateContract(createGateContract({ operator_final_approval_present: true }));
  }),
  expectReject('wildcard approval scope allowed is rejected', () => {
    validateGateContract(createGateContract({ approval_scope_wildcard_allowed: true }));
  }),
  expectReject('missing receipt requirement is rejected', () => {
    validateGateContract(createGateContract({ receipt_required: false }));
  }),
  expectReject('missing rollback requirement is rejected', () => {
    validateGateContract(createGateContract({ rollback_required: false }));
  }),
  expectReject('missing post-run verification requirement is rejected', () => {
    validateGateContract(createGateContract({ post_run_verification_required: false }));
  }),
  expectReject('repeated execution allowed is rejected', () => {
    validateGateContract(createGateContract({ repeated_execution_allowed: true }));
  }),
  expectReject('autonomous execution allowed is rejected', () => {
    validateGateContract(createGateContract({ autonomous_execution_allowed: true }));
  })
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v7.0',
  verdict,
  source_job_id: validGate.source_job_id,
  source_v6_final_tag: validGate.source_v6_final_tag,
  source_v7_phase_charter_tag: validGate.source_v7_phase_charter_tag,
  generated_gate_mode: validGate.gate_mode,
  generated_gate_status: validGate.gate_status,
  generated_live_execution_allowed: validGate.live_execution_allowed,
  generated_execution_authorized: validGate.execution_authorized,
  generated_live_call_performed: validGate.live_call_performed,
  generated_operator_final_approval_required: validGate.operator_final_approval_required,
  generated_operator_final_approval_present: validGate.operator_final_approval_present,
  generated_receipt_required: validGate.receipt_required,
  generated_rollback_required: validGate.rollback_required,
  generated_single_use_required: validGate.single_use_required,
  generated_repeated_execution_allowed: validGate.repeated_execution_allowed,
  generated_autonomous_execution_allowed: validGate.autonomous_execution_allowed,
  no_live_execution_tool_called: true,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
