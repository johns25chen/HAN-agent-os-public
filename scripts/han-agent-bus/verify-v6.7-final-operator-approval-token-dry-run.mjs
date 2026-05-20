import { spawnSync } from 'node:child_process';

const sourceJobDir = process.argv[2] || 'jobs/job_20260519115852_b784842d';

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function runV66Verifier() {
  const result = spawnSync(
    process.execPath,
    [
      'scripts/han-agent-bus/verify-v6.6-final-operator-approval-token-planning.mjs',
      sourceJobDir
    ],
    { encoding: 'utf8' }
  );

  if (result.status !== 0) {
    throw new Error(`v6.6 verifier failed: ${result.stderr || result.stdout}`);
  }

  return JSON.parse(result.stdout);
}

function normalizeTokenPlan(v66) {
  return {
    approval_token_plan_id: `approval_token_plan_${v66.source_job_id}_v6_6`,
    source_receipt_dry_run_id: v66.source_receipt_dry_run_id,
    source_receipt_plan_id: v66.source_receipt_plan_id,
    source_bridge_id: v66.source_bridge_id,
    source_handoff_id: v66.source_handoff_id,
    source_job_id: v66.source_job_id,
    target: 'openclaw',
    agent: 'planner',
    risk_level: 'low',
    planned_live_tool: 'openclaw_send_task_live',
    token_mode: v66.generated_token_mode,
    token_status: v66.generated_token_status,
    token_issued: v66.generated_token_issued,
    token_value_present: v66.generated_token_value_present,
    token_scope: `${v66.source_job_id}:openclaw:planner:openclaw_send_task_live:single-use`,
    token_scope_is_wildcard: v66.generated_token_scope_is_wildcard,
    operator_identity_required: v66.generated_operator_identity_required,
    approval_text_required: v66.generated_approval_text_required,
    expiry_required: v66.generated_expiry_required,
    single_use_required: v66.generated_single_use_required,
    revocation_required: v66.generated_revocation_required,
    execution_authorized: v66.generated_execution_authorized,
    live_call_performed: v66.generated_live_call_performed,
    v66_verdict: v66.verdict,
    no_live_execution_tool_called: v66.no_live_execution_tool_called
  };
}

function validateTokenPlan(plan) {
  assert(plan && typeof plan === 'object', 'approval token plan is missing');
  assert(plan.v66_verdict === 'PASS', 'v6.6 verifier result must be PASS');
  assert(plan.no_live_execution_tool_called === true, 'v6.6 must not call live execution tool');
  assert(plan.approval_token_plan_id && plan.approval_token_plan_id.length >= 8, 'approval_token_plan_id is missing');
  assert(plan.source_receipt_dry_run_id && plan.source_receipt_dry_run_id.length >= 8, 'source_receipt_dry_run_id is missing');
  assert(plan.source_receipt_plan_id && plan.source_receipt_plan_id.length >= 8, 'source_receipt_plan_id is missing');
  assert(plan.source_bridge_id && plan.source_bridge_id.length >= 8, 'source_bridge_id is missing');
  assert(plan.source_handoff_id && plan.source_handoff_id.length >= 8, 'source_handoff_id is missing');
  assert(plan.source_job_id && plan.source_job_id.startsWith('job_'), 'source_job_id is invalid');
  assert(plan.target === 'openclaw', 'token plan target must be openclaw');
  assert(plan.agent === 'planner', 'token plan agent must be planner');
  assert(plan.risk_level === 'low', 'token plan risk level must remain low');
  assert(plan.planned_live_tool === 'openclaw_send_task_live', 'planned live tool mismatch');
  assert(plan.token_mode === 'token_planning_only', 'token mode must be token_planning_only');
  assert(plan.token_status === 'final_operator_approval_token_required', 'token status must require final operator approval token');
  assert(plan.token_issued === false, 'token must not be issued before v6.7 dry-run');
  assert(plan.token_value_present === false, 'token value must not be present before v6.7 dry-run');
  assert(typeof plan.token_scope === 'string' && plan.token_scope.includes(plan.source_job_id), 'token scope must be source-bound');
  assert(!['*', 'all', 'any', 'wildcard', 'global'].includes(plan.token_scope), 'token scope cannot be wildcard');
  assert(plan.token_scope_is_wildcard === false, 'token scope wildcard flag must be false');
  assert(plan.operator_identity_required === true, 'operator identity must be required');
  assert(plan.approval_text_required === true, 'approval text must be required');
  assert(plan.expiry_required === true, 'expiry must be required');
  assert(plan.single_use_required === true, 'single-use must be required');
  assert(plan.revocation_required === true, 'revocation must be required');
  assert(plan.execution_authorized === false, 'token plan execution_authorized must remain false');
  assert(plan.live_call_performed === false, 'token plan live_call_performed must remain false');
  return true;
}

