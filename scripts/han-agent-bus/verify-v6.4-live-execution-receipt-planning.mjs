import { spawnSync } from 'node:child_process';

const sourceJobDir = process.argv[2] || 'jobs/job_20260519115852_b784842d';

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function runV63Verifier() {
  const result = spawnSync(
    process.execPath,
    [
      'scripts/han-agent-bus/verify-v6.3-live-execution-adapter-dry-run-bridge.mjs',
      sourceJobDir
    ],
    {
      encoding: 'utf8'
    }
  );

  if (result.status !== 0) {
    throw new Error(`v6.3 verifier failed: ${result.stderr || result.stdout}`);
  }

  return JSON.parse(result.stdout);
}

function normalizeBridge(v63) {
  return {
    bridge_id: `bridge_${v63.source_job_id}_v6_3`,
    source_handoff_id: v63.source_handoff_id,
    source_job_id: v63.source_job_id,
    target: 'openclaw',
    agent: 'planner',
    risk_level: 'low',
    adapter_mode: v63.generated_adapter_mode,
    adapter_status: v63.generated_adapter_status,
    dry_run: v63.generated_dry_run,
    execution_authorized: v63.generated_execution_authorized,
    live_call_performed: v63.generated_live_call_performed,
    v63_verdict: v63.verdict,
    no_live_execution_tool_called: v63.no_live_execution_tool_called
  };
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

function validateSourceBridge(bridge) {
  assert(bridge && typeof bridge === 'object', 'adapter bridge is missing');
  assert(bridge.v63_verdict === 'PASS', 'v6.3 verifier result must be PASS');
  assert(bridge.no_live_execution_tool_called === true, 'v6.3 must not call live execution tool');
  assert(bridge.bridge_id && bridge.bridge_id.length >= 8, 'bridge_id is missing');
  assert(bridge.source_handoff_id && bridge.source_handoff_id.length >= 8, 'source_handoff_id is missing');
  assert(bridge.source_job_id && bridge.source_job_id.startsWith('job_'), 'source_job_id is invalid');
  assert(bridge.target === 'openclaw', 'bridge target must be openclaw');
  assert(bridge.agent === 'planner', 'bridge agent must be planner');
  assert(bridge.risk_level === 'low', 'bridge risk level must remain low');
  assert(bridge.adapter_mode === 'dry_run_bridge', 'adapter mode must be dry_run_bridge');
  assert(bridge.adapter_status === 'operator_review_required', 'adapter status must be operator_review_required');
  assert(bridge.dry_run === true, 'bridge dry_run must be true');
  assert(bridge.execution_authorized === false, 'bridge execution_authorized must remain false');
  assert(bridge.live_call_performed === false, 'bridge live_call_performed must remain false');
  return true;
}

function createReceiptPlan(bridge) {
  validateSourceBridge(bridge);

  return {
    receipt_plan_id: `receipt_plan_${bridge.source_job_id}_v6_4`,
    source_bridge_id: bridge.bridge_id,
    source_handoff_id: bridge.source_handoff_id,
    source_job_id: bridge.source_job_id,
    target: bridge.target,
    agent: bridge.agent,
    risk_level: bridge.risk_level,
    planned_live_tool: 'openclaw_send_task_live',
    receipt_mode: 'planned_receipt_only',
    receipt_status: 'operator_final_review_required',
    dry_run_bridge_verified: true,
    operator_final_approval_required: true,
    receipt_will_be_required: true,
    rollback_required: true,
    execution_authorized: false,
    live_call_performed: false,
    created_at: '2026-05-19T23:45:00.000Z',
    required_receipt_fields: requiredReceiptFields,
    receipt_payload_contract: {
      must_record_exit_code: true,
      must_record_stdout_path: true,
      must_record_stderr_path: true,
      must_record_artifact_paths: true,
      must_record_operator_final_approval_id: true,
      must_record_rollback_status: true,
      must_record_safety_notes: true
    },
    safety_boundary: 'v6.4 creates a live execution receipt plan only. It does not execute live actions or call live execution tools.'
  };
}

function validateReceiptPlan(plan, bridge) {
  assert(plan && typeof plan === 'object', 'receipt plan is missing');
  assert(plan.source_bridge_id === bridge.bridge_id, 'source_bridge_id mismatch');
  assert(plan.source_handoff_id === bridge.source_handoff_id, 'source_handoff_id mismatch');
  assert(plan.source_job_id === bridge.source_job_id, 'source_job_id mismatch');
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

  assert(String(plan.safety_boundary).includes('does not execute live actions'), 'safety boundary must deny live execution');
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

const v63 = runV63Verifier();
const validBridge = normalizeBridge(v63);
const validPlan = createReceiptPlan(validBridge);

const checks = [
  expectPass('valid v6.3 adapter dry-run bridge creates v6.4 receipt plan', () => {
    validateReceiptPlan(validPlan, validBridge);
  }),
  expectReject('missing bridge is rejected', () => {
    createReceiptPlan(null);
  }),
  expectReject('failed v6.3 verifier result is rejected', () => {
    createReceiptPlan({ ...validBridge, v63_verdict: 'FAIL' });
  }),
  expectReject('adapter_mode=live_execute is rejected', () => {
    createReceiptPlan({ ...validBridge, adapter_mode: 'live_execute' });
  }),
  expectReject('adapter_status=live_ready is rejected', () => {
    createReceiptPlan({ ...validBridge, adapter_status: 'live_ready' });
  }),
  expectReject('source bridge execution_authorized=true is rejected', () => {
    createReceiptPlan({ ...validBridge, execution_authorized: true });
  }),
  expectReject('source bridge live_call_performed=true is rejected', () => {
    createReceiptPlan({ ...validBridge, live_call_performed: true });
  }),
  expectReject('receipt plan execution_authorized=true is rejected', () => {
    validateReceiptPlan({ ...validPlan, execution_authorized: true }, validBridge);
  }),
  expectReject('receipt plan live_call_performed=true is rejected', () => {
    validateReceiptPlan({ ...validPlan, live_call_performed: true }, validBridge);
  }),
  expectReject('completed execution receipt status is rejected', () => {
    validateReceiptPlan({ ...validPlan, receipt_status: 'execution_completed' }, validBridge);
  }),
  expectReject('operator final approval requirement missing is rejected', () => {
    validateReceiptPlan({ ...validPlan, operator_final_approval_required: false }, validBridge);
  }),
  expectReject('missing required receipt field is rejected', () => {
    validateReceiptPlan(
      {
        ...validPlan,
        required_receipt_fields: validPlan.required_receipt_fields.filter((field) => field !== 'rollback_status')
      },
      validBridge
    );
  })
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v6.4',
  verdict,
  source_job_id: validBridge.source_job_id,
  source_handoff_id: validBridge.source_handoff_id,
  source_bridge_id: validBridge.bridge_id,
  no_live_execution_tool_called: true,
  generated_receipt_mode: validPlan.receipt_mode,
  generated_receipt_status: validPlan.receipt_status,
  generated_operator_final_approval_required: validPlan.operator_final_approval_required,
  generated_receipt_will_be_required: validPlan.receipt_will_be_required,
  generated_rollback_required: validPlan.rollback_required,
  generated_execution_authorized: validPlan.execution_authorized,
  generated_live_call_performed: validPlan.live_call_performed,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
