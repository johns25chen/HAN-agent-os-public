import { spawnSync } from 'node:child_process';

const sourceJobDir = process.argv[2] || 'jobs/job_20260519115852_b784842d';

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function runV67Verifier() {
  const result = spawnSync(
    process.execPath,
    [
      'scripts/han-agent-bus/verify-v6.7-final-operator-approval-token-dry-run.mjs',
      sourceJobDir
    ],
    { encoding: 'utf8' }
  );

  if (result.status !== 0) {
    throw new Error(`v6.7 verifier failed: ${result.stderr || result.stdout}`);
  }

  return JSON.parse(result.stdout);
}

function normalizeTokenDryRun(v67) {
  return {
    approval_token_dry_run_id: `approval_token_dry_run_${v67.source_job_id}_v6_7`,
    source_approval_token_plan_id: v67.source_approval_token_plan_id,
    source_receipt_dry_run_id: v67.source_receipt_dry_run_id,
    source_receipt_plan_id: v67.source_receipt_plan_id,
    source_bridge_id: v67.source_bridge_id,
    source_handoff_id: v67.source_handoff_id,
    source_job_id: v67.source_job_id,
    target: 'openclaw',
    agent: 'planner',
    risk_level: 'low',
    planned_live_tool: 'openclaw_send_task_live',
    token_dry_run_mode: v67.generated_token_dry_run_mode,
    token_dry_run_status: v67.generated_token_dry_run_status,
    token_preview_generated: v67.generated_token_preview_generated,
    token_issued: v67.generated_token_issued,
    token_value_present: v67.generated_token_value_present,
    token_hash_present: v67.generated_token_hash_present,
    operator_identity_present: v67.generated_operator_identity_present,
    approval_text_present: v67.generated_approval_text_present,
    expiry_present: v67.generated_expiry_present,
    single_use_enforced: v67.generated_single_use_enforced,
    revocation_available: v67.generated_revocation_available,
    execution_authorized: v67.generated_execution_authorized,
    live_call_performed: v67.generated_live_call_performed,
    v67_verdict: v67.verdict,
    no_live_execution_tool_called: v67.no_live_execution_tool_called
  };
}

function validateTokenDryRun(tokenDryRun) {
  assert(tokenDryRun && typeof tokenDryRun === 'object', 'token dry-run is missing');
  assert(tokenDryRun.v67_verdict === 'PASS', 'v6.7 verifier result must be PASS');
  assert(tokenDryRun.no_live_execution_tool_called === true, 'v6.7 must not call live execution tool');
  assert(tokenDryRun.approval_token_dry_run_id && tokenDryRun.approval_token_dry_run_id.length >= 8, 'approval_token_dry_run_id is missing');
  assert(tokenDryRun.source_approval_token_plan_id && tokenDryRun.source_approval_token_plan_id.length >= 8, 'source_approval_token_plan_id is missing');
  assert(tokenDryRun.source_receipt_dry_run_id && tokenDryRun.source_receipt_dry_run_id.length >= 8, 'source_receipt_dry_run_id is missing');
  assert(tokenDryRun.source_receipt_plan_id && tokenDryRun.source_receipt_plan_id.length >= 8, 'source_receipt_plan_id is missing');
  assert(tokenDryRun.source_bridge_id && tokenDryRun.source_bridge_id.length >= 8, 'source_bridge_id is missing');
  assert(tokenDryRun.source_handoff_id && tokenDryRun.source_handoff_id.length >= 8, 'source_handoff_id is missing');
  assert(tokenDryRun.source_job_id && tokenDryRun.source_job_id.startsWith('job_'), 'source_job_id is invalid');
  assert(tokenDryRun.target === 'openclaw', 'token dry-run target must be openclaw');
  assert(tokenDryRun.agent === 'planner', 'token dry-run agent must be planner');
  assert(tokenDryRun.risk_level === 'low', 'token dry-run risk level must remain low');
  assert(tokenDryRun.planned_live_tool === 'openclaw_send_task_live', 'planned live tool mismatch');
  assert(tokenDryRun.token_dry_run_mode === 'token_preview_only', 'token dry-run mode must be token_preview_only');
  assert(tokenDryRun.token_dry_run_status === 'token_preview_generated', 'token dry-run status must be token_preview_generated');
  assert(tokenDryRun.token_preview_generated === true, 'token preview must be generated');
  assert(tokenDryRun.token_issued === false, 'token must not be issued before v6.8');
  assert(tokenDryRun.token_value_present === false, 'token value must not be present before v6.8');
  assert(tokenDryRun.token_hash_present === false, 'token hash must not be present before v6.8');
  assert(tokenDryRun.operator_identity_present === false, 'operator identity must not be present before v6.8');
  assert(tokenDryRun.approval_text_present === false, 'approval text must not be present before v6.8');
  assert(tokenDryRun.expiry_present === false, 'expiry must not be present before v6.8');
  assert(tokenDryRun.single_use_enforced === true, 'single-use must be enforced');
  assert(tokenDryRun.revocation_available === true, 'revocation must be available');
  assert(tokenDryRun.execution_authorized === false, 'token dry-run execution_authorized must remain false');
  assert(tokenDryRun.live_call_performed === false, 'token dry-run live_call_performed must remain false');
  return true;
}

