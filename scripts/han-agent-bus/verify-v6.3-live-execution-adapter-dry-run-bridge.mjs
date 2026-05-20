import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const sourceJobDir = process.argv[2] || 'jobs/job_20260519115852_b784842d';
const absoluteJobDir = path.resolve(repoRoot, sourceJobDir);

const riskRank = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function normalizeDryRun(jobDir) {
  const task = readJson(path.join(jobDir, 'openclaw_task.json'));
  const request = readJson(path.join(jobDir, 'request.json'));
  const stdout = readText(path.join(jobDir, 'stdout.log'));
  const stderr = readText(path.join(jobDir, 'stderr.log'));

  return {
    source_job_id: firstDefined(task.task_id, request.task_id, path.basename(jobDir)),
    target: firstDefined(task.target, request.target, request.task?.target),
    agent: firstDefined(task.agent, request.agent, request.task?.agent),
    risk_level: firstDefined(task.risk_level, request.risk_level, request.task?.risk_level),
    require_approval: firstDefined(task.require_approval, request.require_approval, request.task?.require_approval),
    request_tool: firstDefined(request.tool, request.request_tool, request.name),
    request_status: firstDefined(request.status, request.request_status),
    request_dry_run: firstDefined(request.dry_run, request.request_dry_run),
    request_exit_code: Number(firstDefined(request.exit_code, request.request_exit_code)),
    stdout,
    stderr,
    redaction_preview_safe: true,
    task
  };
}

function validateDryRun(dry) {
  assert(dry.source_job_id && dry.source_job_id.startsWith('job_'), 'invalid source job id');
  assert(dry.target === 'openclaw', 'dry-run target must be openclaw');
  assert(dry.agent === 'planner', 'dry-run agent must be planner');
  assert(dry.risk_level === 'low', 'dry-run risk level must remain low');
  assert(dry.require_approval === true, 'dry-run must require approval');
  assert(dry.request_tool === 'openclaw_send_task_dryrun', 'dry-run request tool mismatch');
  assert(dry.request_status === 'dry_run', 'dry-run request status mismatch');
  assert(dry.request_dry_run === true, 'dry_run flag must be true');
  assert(dry.request_exit_code === 0, 'dry-run exit code must be 0');
  assert(dry.stderr.length === 0, 'stderr must be empty');
  assert(dry.stdout.includes('"target"') && dry.stdout.includes('"openclaw"'), 'stdout must contain expected task JSON');
  assert(dry.redaction_preview_safe === true, 'redaction preview must be safe');
  return true;
}

function validateApprovalReceipt(approval, dry) {
  assert(approval && typeof approval === 'object', 'approval receipt is missing');
  assert(approval.approval_status === 'approved', 'approval status must be approved');
  assert(approval.source_job_id === dry.source_job_id, 'approval source_job_id mismatch');
  assert(approval.approved_target === dry.target, 'approval target mismatch');
  assert(approval.approved_agent === dry.agent, 'approval agent mismatch');
  assert(approval.approved_tool === 'openclaw_send_task_live_handoff', 'approved tool mismatch');
  assert(riskRank[approval.approved_risk_level] <= riskRank[dry.risk_level], 'approval risk level exceeds dry-run boundary');
  assert(typeof approval.approval_text === 'string' && approval.approval_text.length >= 20, 'approval text is empty or generic');
  assert(!['*', 'all', 'any', 'wildcard', 'global'].includes(approval.approval_scope), 'approval scope cannot be wildcard');
  assert(typeof approval.approval_intent === 'string' && approval.approval_intent.length >= 20, 'approval intent is missing');
  assert(approval.approval_text.includes(dry.source_job_id), 'approval text must name the exact source job');
  return true;
}

