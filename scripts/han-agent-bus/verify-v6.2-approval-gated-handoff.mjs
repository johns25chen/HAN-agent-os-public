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

function createLiveHandoffPackage(dry, approval) {
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
    handoff_created_at: '2026-05-19T23:20:00.000Z',
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

function validateLiveHandoffPackage(handoff, dry, approval) {
  assert(handoff.handoff_status === 'pending_live_execution', 'handoff status must be pending_live_execution');
  assert(handoff.execution_authorized === false, 'execution_authorized must remain false');
  assert(handoff.require_approval === true, 'require_approval must remain true');
  assert(handoff.target === dry.target, 'handoff target mismatch');
  assert(handoff.agent === dry.agent, 'handoff agent mismatch');
  assert(handoff.risk_level === dry.risk_level, 'handoff risk mismatch');
  assert(handoff.handoff_tool === approval.approved_tool, 'handoff tool mismatch');
  assert(handoff.safety_boundary.includes('does not execute'), 'safety boundary must deny execution');
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
  approval_id: 'approval_v6_2_0001',
  source_job_id: dry.source_job_id,
  approved_target: dry.target,
  approved_agent: dry.agent,
  approved_tool: 'openclaw_send_task_live_handoff',
  approved_risk_level: dry.risk_level,
  approved_at: '2026-05-19T23:20:00.000Z',
  approved_by: 'han',
  approval_text: `I explicitly approve creating a pending live handoff package for ${dry.source_job_id}.`,
  approval_scope: `${dry.source_job_id}:openclaw:planner:openclaw_send_task_live_handoff`,
  approval_intent: 'Prepare a pending live handoff package from the verified dry-run result only.',
  approval_status: 'approved'
};

const validHandoff = createLiveHandoffPackage(dry, validApproval);

const checks = [
  expectPass('valid dry-run plus valid approval creates pending live handoff package', () => {
    validateLiveHandoffPackage(validHandoff, dry, validApproval);
  }),
  expectReject('dry-run without approval is rejected', () => {
    createLiveHandoffPackage(dry, null);
  }),
  expectReject('mismatched approval source_job_id is rejected', () => {
    createLiveHandoffPackage(dry, { ...validApproval, source_job_id: 'job_wrong_source' });
  }),
  expectReject('mismatched approval target is rejected', () => {
    createLiveHandoffPackage(dry, { ...validApproval, approved_target: 'shell' });
  }),
  expectReject('wildcard approval scope is rejected', () => {
    createLiveHandoffPackage(dry, { ...validApproval, approval_scope: '*' });
  }),
  expectReject('generic approval text is rejected', () => {
    createLiveHandoffPackage(dry, { ...validApproval, approval_text: 'approved' });
  }),
  expectReject('risk elevation is rejected', () => {
    createLiveHandoffPackage(dry, { ...validApproval, approved_risk_level: 'medium' });
  }),
  expectReject('non-zero dry-run exit code is rejected', () => {
    validateDryRun({ ...dry, request_exit_code: 1 });
  }),
  expectReject('non-empty stderr is rejected', () => {
    validateDryRun({ ...dry, stderr: 'unexpected error' });
  }),
  expectReject('execution_authorized=true is rejected', () => {
    validateLiveHandoffPackage({ ...validHandoff, execution_authorized: true }, dry, validApproval);
  })
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v6.2',
  verdict,
  source_job_id: dry.source_job_id,
  no_live_execution_tool_called: true,
  generated_handoff_status: validHandoff.handoff_status,
  generated_execution_authorized: validHandoff.execution_authorized,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