function createAuthorizationEnvelopeDryRun(tokenDryRun) {
  validateTokenDryRun(tokenDryRun);

  return {
    authorization_envelope_dry_run_id: `execution_authorization_envelope_dry_run_${tokenDryRun.source_job_id}_v6_8`,
    source_approval_token_dry_run_id: tokenDryRun.approval_token_dry_run_id,
    source_approval_token_plan_id: tokenDryRun.source_approval_token_plan_id,
    source_receipt_dry_run_id: tokenDryRun.source_receipt_dry_run_id,
    source_receipt_plan_id: tokenDryRun.source_receipt_plan_id,
    source_bridge_id: tokenDryRun.source_bridge_id,
    source_handoff_id: tokenDryRun.source_handoff_id,
    source_job_id: tokenDryRun.source_job_id,
    target: tokenDryRun.target,
    agent: tokenDryRun.agent,
    risk_level: tokenDryRun.risk_level,
    planned_live_tool: tokenDryRun.planned_live_tool,
    authorization_mode: 'authorization_envelope_preview_only',
    authorization_status: 'execution_authorization_preview_generated',
    dry_run: true,
    token_preview_verified: true,
    authorization_token_issued: false,
    authorization_token_value: null,
    authorization_token_hash: null,
    operator_identity_bound: false,
    approval_text_bound: false,
    expiry_bound: false,
    single_use_enforced: true,
    revocation_available: true,
    authorization_decision: 'not_authorized_dry_run',
    execution_authorized: false,
    live_tool_call_allowed: false,
    live_call_performed: false,
    created_at: '2026-05-20T00:30:00.000Z',
    authorization_envelope_preview: {
      preview_only: true,
      no_real_authorization: true,
      no_token_material: true,
      no_live_tool_called: true,
      no_execution_permitted: true,
      next_required_action: 'v6-final-architecture-closure'
    },
    safety_boundary: 'v6.8 creates an execution authorization envelope dry-run preview only. It does not authorize execution, issue tokens, execute live actions, or call live execution tools.'
  };
}