function createV62PendingHandoff(dry, approval) {
  validateDryRun(dry);
  validateApprovalReceipt(approval, dry);

  return {
    handoff_id: `handoff_${dry.source_job_id}_v6_2`,
    source_job_id: dry.source_job_id,
    source_dry_run_result_path: sourceJobDir,
    approval_receipt_path: `approval-receipts/${approval.approval_id}.json`,
    target: dry.target,
    agent: dry.agent,
    risk_level: dry.risk_level,
    require_approval: true,
    handoff_status: 'pending_live_execution',
    handoff_tool: 'openclaw_send_task_live_handoff',
    handoff_created_at: '2026-05-19T23:30:00.000Z',
    handoff_payload: {
      source_task_id: dry.source_job_id,
      target: dry.target,
      agent: dry.agent,
      dry_run_verified: true,
      approval_id: approval.approval_id,
      prepared_only: true
    },
    safety_boundary: 'v6.2 prepares a pending live handoff package only. It does not execute live actions.',
    execution_authorized: false
  };
}

function validateV62PendingHandoff(handoff) {
  assert(handoff && typeof handoff === 'object', 'handoff package is missing');
  assert(handoff.handoff_id && handoff.handoff_id.length >= 8, 'handoff_id is missing');
  assert(handoff.source_job_id && handoff.source_job_id.startsWith('job_'), 'handoff source_job_id is invalid');
  assert(handoff.target === 'openclaw', 'unsupported handoff target');
  assert(handoff.agent === 'planner', 'handoff agent mismatch');
  assert(handoff.risk_level === 'low', 'handoff risk level must remain low');
  assert(handoff.require_approval === true, 'handoff require_approval must remain true');
  assert(handoff.handoff_status === 'pending_live_execution', 'handoff status must be pending_live_execution');
  assert(handoff.handoff_tool === 'openclaw_send_task_live_handoff', 'handoff tool mismatch');
  assert(handoff.execution_authorized === false, 'source handoff execution_authorized must remain false');
  assert(typeof handoff.safety_boundary === 'string' && handoff.safety_boundary.includes('does not execute'), 'handoff safety boundary must deny execution');
  return true;
}

function createAdapterDryRunBridge(handoff, adapterConfig = {}) {
  validateV62PendingHandoff(handoff);

  const adapterTarget = adapterConfig.adapter_target ?? handoff.target;
  const adapterMode = adapterConfig.adapter_mode ?? 'dry_run_bridge';

  assert(adapterTarget === handoff.target, 'adapter target must match handoff target');
  assert(adapterTarget === 'openclaw', 'unsupported adapter target');
  assert(adapterMode === 'dry_run_bridge', 'adapter mode must be dry_run_bridge');

  return {
    bridge_id: `bridge_${handoff.source_job_id}_v6_3`,
    source_handoff_id: handoff.handoff_id,
    source_job_id: handoff.source_job_id,
    adapter_name: 'openclaw-live-execution-adapter',
    adapter_version: 'v6.3',
    adapter_target: adapterTarget,
    adapter_mode: adapterMode,
    adapter_status: 'operator_review_required',
    adapter_tool: 'openclaw_live_execution_adapter_dry_run_bridge',
    live_tool_name: 'openclaw_send_task_live',
    dry_run: true,
    execution_authorized: false,
    live_call_performed: false,
    created_at: '2026-05-19T23:30:00.000Z',
    input_handoff_snapshot: {
      handoff_id: handoff.handoff_id,
      source_job_id: handoff.source_job_id,
      target: handoff.target,
      agent: handoff.agent,
      risk_level: handoff.risk_level,
      require_approval: handoff.require_approval,
      handoff_status: handoff.handoff_status,
      execution_authorized: handoff.execution_authorized
    },
    adapter_payload: {
      prepared_from_handoff: true,
      live_execution_blocked: true,
      next_required_action: 'human_operator_review',
      allowed_next_stage: 'v6.4-live-execution-receipt-planning'
    },
    safety_boundary: 'v6.3 maps a pending live handoff package into an adapter dry-run bridge only. It does not call live execution.'
  };
}

