import { spawnSync } from 'node:child_process';

const sourceJobDir = process.argv[2] || 'jobs/job_20260519115852_b784842d';

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function runV65Verifier() {
  const result = spawnSync(
    process.execPath,
    [
      'scripts/han-agent-bus/verify-v6.5-controlled-execution-receipt-dry-run.mjs',
      sourceJobDir
    ],
    { encoding: 'utf8' }
  );

  if (result.status !== 0) {
    throw new Error(`v6.5 verifier failed: ${result.stderr || result.stdout}`);
  }

  return JSON.parse(result.stdout);
}

function normalizeReceiptDryRun(v65) {
  return {
    receipt_dry_run_id: `receipt_dry_run_${v65.source_job_id}_v6_5`,
    source_receipt_plan_id: v65.source_receipt_plan_id,
    source_bridge_id: v65.source_bridge_id,
    source_handoff_id: v65.source_handoff_id,
    source_job_id: v65.source_job_id,
    target: 'openclaw',
    agent: 'planner',
    risk_level: 'low',
    planned_live_tool: 'openclaw_send_task_live',
    dry_run: v65.generated_dry_run,
    receipt_dry_run_status: v65.generated_receipt_dry_run_status,
    operator_final_approval_required: v65.generated_operator_final_approval_required,
    operator_final_approval_present: v65.generated_operator_final_approval_present,
    execution_authorized: v65.generated_execution_authorized,
    live_call_performed: v65.generated_live_call_performed,
    simulated_artifact_paths_count: v65.generated_simulated_artifact_paths_count,
    v65_verdict: v65.verdict,
    no_live_execution_tool_called: v65.no_live_execution_tool_called
  };
}

function validateReceiptDryRun(receipt) {
  assert(receipt && typeof receipt === 'object', 'receipt dry-run is missing');
  assert(receipt.v65_verdict === 'PASS', 'v6.5 verifier result must be PASS');
  assert(receipt.no_live_execution_tool_called === true, 'v6.5 must not call live execution tool');
  assert(receipt.receipt_dry_run_id && receipt.receipt_dry_run_id.length >= 8, 'receipt_dry_run_id is missing');
  assert(receipt.source_receipt_plan_id && receipt.source_receipt_plan_id.length >= 8, 'source_receipt_plan_id is missing');
  assert(receipt.source_bridge_id && receipt.source_bridge_id.length >= 8, 'source_bridge_id is missing');
  assert(receipt.source_handoff_id && receipt.source_handoff_id.length >= 8, 'source_handoff_id is missing');
  assert(receipt.source_job_id && receipt.source_job_id.startsWith('job_'), 'source_job_id is invalid');
  assert(receipt.target === 'openclaw', 'receipt target must be openclaw');
  assert(receipt.agent === 'planner', 'receipt agent must be planner');
  assert(receipt.risk_level === 'low', 'receipt risk level must remain low');
  assert(receipt.planned_live_tool === 'openclaw_send_task_live', 'planned live tool mismatch');
  assert(receipt.dry_run === true, 'receipt dry-run dry_run must be true');
  assert(receipt.receipt_dry_run_status === 'receipt_preview_generated', 'receipt dry-run status must be receipt_preview_generated');
  assert(receipt.operator_final_approval_required === true, 'operator final approval must be required');
  assert(receipt.operator_final_approval_present === false, 'operator final approval must not be present before v6.6');
  assert(receipt.execution_authorized === false, 'receipt dry-run execution_authorized must remain false');
  assert(receipt.live_call_performed === false, 'receipt dry-run live_call_performed must remain false');
  assert(receipt.simulated_artifact_paths_count === 0, 'receipt dry-run simulated artifact paths must remain empty');
  return true;
}