function createTokenDryRun(plan) {
  validateTokenPlan(plan);

  return {
    approval_token_dry_run_id: `approval_token_dry_run_${plan.source_job_id}_v6_7`,
    source_approval_token_plan_id: plan.approval_token_plan_id,
    source_receipt_dry_run_id: plan.source_receipt_dry_run_id,
    source_receipt_plan_id: plan.source_receipt_plan_id,
    source_bridge_id: plan.source_bridge_id,
    source_handoff_id: plan.source_handoff_id,
    source_job_id: plan.source_job_id,
    target: plan.target,
    agent: plan.agent,
    risk_level: plan.risk_level,
    planned_live_tool: plan.planned_live_tool,
    token_dry_run_mode: 'token_preview_only',
    token_dry_run_status: 'token_preview_generated',
    token_preview_generated: true,
    token_issued: false,
    token_value: null,
    token_hash: null,
    token_scope: plan.token_scope,
    token_scope_is_wildcard: false,
    operator_identity_present: false,
    approval_text_present: false,
    expiry_present: false,
    single_use_enforced: true,
    revocation_available: true,
    execution_authorized: false,
    live_call_performed: false,
    created_at: '2026-05-20T00:15:00.000Z',
    token_preview_envelope: {
      preview_only: true,
      token_material_absent: true,
      token_hash_absent: true,
      no_execution_authorization: true,
      no_live_tool_called: true,
      next_required_action: 'execution_authorization_envelope_dry_run'
    },
    safety_boundary: 'v6.7 creates a final operator approval token dry-run preview only. It does not issue tokens, execute live actions, or call live execution tools.'
  };
}