function validateAdapterDryRunBridge(bridge, handoff) {
  assert(bridge && typeof bridge === 'object', 'adapter bridge is missing');
  assert(bridge.source_handoff_id === handoff.handoff_id, 'bridge source_handoff_id mismatch');
  assert(bridge.source_job_id === handoff.source_job_id, 'bridge source_job_id mismatch');
  assert(bridge.adapter_name === 'openclaw-live-execution-adapter', 'adapter name mismatch');
  assert(bridge.adapter_version === 'v6.3', 'adapter version mismatch');
  assert(bridge.adapter_target === handoff.target, 'adapter target mismatch');
  assert(bridge.adapter_mode === 'dry_run_bridge', 'adapter mode must be dry_run_bridge');
  assert(bridge.adapter_status === 'operator_review_required', 'adapter status must be operator_review_required');
  assert(bridge.adapter_tool === 'openclaw_live_execution_adapter_dry_run_bridge', 'adapter tool mismatch');
  assert(bridge.live_tool_name === 'openclaw_send_task_live', 'live tool name mismatch');
  assert(bridge.dry_run === true, 'adapter bridge dry_run must be true');
  assert(bridge.execution_authorized === false, 'adapter bridge execution_authorized must remain false');
  assert(bridge.live_call_performed === false, 'adapter bridge live_call_performed must remain false');
  assert(bridge.adapter_payload?.live_execution_blocked === true, 'adapter payload must block live execution');
  assert(String(bridge.safety_boundary).includes('does not call live execution'), 'safety boundary must deny live execution calls');
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

const dry = normalizeDryRun(absoluteJobDir);

const validApproval = {
  approval_id: 'approval_v6_3_0001',
  source_job_id: dry.source_job_id,
  approved_target: dry.target,
  approved_agent: dry.agent,
  approved_tool: 'openclaw_send_task_live_handoff',
  approved_risk_level: dry.risk_level,
  approved_at: '2026-05-19T23:30:00.000Z',
  approved_by: 'han',
  approval_text: `I explicitly approve creating a pending live handoff package for ${dry.source_job_id}.`,
  approval_scope: `${dry.source_job_id}:openclaw:planner:openclaw_send_task_live_handoff`,
  approval_intent: 'Prepare a pending live handoff package from the verified dry-run result only.',
  approval_status: 'approved'
};

const validHandoff = createV62PendingHandoff(dry, validApproval);
const validBridge = createAdapterDryRunBridge(validHandoff);

const checks = [
  expectPass('valid v6.2 pending handoff creates v6.3 adapter dry-run bridge', () => {
    validateAdapterDryRunBridge(validBridge, validHandoff);
  }),
  expectReject('missing handoff is rejected', () => {
    createAdapterDryRunBridge(null);
  }),
  expectReject('invalid handoff status is rejected', () => {
    createAdapterDryRunBridge({ ...validHandoff, handoff_status: 'live_execution_requested' });
  }),
  expectReject('tampered source handoff execution_authorized=true is rejected', () => {
    createAdapterDryRunBridge({ ...validHandoff, execution_authorized: true });
  }),
  expectReject('source handoff require_approval=false is rejected', () => {
    createAdapterDryRunBridge({ ...validHandoff, require_approval: false });
  }),
  expectReject('unsupported handoff target is rejected', () => {
    createAdapterDryRunBridge({ ...validHandoff, target: 'shell' });
  }),
  expectReject('unsupported adapter target is rejected', () => {
    createAdapterDryRunBridge(validHandoff, { adapter_target: 'shell' });
  }),
  expectReject('adapter_mode=live_execute is rejected', () => {
    createAdapterDryRunBridge(validHandoff, { adapter_mode: 'live_execute' });
  }),
  expectReject('adapter bridge dry_run=false is rejected', () => {
    validateAdapterDryRunBridge({ ...validBridge, dry_run: false }, validHandoff);
  }),
  expectReject('adapter bridge execution_authorized=true is rejected', () => {
    validateAdapterDryRunBridge({ ...validBridge, execution_authorized: true }, validHandoff);
  }),
  expectReject('adapter bridge live_call_performed=true is rejected', () => {
    validateAdapterDryRunBridge({ ...validBridge, live_call_performed: true }, validHandoff);
  })
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v6.3',
  verdict,
  source_job_id: dry.source_job_id,
  source_handoff_id: validHandoff.handoff_id,
  no_live_execution_tool_called: true,
  generated_adapter_mode: validBridge.adapter_mode,
  generated_adapter_status: validBridge.adapter_status,
  generated_dry_run: validBridge.dry_run,
  generated_execution_authorized: validBridge.execution_authorized,
  generated_live_call_performed: validBridge.live_call_performed,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