function createFinalApprovalTokenPlan(receipt) {
  validateReceiptDryRun(receipt);

  return {
    approval_token_plan_id: `approval_token_plan_${receipt.source_job_id}_v6_6`,
    source_receipt_dry_run_id: receipt.receipt_dry_run_id,
    source_receipt_plan_id: receipt.source_receipt_plan_id,
    source_bridge_id: receipt.source_bridge_id,
    source_handoff_id: receipt.source_handoff_id,
    source_job_id: receipt.source_job_id,
    target: receipt.target,
    agent: receipt.agent,
    risk_level: receipt.risk_level,
    planned_live_tool: receipt.planned_live_tool,
    token_mode: 'token_planning_only',
    token_status: 'final_operator_approval_token_required',
    token_issued: false,
    token_value: null,
    token_scope: `${receipt.source_job_id}:openclaw:planner:openclaw_send_task_live:single-use`,
    token_scope_is_wildcard: false,
    operator_identity_required: true,
    approval_text_required: true,
    expiry_required: true,
    single_use_required: true,
    revocation_required: true,
    execution_authorized: false,
    live_call_performed: false,
    created_at: '2026-05-20T00:05:00.000Z',
    token_requirements: {
      exact_source_job_id_required: true,
      exact_target_required: true,
      exact_agent_required: true,
      exact_live_tool_required: true,
      explicit_operator_identity_required: true,
      explicit_approval_text_required: true,
      bounded_scope_required: true,
      wildcard_scope_forbidden: true,
      expiry_required: true,
      single_use_required: true,
      revocation_required: true,
      execution_receipt_required_after_future_live_run: true
    },
    safety_boundary: 'v6.6 plans final operator approval token requirements only. It does not issue tokens, execute live actions, or call live execution tools.'
  };
}

