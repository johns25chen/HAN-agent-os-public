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

function requireTag(tagName) {
  assert(tagExists(tagName), `missing tag: ${tagName}`);
}

function runV73Verifier() {
  const result = spawnSync(
    process.execPath,
    ['scripts/han-agent-bus/verify-v7.3-controlled-live-execution-receipt.mjs'],
    { encoding: 'utf8' }
  );

  if (result.status !== 0) {
    throw new Error(`v7.3 verifier failed: ${result.stderr || result.stdout}`);
  }

  return JSON.parse(result.stdout);
}

function validateBaselineTags() {
  const requiredTags = [
    'han-agent-bus-v7-phase-charter',
    'han-agent-bus-v7.0-stable',
    'han-agent-bus-v7.1-stable',
    'han-agent-bus-v7.2-stable',
    'han-agent-bus-v7.3-stable',
    'han-agent-bus-v7.3-risk-readiness-gate',
    'han-agent-bus-v7.3-implementation-plan',
    'han-agent-bus-v7.3-operator-decision-receipt-only'
  ];

  for (const tag of requiredTags) {
    requireTag(tag);
  }
}

function createClosure(v73, overrides = {}) {
  validateBaselineTags();

  assert(v73 && typeof v73 === 'object', 'v7.3 verifier result is missing');
  assert(v73.verdict === 'PASS', 'v7.3 verifier result must be PASS');

  const closure = {
    v7_closure_id: `v7_closure_${v73.source_job_id}_v7_4`,
    v7_closure_mode: 'final_closure_verification',
    v7_closure_status: 'v7_closed_receipt_only',
    source_job_id: v73.source_job_id,
    source_v7_phase_charter_tag: 'han-agent-bus-v7-phase-charter',
    source_v7_0_stable_tag: 'han-agent-bus-v7.0-stable',
    source_v7_1_stable_tag: 'han-agent-bus-v7.1-stable',
    source_v7_2_stable_tag: 'han-agent-bus-v7.2-stable',
    source_v7_3_stable_tag: 'han-agent-bus-v7.3-stable',
    source_v7_3_risk_gate_tag: 'han-agent-bus-v7.3-risk-readiness-gate',
    source_v7_3_implementation_plan_tag: 'han-agent-bus-v7.3-implementation-plan',
    source_v7_3_operator_decision_tag: 'han-agent-bus-v7.3-operator-decision-receipt-only',
    v7_3_mode: v73.mode,
    receipt_only_mode: v73.mode === 'receipt-only-contract',
    receipt_contract_verified: v73.generated_receipt_contract_verified,
    approval_contract_verified: v73.generated_approval_contract_verified,
    rollback_contract_verified: v73.generated_rollback_contract_verified,
    post_run_verification_contract_verified: v73.generated_post_run_verification_contract_verified,
    actual_execution_count: v73.generated_actual_execution_count,
    execution_authorized: v73.generated_execution_authorized,
    live_call_performed: v73.generated_live_call_performed,
    repeated_execution_allowed: v73.generated_repeated_execution_allowed,
    chained_execution_allowed: v73.generated_chained_execution_allowed,
    autonomous_execution_allowed: v73.generated_autonomous_execution_allowed,
    credential_persistence_allowed: v73.generated_credential_persistence_allowed,
    browser_session_persistence_allowed: v73.generated_browser_session_persistence_allowed,
    cookie_persistence_allowed: v73.generated_cookie_persistence_allowed,
    api_key_persistence_allowed: v73.generated_api_key_persistence_allowed,
    no_live_execution_tool_called: v73.no_live_execution_tool_called,
    v7_5_required: false,
    v7_closed: true,
    created_at: '2026-05-20T01:00:00.000Z',
    closure_notes: [
      'V7 closes in receipt-only mode.',
      'No real live execution occurred.',
      'No execution was authorized.',
      'No live execution tool was called.',
      'Rollback contract was verified.',
      'Post-run verification contract was verified.',
      'V7.5 is not required.'
    ],
    safety_boundary: 'v7.4 closes V7 in receipt-only mode. It does not authorize execution, perform live actions, call live execution tools, or persist credentials.'
  };

  return { ...closure, ...overrides };
}