function validateTokenDryRun(dryRun, plan) {
  assert(dryRun && typeof dryRun === 'object', 'approval token dry-run is missing');
  assert(dryRun.source_approval_token_plan_id === plan.approval_token_plan_id, 'source_approval_token_plan_id mismatch');
  assert(dryRun.source_receipt_dry_run_id === plan.source_receipt_dry_run_id, 'source_receipt_dry_run_id mismatch');
  assert(dryRun.source_receipt_plan_id === plan.source_receipt_plan_id, 'source_receipt_plan_id mismatch');
  assert(dryRun.source_bridge_id === plan.source_bridge_id, 'source_bridge_id mismatch');
  assert(dryRun.source_handoff_id === plan.source_handoff_id, 'source_handoff_id mismatch');
  assert(dryRun.source_job_id === plan.source_job_id, 'source_job_id mismatch');
  assert(dryRun.target === 'openclaw', 'token dry-run target must be openclaw');
  assert(dryRun.agent === 'planner', 'token dry-run agent must be planner');
  assert(dryRun.risk_level === 'low', 'token dry-run risk level must remain low');
  assert(dryRun.planned_live_tool === 'openclaw_send_task_live', 'planned live tool mismatch');
  assert(dryRun.token_dry_run_mode === 'token_preview_only', 'token dry-run mode must be token_preview_only');
  assert(dryRun.token_dry_run_status === 'token_preview_generated', 'token dry-run status must be token_preview_generated');
  assert(dryRun.token_preview_generated === true, 'token preview must be generated');
  assert(dryRun.token_issued === false, 'token must not be issued in v6.7');
  assert(dryRun.token_value === null, 'token value must remain null in v6.7');
  assert(dryRun.token_hash === null, 'token hash must remain null in v6.7');
  assert(typeof dryRun.token_scope === 'string' && dryRun.token_scope.includes(plan.source_job_id), 'token scope must be source-bound');
  assert(!['*', 'all', 'any', 'wildcard', 'global'].includes(dryRun.token_scope), 'token scope cannot be wildcard');
  assert(dryRun.token_scope_is_wildcard === false, 'token scope wildcard flag must be false');
  assert(dryRun.operator_identity_present === false, 'operator identity must not be present in v6.7');
  assert(dryRun.approval_text_present === false, 'approval text must not be present in v6.7');
  assert(dryRun.expiry_present === false, 'expiry must not be present in v6.7');
  assert(dryRun.single_use_enforced === true, 'single-use must be enforced');
  assert(dryRun.revocation_available === true, 'revocation must be available');
  assert(dryRun.execution_authorized === false, 'token dry-run execution_authorized must remain false');
  assert(dryRun.live_call_performed === false, 'token dry-run live_call_performed must remain false');
  assert(dryRun.token_preview_envelope?.preview_only === true, 'token preview envelope must mark preview_only');
  assert(dryRun.token_preview_envelope?.token_material_absent === true, 'token material must be absent');
  assert(dryRun.token_preview_envelope?.token_hash_absent === true, 'token hash must be absent');
  assert(dryRun.token_preview_envelope?.no_execution_authorization === true, 'execution authorization must be denied');
  assert(dryRun.token_preview_envelope?.no_live_tool_called === true, 'live tool call must be denied');
  assert(String(dryRun.safety_boundary).includes('does not issue tokens'), 'safety boundary must deny token issuance');
  assert(String(dryRun.safety_boundary).includes('execute live actions'), 'safety boundary must deny live execution');
  assert(String(dryRun.safety_boundary).includes('call live execution tools'), 'safety boundary must deny live tool calls');
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

const v66 = runV66Verifier();
const validPlan = normalizeTokenPlan(v66);
const validTokenDryRun = createTokenDryRun(validPlan);

const checks = [
  expectPass('valid v6.6 token plan creates v6.7 final operator approval token dry-run', () => {
    validateTokenDryRun(validTokenDryRun, validPlan);
  }),
  expectReject('missing token plan is rejected', () => {
    createTokenDryRun(null);
  }),
  expectReject('failed v6.6 verifier result is rejected', () => {
    createTokenDryRun({ ...validPlan, v66_verdict: 'FAIL' });
  }),
  expectReject('token plan token_issued=true is rejected', () => {
    createTokenDryRun({ ...validPlan, token_issued: true });
  }),
  expectReject('token plan token_value present is rejected', () => {
    createTokenDryRun({ ...validPlan, token_value_present: true });
  }),
  expectReject('token plan wildcard scope is rejected', () => {
    createTokenDryRun({ ...validPlan, token_scope: '*' });
  }),
  expectReject('token plan execution_authorized=true is rejected', () => {
    createTokenDryRun({ ...validPlan, execution_authorized: true });
  }),
  expectReject('token plan live_call_performed=true is rejected', () => {
    createTokenDryRun({ ...validPlan, live_call_performed: true });
  }),
  expectReject('token dry-run token_issued=true is rejected', () => {
    validateTokenDryRun({ ...validTokenDryRun, token_issued: true }, validPlan);
  }),
  expectReject('token dry-run token_value present is rejected', () => {
    validateTokenDryRun({ ...validTokenDryRun, token_value: 'real-token-value' }, validPlan);
  }),
  expectReject('token dry-run token_hash present is rejected', () => {
    validateTokenDryRun({ ...validTokenDryRun, token_hash: 'sha256-preview' }, validPlan);
  }),
  expectReject('token dry-run operator_identity_present=true is rejected', () => {
    validateTokenDryRun({ ...validTokenDryRun, operator_identity_present: true }, validPlan);
  }),
  expectReject('token dry-run approval_text_present=true is rejected', () => {
    validateTokenDryRun({ ...validTokenDryRun, approval_text_present: true }, validPlan);
  }),
  expectReject('token dry-run expiry_present=true is rejected', () => {
    validateTokenDryRun({ ...validTokenDryRun, expiry_present: true }, validPlan);
  }),
  expectReject('token dry-run execution_authorized=true is rejected', () => {
    validateTokenDryRun({ ...validTokenDryRun, execution_authorized: true }, validPlan);
  }),
  expectReject('token dry-run live_call_performed=true is rejected', () => {
    validateTokenDryRun({ ...validTokenDryRun, live_call_performed: true }, validPlan);
  }),
  expectReject('token dry-run wildcard scope is rejected', () => {
    validateTokenDryRun({ ...validTokenDryRun, token_scope: '*' }, validPlan);
  })
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v6.7',
  verdict,
  source_job_id: validPlan.source_job_id,
  source_handoff_id: validPlan.source_handoff_id,
  source_bridge_id: validPlan.source_bridge_id,
  source_receipt_plan_id: validPlan.source_receipt_plan_id,
  source_receipt_dry_run_id: validPlan.source_receipt_dry_run_id,
  source_approval_token_plan_id: validPlan.approval_token_plan_id,
  no_live_execution_tool_called: true,
  generated_token_dry_run_mode: validTokenDryRun.token_dry_run_mode,
  generated_token_dry_run_status: validTokenDryRun.token_dry_run_status,
  generated_token_preview_generated: validTokenDryRun.token_preview_generated,
  generated_token_issued: validTokenDryRun.token_issued,
  generated_token_value_present: validTokenDryRun.token_value !== null,
  generated_token_hash_present: validTokenDryRun.token_hash !== null,
  generated_operator_identity_present: validTokenDryRun.operator_identity_present,
  generated_approval_text_present: validTokenDryRun.approval_text_present,
  generated_expiry_present: validTokenDryRun.expiry_present,
  generated_single_use_enforced: validTokenDryRun.single_use_enforced,
  generated_revocation_available: validTokenDryRun.revocation_available,
  generated_execution_authorized: validTokenDryRun.execution_authorized,
  generated_live_call_performed: validTokenDryRun.live_call_performed,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