function validateAuthorizationEnvelopeDryRun(envelope, tokenDryRun) {
  assert(envelope && typeof envelope === 'object', 'authorization envelope dry-run is missing');
  assert(envelope.source_approval_token_dry_run_id === tokenDryRun.approval_token_dry_run_id, 'source_approval_token_dry_run_id mismatch');
  assert(envelope.source_approval_token_plan_id === tokenDryRun.source_approval_token_plan_id, 'source_approval_token_plan_id mismatch');
  assert(envelope.source_receipt_dry_run_id === tokenDryRun.source_receipt_dry_run_id, 'source_receipt_dry_run_id mismatch');
  assert(envelope.source_receipt_plan_id === tokenDryRun.source_receipt_plan_id, 'source_receipt_plan_id mismatch');
  assert(envelope.source_bridge_id === tokenDryRun.source_bridge_id, 'source_bridge_id mismatch');
  assert(envelope.source_handoff_id === tokenDryRun.source_handoff_id, 'source_handoff_id mismatch');
  assert(envelope.source_job_id === tokenDryRun.source_job_id, 'source_job_id mismatch');
  assert(envelope.target === 'openclaw', 'authorization envelope target must be openclaw');
  assert(envelope.agent === 'planner', 'authorization envelope agent must be planner');
  assert(envelope.risk_level === 'low', 'authorization envelope risk level must remain low');
  assert(envelope.planned_live_tool === 'openclaw_send_task_live', 'planned live tool mismatch');
  assert(envelope.authorization_mode === 'authorization_envelope_preview_only', 'authorization mode must be authorization_envelope_preview_only');
  assert(envelope.authorization_status === 'execution_authorization_preview_generated', 'authorization status must be execution_authorization_preview_generated');
  assert(envelope.dry_run === true, 'authorization envelope dry_run must be true');
  assert(envelope.token_preview_verified === true, 'token preview must be verified');
  assert(envelope.authorization_token_issued === false, 'authorization token must not be issued in v6.8');
  assert(envelope.authorization_token_value === null, 'authorization token value must remain null in v6.8');
  assert(envelope.authorization_token_hash === null, 'authorization token hash must remain null in v6.8');
  assert(envelope.operator_identity_bound === false, 'operator identity must not be bound in v6.8');
  assert(envelope.approval_text_bound === false, 'approval text must not be bound in v6.8');
  assert(envelope.expiry_bound === false, 'expiry must not be bound in v6.8');
  assert(envelope.single_use_enforced === true, 'single-use must be enforced');
  assert(envelope.revocation_available === true, 'revocation must be available');
  assert(envelope.authorization_decision === 'not_authorized_dry_run', 'authorization decision must remain not_authorized_dry_run');
  assert(envelope.execution_authorized === false, 'execution_authorized must remain false');
  assert(envelope.live_tool_call_allowed === false, 'live tool call must not be allowed');
  assert(envelope.live_call_performed === false, 'live call must not be performed');
  assert(envelope.authorization_envelope_preview?.preview_only === true, 'authorization envelope must mark preview_only');
  assert(envelope.authorization_envelope_preview?.no_real_authorization === true, 'authorization envelope must deny real authorization');
  assert(envelope.authorization_envelope_preview?.no_token_material === true, 'authorization envelope must deny token material');
  assert(envelope.authorization_envelope_preview?.no_live_tool_called === true, 'authorization envelope must deny live tool calls');
  assert(envelope.authorization_envelope_preview?.no_execution_permitted === true, 'authorization envelope must deny execution');
  assert(String(envelope.safety_boundary).includes('does not authorize execution'), 'safety boundary must deny execution authorization');
  assert(String(envelope.safety_boundary).includes('issue tokens'), 'safety boundary must deny token issuance');
  assert(String(envelope.safety_boundary).includes('execute live actions'), 'safety boundary must deny live execution');
  assert(String(envelope.safety_boundary).includes('call live execution tools'), 'safety boundary must deny live tool calls');
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

const v67 = runV67Verifier();
const validTokenDryRun = normalizeTokenDryRun(v67);
const validEnvelope = createAuthorizationEnvelopeDryRun(validTokenDryRun);

const checks = [
  expectPass('valid v6.7 token dry-run creates v6.8 execution authorization envelope dry-run', () => {
    validateAuthorizationEnvelopeDryRun(validEnvelope, validTokenDryRun);
  }),
  expectReject('missing token dry-run is rejected', () => {
    createAuthorizationEnvelopeDryRun(null);
  }),
  expectReject('failed v6.7 verifier result is rejected', () => {
    createAuthorizationEnvelopeDryRun({ ...validTokenDryRun, v67_verdict: 'FAIL' });
  }),
  expectReject('token dry-run token_issued=true is rejected', () => {
    createAuthorizationEnvelopeDryRun({ ...validTokenDryRun, token_issued: true });
  }),
  expectReject('token dry-run token_value_present=true is rejected', () => {
    createAuthorizationEnvelopeDryRun({ ...validTokenDryRun, token_value_present: true });
  }),
  expectReject('token dry-run token_hash_present=true is rejected', () => {
    createAuthorizationEnvelopeDryRun({ ...validTokenDryRun, token_hash_present: true });
  }),
  expectReject('token dry-run operator_identity_present=true is rejected', () => {
    createAuthorizationEnvelopeDryRun({ ...validTokenDryRun, operator_identity_present: true });
  }),
  expectReject('token dry-run approval_text_present=true is rejected', () => {
    createAuthorizationEnvelopeDryRun({ ...validTokenDryRun, approval_text_present: true });
  }),
  expectReject('token dry-run expiry_present=true is rejected', () => {
    createAuthorizationEnvelopeDryRun({ ...validTokenDryRun, expiry_present: true });
  }),
  expectReject('token dry-run execution_authorized=true is rejected', () => {
    createAuthorizationEnvelopeDryRun({ ...validTokenDryRun, execution_authorized: true });
  }),
  expectReject('token dry-run live_call_performed=true is rejected', () => {
    createAuthorizationEnvelopeDryRun({ ...validTokenDryRun, live_call_performed: true });
  }),
  expectReject('authorization envelope dry_run=false is rejected', () => {
    validateAuthorizationEnvelopeDryRun({ ...validEnvelope, dry_run: false }, validTokenDryRun);
  }),
  expectReject('authorization decision authorized is rejected', () => {
    validateAuthorizationEnvelopeDryRun({ ...validEnvelope, authorization_decision: 'authorized' }, validTokenDryRun);
  }),
  expectReject('authorization envelope execution_authorized=true is rejected', () => {
    validateAuthorizationEnvelopeDryRun({ ...validEnvelope, execution_authorized: true }, validTokenDryRun);
  }),
  expectReject('authorization envelope live_tool_call_allowed=true is rejected', () => {
    validateAuthorizationEnvelopeDryRun({ ...validEnvelope, live_tool_call_allowed: true }, validTokenDryRun);
  }),
  expectReject('authorization envelope live_call_performed=true is rejected', () => {
    validateAuthorizationEnvelopeDryRun({ ...validEnvelope, live_call_performed: true }, validTokenDryRun);
  }),
  expectReject('authorization token issued is rejected', () => {
    validateAuthorizationEnvelopeDryRun({ ...validEnvelope, authorization_token_issued: true }, validTokenDryRun);
  }),
  expectReject('authorization token value present is rejected', () => {
    validateAuthorizationEnvelopeDryRun({ ...validEnvelope, authorization_token_value: 'real-token-value' }, validTokenDryRun);
  }),
  expectReject('authorization token hash present is rejected', () => {
    validateAuthorizationEnvelopeDryRun({ ...validEnvelope, authorization_token_hash: 'sha256-token' }, validTokenDryRun);
  })
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v6.8',
  verdict,
  source_job_id: validTokenDryRun.source_job_id,
  source_handoff_id: validTokenDryRun.source_handoff_id,
  source_bridge_id: validTokenDryRun.source_bridge_id,
  source_receipt_plan_id: validTokenDryRun.source_receipt_plan_id,
  source_receipt_dry_run_id: validTokenDryRun.source_receipt_dry_run_id,
  source_approval_token_plan_id: validTokenDryRun.source_approval_token_plan_id,
  source_approval_token_dry_run_id: validTokenDryRun.approval_token_dry_run_id,
  no_live_execution_tool_called: true,
  generated_authorization_mode: validEnvelope.authorization_mode,
  generated_authorization_status: validEnvelope.authorization_status,
  generated_dry_run: validEnvelope.dry_run,
  generated_token_preview_verified: validEnvelope.token_preview_verified,
  generated_authorization_token_issued: validEnvelope.authorization_token_issued,
  generated_authorization_token_value_present: validEnvelope.authorization_token_value !== null,
  generated_authorization_token_hash_present: validEnvelope.authorization_token_hash !== null,
  generated_operator_identity_bound: validEnvelope.operator_identity_bound,
  generated_approval_text_bound: validEnvelope.approval_text_bound,
  generated_expiry_bound: validEnvelope.expiry_bound,
  generated_authorization_decision: validEnvelope.authorization_decision,
  generated_execution_authorized: validEnvelope.execution_authorized,
  generated_live_tool_call_allowed: validEnvelope.live_tool_call_allowed,
  generated_live_call_performed: validEnvelope.live_call_performed,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