function validateClosure(closure) {
  assert(closure && typeof closure === 'object', 'V7 closure is missing');
  assert(closure.v7_closure_mode === 'final_closure_verification', 'closure mode mismatch');
  assert(closure.v7_closure_status === 'v7_closed_receipt_only', 'closure status mismatch');
  assert(closure.source_v7_phase_charter_tag === 'han-agent-bus-v7-phase-charter', 'V7 phase charter tag mismatch');
  assert(closure.source_v7_0_stable_tag === 'han-agent-bus-v7.0-stable', 'v7.0 stable tag mismatch');
  assert(closure.source_v7_1_stable_tag === 'han-agent-bus-v7.1-stable', 'v7.1 stable tag mismatch');
  assert(closure.source_v7_2_stable_tag === 'han-agent-bus-v7.2-stable', 'v7.2 stable tag mismatch');
  assert(closure.source_v7_3_stable_tag === 'han-agent-bus-v7.3-stable', 'v7.3 stable tag mismatch');
  assert(closure.source_v7_3_risk_gate_tag === 'han-agent-bus-v7.3-risk-readiness-gate', 'v7.3 risk gate tag mismatch');
  assert(closure.source_v7_3_implementation_plan_tag === 'han-agent-bus-v7.3-implementation-plan', 'v7.3 implementation plan tag mismatch');
  assert(closure.source_v7_3_operator_decision_tag === 'han-agent-bus-v7.3-operator-decision-receipt-only', 'v7.3 operator decision tag mismatch');
  assert(closure.v7_3_mode === 'receipt-only-contract', 'v7.3 mode must be receipt-only-contract');
  assert(closure.receipt_only_mode === true, 'receipt-only mode must be true');
  assert(closure.receipt_contract_verified === true, 'receipt contract must be verified');
  assert(closure.approval_contract_verified === true, 'approval contract must be verified');
  assert(closure.rollback_contract_verified === true, 'rollback contract must be verified');
  assert(closure.post_run_verification_contract_verified === true, 'post-run verification contract must be verified');
  assert(closure.actual_execution_count === 0, 'actual execution count must be 0');
  assert(closure.execution_authorized === false, 'execution_authorized must remain false');
  assert(closure.live_call_performed === false, 'live_call_performed must remain false');
  assert(closure.repeated_execution_allowed === false, 'repeated execution must remain false');
  assert(closure.chained_execution_allowed === false, 'chained execution must remain false');
  assert(closure.autonomous_execution_allowed === false, 'autonomous execution must remain false');
  assert(closure.credential_persistence_allowed === false, 'credential persistence must remain false');
  assert(closure.browser_session_persistence_allowed === false, 'browser session persistence must remain false');
  assert(closure.cookie_persistence_allowed === false, 'cookie persistence must remain false');
  assert(closure.api_key_persistence_allowed === false, 'API key persistence must remain false');
  assert(closure.no_live_execution_tool_called === true, 'no live execution tool must be called');
  assert(closure.v7_5_required === false, 'v7.5 must not be required');
  assert(closure.v7_closed === true, 'V7 must be closed');
  assert(String(closure.safety_boundary).includes('does not authorize execution'), 'safety boundary must deny authorization');
  assert(String(closure.safety_boundary).includes('perform live actions'), 'safety boundary must deny live actions');
  assert(String(closure.safety_boundary).includes('call live execution tools'), 'safety boundary must deny live tool calls');
  assert(String(closure.safety_boundary).includes('persist credentials'), 'safety boundary must deny credential persistence');
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

const v73 = runV73Verifier();
const validClosure = createClosure(v73);

const checks = [
  expectPass('valid v7.3 receipt-only result closes V7', () => {
    validateClosure(validClosure);
  }),
  expectReject('failed v7.3 verifier result is rejected', () => {
    createClosure({ ...v73, verdict: 'FAIL' });
  }),
  expectReject('non receipt-only v7.3 mode is rejected', () => {
    validateClosure(createClosure(v73, { v7_3_mode: 'live-execution' }));
  }),
  expectReject('actual execution count above zero is rejected', () => {
    validateClosure(createClosure(v73, { actual_execution_count: 1 }));
  }),
  expectReject('execution_authorized=true is rejected', () => {
    validateClosure(createClosure(v73, { execution_authorized: true }));
  }),
  expectReject('live_call_performed=true is rejected', () => {
    validateClosure(createClosure(v73, { live_call_performed: true }));
  }),
  expectReject('receipt contract not verified is rejected', () => {
    validateClosure(createClosure(v73, { receipt_contract_verified: false }));
  }),
  expectReject('rollback contract not verified is rejected', () => {
    validateClosure(createClosure(v73, { rollback_contract_verified: false }));
  }),
  expectReject('post-run verification contract not verified is rejected', () => {
    validateClosure(createClosure(v73, { post_run_verification_contract_verified: false }));
  }),
  expectReject('repeated execution allowed is rejected', () => {
    validateClosure(createClosure(v73, { repeated_execution_allowed: true }));
  }),
  expectReject('chained execution allowed is rejected', () => {
    validateClosure(createClosure(v73, { chained_execution_allowed: true }));
  }),
  expectReject('autonomous execution allowed is rejected', () => {
    validateClosure(createClosure(v73, { autonomous_execution_allowed: true }));
  }),
  expectReject('credential persistence allowed is rejected', () => {
    validateClosure(createClosure(v73, { credential_persistence_allowed: true }));
  }),
  expectReject('browser session persistence allowed is rejected', () => {
    validateClosure(createClosure(v73, { browser_session_persistence_allowed: true }));
  }),
  expectReject('cookie persistence allowed is rejected', () => {
    validateClosure(createClosure(v73, { cookie_persistence_allowed: true }));
  }),
  expectReject('API key persistence allowed is rejected', () => {
    validateClosure(createClosure(v73, { api_key_persistence_allowed: true }));
  }),
  expectReject('v7.5 required is rejected', () => {
    validateClosure(createClosure(v73, { v7_5_required: true }));
  }),
  expectReject('V7 not closed is rejected', () => {
    validateClosure(createClosure(v73, { v7_closed: false }));
  })
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v7.4',
  verdict,
  source_job_id: validClosure.source_job_id,
  generated_v7_closure_mode: validClosure.v7_closure_mode,
  generated_v7_closure_status: validClosure.v7_closure_status,
  generated_v7_3_mode: validClosure.v7_3_mode,
  generated_receipt_only_mode: validClosure.receipt_only_mode,
  generated_receipt_contract_verified: validClosure.receipt_contract_verified,
  generated_approval_contract_verified: validClosure.approval_contract_verified,
  generated_rollback_contract_verified: validClosure.rollback_contract_verified,
  generated_post_run_verification_contract_verified: validClosure.post_run_verification_contract_verified,
  generated_actual_execution_count: validClosure.actual_execution_count,
  generated_execution_authorized: validClosure.execution_authorized,
  generated_live_call_performed: validClosure.live_call_performed,
  generated_repeated_execution_allowed: validClosure.repeated_execution_allowed,
  generated_chained_execution_allowed: validClosure.chained_execution_allowed,
  generated_autonomous_execution_allowed: validClosure.autonomous_execution_allowed,
  generated_credential_persistence_allowed: validClosure.credential_persistence_allowed,
  generated_browser_session_persistence_allowed: validClosure.browser_session_persistence_allowed,
  generated_cookie_persistence_allowed: validClosure.cookie_persistence_allowed,
  generated_api_key_persistence_allowed: validClosure.api_key_persistence_allowed,
  generated_no_live_execution_tool_called: validClosure.no_live_execution_tool_called,
  generated_v7_5_required: validClosure.v7_5_required,
  generated_v7_closed: validClosure.v7_closed,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
