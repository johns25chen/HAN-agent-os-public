import { spawnSync } from 'node:child_process';

const sourceJobDir = process.argv[2] || 'jobs/job_20260519115852_b784842d';

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function runV64Verifier() {
  const result = spawnSync(
    process.execPath,
    [
      'scripts/han-agent-bus/verify-v6.4-live-execution-receipt-planning.mjs',
      sourceJobDir
    ],
    {
      encoding: 'utf8'
    }
  );

  if (result.status !== 0) {
    throw new Error(`v6.4 verifier failed: ${result.stderr || result.stdout}`);
  }

  return JSON.parse(result.stdout);
}

const requiredReceiptFields = [
  'execution_id',
  'source_job_id',
  'source_handoff_id',
  'source_bridge_id',
  'operator_final_approval_id',
  'target',
  'agent',
  'planned_live_tool',
  'started_at',
  'completed_at',
  'exit_code',
  'stdout_path',
  'stderr_path',
  'artifact_paths',
  'rollback_status',
  'safety_notes'
];

function normalizeReceiptPlan(v64) {
  return {
    receipt_plan_id: `receipt_plan_${v64.source_job_id}_v6_4`,
    source_bridge_id: v64.source_bridge_id,
    source_handoff_id: v64.source_handoff_id,
    source_job_id: v64.source_job_id,
    target: 'openclaw',
    agent: 'planner',
    risk_level: 'low',
    planned_live_tool: 'openclaw_send_task_live',
    receipt_mode: v64.generated_receipt_mode,
    receipt_status: v64.generated_receipt_status,
    dry_run_bridge_verified: true,
    operator_final_approval_required: v64.generated_operator_final_approval_required,
    receipt_will_be_required: v64.generated_receipt_will_be_required,
    rollback_required: v64.generated_rollback_required,
    execution_authorized: v64.generated_execution_authorized,
    live_call_performed: v64.generated_live_call_performed,
    required_receipt_fields: requiredReceiptFields,
    v64_verdict: v64.verdict,
    no_live_execution_tool_called: v64.no_live_execution_tool_called
  };
}

function validateReceiptPlan(plan) {
  assert(plan && typeof plan === 'object', 'receipt plan is missing');
  assert(plan.v64_verdict === 'PASS', 'v6.4 verifier result must be PASS');
  assert(plan.no_live_execution_tool_called === true, 'v6.4 must not call live execution tool');
  assert(plan.receipt_plan_id && plan.receipt_plan_id.length >= 8, 'receipt_plan_id is missing');
  assert(plan.source_bridge_id && plan.source_bridge_id.length >= 8, 'source_bridge_id is missing');
  assert(plan.source_handoff_id && plan.source_handoff_id.length >= 8, 'source_handoff_id is missing');
  assert(plan.source_job_id && plan.source_job_id.startsWith('job_'), 'source_job_id is invalid');
  assert(plan.target === 'openclaw', 'receipt plan target must be openclaw');
  assert(plan.agent === 'planner', 'receipt plan agent must be planner');
  assert(plan.risk_level === 'low', 'receipt plan risk level must remain low');
  assert(plan.planned_live_tool === 'openclaw_send_task_live', 'planned live tool mismatch');
  assert(plan.receipt_mode === 'planned_receipt_only', 'receipt mode must be planned_receipt_only');
  assert(plan.receipt_status === 'operator_final_review_required', 'receipt status must require operator final review');
  assert(plan.dry_run_bridge_verified === true, 'dry-run bridge must be verified');
  assert(plan.operator_final_approval_required === true, 'operator final approval must be required');
  assert(plan.receipt_will_be_required === true, 'receipt must be required');
  assert(plan.rollback_required === true, 'rollback must be required');
  assert(plan.execution_authorized === false, 'receipt plan execution_authorized must remain false');
  assert(plan.live_call_performed === false, 'receipt plan live_call_performed must remain false');

  for (const field of requiredReceiptFields) {
    assert(plan.required_receipt_fields.includes(field), `missing required receipt field: ${field}`);
  }

  return true;
}

function createReceiptDryRun(plan) {
  validateReceiptPlan(plan);

  return {
    receipt_dry_run_id: `receipt_dry_run_${plan.source_job_id}_v6_5`,
    source_receipt_plan_id: plan.receipt_plan_id,
    source_bridge_id: plan.source_bridge_id,
    source_handoff_id: plan.source_handoff_id,
    source_job_id: plan.source_job_id,
    target: plan.target,
    agent: plan.agent,
    risk_level: plan.risk_level,
    planned_live_tool: plan.planned_live_tool,
    dry_run: true,
    receipt_dry_run_status: 'receipt_preview_generated',
    operator_final_approval_required: true,
    operator_final_approval_present: false,
    execution_authorized: false,
    live_call_performed: false,
    simulated_exit_code: null,
    simulated_stdout_path: null,
    simulated_stderr_path: null,
    simulated_artifact_paths: [],
    simulated_rollback_status: 'not_applicable_dry_run',
    required_receipt_fields_verified: true,
    created_at: '2026-05-19T23:55:00.000Z',
    audit_envelope: {
      preview_only: true,
      no_real_execution: true,
      no_live_tool_called: true,
      next_required_action: 'final_operator_approval_token_planning'
    },
    safety_boundary: 'v6.5 creates a controlled execution receipt dry-run preview only. It does not execute live actions or call live execution tools.'
  };
}