function validateFinalApprovalTokenPlan(plan, receipt) {
  assert(plan && typeof plan === 'object', 'approval token plan is missing');
  assert(plan.source_receipt_dry_run_id === receipt.receipt_dry_run_id, 'source_receipt_dry_run_id mismatch');
  assert(plan.source_receipt_plan_id === receipt.source_receipt_plan_id, 'source_receipt_plan_id mismatch');
  assert(plan.source_bridge_id === receipt.source_bridge_id, 'source_bridge_id mismatch');
  assert(plan.source_handoff_id === receipt.source_handoff_id, 'source_handoff_id mismatch');
  assert(plan.source_job_id === receipt.source_job_id, 'source_job_id mismatch');
  assert(plan.target === 'openclaw', 'token plan target must be openclaw');
  assert(plan.agent === 'planner', 'token plan agent must be planner');
  assert(plan.risk_level === 'low', 'token plan risk level must remain low');
  assert(plan.planned_live_tool === 'openclaw_send_task_live', 'planned live tool mismatch');
  assert(plan.token_mode === 'token_planning_only', 'token mode must be token_planning_only');
  assert(plan.token_status === 'final_operator_approval_token_required', 'token status must require final operator approval token');
  assert(plan.token_issued === false, 'token must not be issued in v6.6');
  assert(plan.token_value === null, 'token value must remain null in v6.6');
  assert(typeof plan.token_scope === 'string' && plan.token_scope.includes(receipt.source_job_id), 'token scope must be source-bound');
  assert(!['*', 'all', 'any', 'wildcard', 'global'].includes(plan.token_scope), 'token scope cannot be wildcard');
  assert(plan.token_scope_is_wildcard === false, 'token scope wildcard flag must be false');
  assert(plan.operator_identity_required === true, 'operator identity must be required');
  assert(plan.approval_text_required === true, 'approval text must be required');
  assert(plan.expiry_required === true, 'expiry must be required');
  assert(plan.single_use_required === true, 'single-use must be required');
  assert(plan.revocation_required === true, 'revocation must be required');
  assert(plan.execution_authorized === false, 'token plan execution_authorized must remain false');
  assert(plan.live_call_performed === false, 'token plan live_call_performed must remain false');
  assert(plan.token_requirements?.wildcard_scope_forbidden === true, 'wildcard scope must be forbidden');
  assert(plan.token_requirements?.execution_receipt_required_after_future_live_run === true, 'future execution receipt must be required');
  assert(String(plan.safety_boundary).includes('does not issue tokens'), 'safety boundary must deny token issuance');
  assert(String(plan.safety_boundary).includes('execute live actions'), 'safety boundary must deny live execution');
  assert(String(plan.safety_boundary).includes('call live execution tools'), 'safety boundary must deny live tool calls');
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

const v65 = runV65Verifier();
const validReceipt = normalizeReceiptDryRun(v65);
const validPlan = createFinalApprovalTokenPlan(validReceipt);

const checks = [
  expectPass('valid v6.5 receipt dry-run creates v6.6 final operator approval token plan', () => {
    validateFinalApprovalTokenPlan(validPlan, validReceipt);
  }),
  expectReject('missing receipt dry-run is rejected', () => {
    createFinalApprovalTokenPlan(null);
  }),
  expectReject('failed v6.5 verifier result is rejected', () => {
    createFinalApprovalTokenPlan({ ...validReceipt, v65_verdict: 'FAIL' });
  }),
  expectReject('receipt dry-run dry_run=false is rejected', () => {
    createFinalApprovalTokenPlan({ ...validReceipt, dry_run: false });
  }),
  expectReject('invalid receipt dry-run status is rejected', () => {
    createFinalApprovalTokenPlan({ ...validReceipt, receipt_dry_run_status: 'execution_completed' });
  }),
  expectReject('receipt dry-run operator_final_approval_present=true is rejected', () => {
    createFinalApprovalTokenPlan({ ...validReceipt, operator_final_approval_present: true });
  }),
  expectReject('receipt dry-run execution_authorized=true is rejected', () => {
    createFinalApprovalTokenPlan({ ...validReceipt, execution_authorized: true });
  }),
  expectReject('receipt dry-run live_call_performed=true is rejected', () => {
    createFinalApprovalTokenPlan({ ...validReceipt, live_call_performed: true });
  }),
  expectReject('receipt dry-run with real artifact paths is rejected', () => {
    createFinalApprovalTokenPlan({ ...validReceipt, simulated_artifact_paths_count: 1 });
  }),
  expectReject('token_issued=true is rejected', () => {
    validateFinalApprovalTokenPlan({ ...validPlan, token_issued: true }, validReceipt);
  }),
  expectReject('token_value present is rejected', () => {
    validateFinalApprovalTokenPlan({ ...validPlan, token_value: 'secret-token-value' }, validReceipt);
  }),
  expectReject('wildcard token scope is rejected', () => {
    validateFinalApprovalTokenPlan({ ...validPlan, token_scope: '*' }, validReceipt);
  }),
  expectReject('token_scope_is_wildcard=true is rejected', () => {
    validateFinalApprovalTokenPlan({ ...validPlan, token_scope_is_wildcard: true }, validReceipt);
  }),
  expectReject('missing operator identity requirement is rejected', () => {
    validateFinalApprovalTokenPlan({ ...validPlan, operator_identity_required: false }, validReceipt);
  }),
  expectReject('missing approval text requirement is rejected', () => {
    validateFinalApprovalTokenPlan({ ...validPlan, approval_text_required: false }, validReceipt);
  }),
  expectReject('missing expiry requirement is rejected', () => {
    validateFinalApprovalTokenPlan({ ...validPlan, expiry_required: false }, validReceipt);
  }),
  expectReject('missing single-use requirement is rejected', () => {
    validateFinalApprovalTokenPlan({ ...validPlan, single_use_required: false }, validReceipt);
  }),
  expectReject('missing revocation requirement is rejected', () => {
    validateFinalApprovalTokenPlan({ ...validPlan, revocation_required: false }, validReceipt);
  }),
  expectReject('token plan execution_authorized=true is rejected', () => {
    validateFinalApprovalTokenPlan({ ...validPlan, execution_authorized: true }, validReceipt);
  }),
  expectReject('token plan live_call_performed=true is rejected', () => {
    validateFinalApprovalTokenPlan({ ...validPlan, live_call_performed: true }, validReceipt);
  })
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v6.6',
  verdict,
  source_job_id: validReceipt.source_job_id,
  source_handoff_id: validReceipt.source_handoff_id,
  source_bridge_id: validReceipt.source_bridge_id,
  source_receipt_plan_id: validReceipt.source_receipt_plan_id,
  source_receipt_dry_run_id: validReceipt.receipt_dry_run_id,
  no_live_execution_tool_called: true,
  generated_token_mode: validPlan.token_mode,
  generated_token_status: validPlan.token_status,
  generated_token_issued: validPlan.token_issued,
  generated_token_value_present: validPlan.token_value !== null,
  generated_token_scope_is_wildcard: validPlan.token_scope_is_wildcard,
  generated_operator_identity_required: validPlan.operator_identity_required,
  generated_approval_text_required: validPlan.approval_text_required,
  generated_expiry_required: validPlan.expiry_required,
  generated_single_use_required: validPlan.single_use_required,
  generated_revocation_required: validPlan.revocation_required,
  generated_execution_authorized: validPlan.execution_authorized,
  generated_live_call_performed: validPlan.live_call_performed,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