function validateReceiptDryRun(receipt, plan) {
  assert(receipt && typeof receipt === 'object', 'receipt dry-run is missing');
  assert(receipt.source_receipt_plan_id === plan.receipt_plan_id, 'source_receipt_plan_id mismatch');
  assert(receipt.source_bridge_id === plan.source_bridge_id, 'source_bridge_id mismatch');
  assert(receipt.source_handoff_id === plan.source_handoff_id, 'source_handoff_id mismatch');
  assert(receipt.source_job_id === plan.source_job_id, 'source_job_id mismatch');
  assert(receipt.target === 'openclaw', 'receipt target must be openclaw');
  assert(receipt.agent === 'planner', 'receipt agent must be planner');
  assert(receipt.risk_level === 'low', 'receipt risk level must remain low');
  assert(receipt.planned_live_tool === 'openclaw_send_task_live', 'planned live tool mismatch');
  assert(receipt.dry_run === true, 'receipt dry-run dry_run must be true');
  assert(receipt.receipt_dry_run_status === 'receipt_preview_generated', 'receipt dry-run status must be receipt_preview_generated');
  assert(receipt.operator_final_approval_required === true, 'operator final approval must be required');
  assert(receipt.operator_final_approval_present === false, 'operator final approval must not be present in v6.5');
  assert(receipt.execution_authorized === false, 'receipt dry-run execution_authorized must remain false');
  assert(receipt.live_call_performed === false, 'receipt dry-run live_call_performed must remain false');
  assert(receipt.simulated_exit_code === null, 'simulated_exit_code must remain null');
  assert(receipt.simulated_stdout_path === null, 'simulated_stdout_path must remain null');
  assert(receipt.simulated_stderr_path === null, 'simulated_stderr_path must remain null');
  assert(Array.isArray(receipt.simulated_artifact_paths) && receipt.simulated_artifact_paths.length === 0, 'simulated_artifact_paths must remain empty');
  assert(receipt.simulated_rollback_status === 'not_applicable_dry_run', 'simulated rollback status mismatch');
  assert(receipt.required_receipt_fields_verified === true, 'required receipt fields must be verified');
  assert(receipt.audit_envelope?.preview_only === true, 'audit envelope must mark preview_only');
  assert(receipt.audit_envelope?.no_real_execution === true, 'audit envelope must deny real execution');
  assert(receipt.audit_envelope?.no_live_tool_called === true, 'audit envelope must deny live tool calls');
  assert(String(receipt.safety_boundary).includes('does not execute live actions'), 'safety boundary must deny live execution');
  assert(String(receipt.safety_boundary).includes('call live execution tools'), 'safety boundary must deny live tool calls');
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

const v64 = runV64Verifier();
const validPlan = normalizeReceiptPlan(v64);
const validReceiptDryRun = createReceiptDryRun(validPlan);

const checks = [
  expectPass('valid v6.4 receipt plan creates v6.5 controlled receipt dry-run', () => {
    validateReceiptDryRun(validReceiptDryRun, validPlan);
  }),
  expectReject('missing receipt plan is rejected', () => {
    createReceiptDryRun(null);
  }),
  expectReject('failed v6.4 verifier result is rejected', () => {
    createReceiptDryRun({ ...validPlan, v64_verdict: 'FAIL' });
  }),
  expectReject('invalid receipt_mode is rejected', () => {
    createReceiptDryRun({ ...validPlan, receipt_mode: 'live_receipt' });
  }),
  expectReject('invalid receipt_status is rejected', () => {
    createReceiptDryRun({ ...validPlan, receipt_status: 'execution_completed' });
  }),
  expectReject('receipt plan execution_authorized=true is rejected', () => {
    createReceiptDryRun({ ...validPlan, execution_authorized: true });
  }),
  expectReject('receipt plan live_call_performed=true is rejected', () => {
    createReceiptDryRun({ ...validPlan, live_call_performed: true });
  }),
  expectReject('missing operator final approval requirement is rejected', () => {
    createReceiptDryRun({ ...validPlan, operator_final_approval_required: false });
  }),
  expectReject('receipt dry-run dry_run=false is rejected', () => {
    validateReceiptDryRun({ ...validReceiptDryRun, dry_run: false }, validPlan);
  }),
  expectReject('receipt dry-run operator_final_approval_present=true is rejected', () => {
    validateReceiptDryRun({ ...validReceiptDryRun, operator_final_approval_present: true }, validPlan);
  }),
  expectReject('receipt dry-run execution_authorized=true is rejected', () => {
    validateReceiptDryRun({ ...validReceiptDryRun, execution_authorized: true }, validPlan);
  }),
  expectReject('receipt dry-run live_call_performed=true is rejected', () => {
    validateReceiptDryRun({ ...validReceiptDryRun, live_call_performed: true }, validPlan);
  }),
  expectReject('receipt dry-run with real stdout path is rejected', () => {
    validateReceiptDryRun({ ...validReceiptDryRun, simulated_stdout_path: 'jobs/out/stdout.log' }, validPlan);
  }),
  expectReject('receipt dry-run with real artifact path is rejected', () => {
    validateReceiptDryRun({ ...validReceiptDryRun, simulated_artifact_paths: ['artifact.json'] }, validPlan);
  })
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v6.5',
  verdict,
  source_job_id: validPlan.source_job_id,
  source_handoff_id: validPlan.source_handoff_id,
  source_bridge_id: validPlan.source_bridge_id,
  source_receipt_plan_id: validPlan.receipt_plan_id,
  no_live_execution_tool_called: true,
  generated_dry_run: validReceiptDryRun.dry_run,
  generated_receipt_dry_run_status: validReceiptDryRun.receipt_dry_run_status,
  generated_operator_final_approval_required: validReceiptDryRun.operator_final_approval_required,
  generated_operator_final_approval_present: validReceiptDryRun.operator_final_approval_present,
  generated_execution_authorized: validReceiptDryRun.execution_authorized,
  generated_live_call_performed: validReceiptDryRun.live_call_performed,
  generated_simulated_artifact_paths_count: validReceiptDryRun.simulated_artifact_paths.length,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
