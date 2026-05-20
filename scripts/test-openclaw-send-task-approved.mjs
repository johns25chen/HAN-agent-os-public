import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { randomBytes } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const serverPath = '/Volumes/ComfySSD/Desktop/HAN-agent-os/dist/mcp-server.js';
const projectRoot = path.resolve(path.dirname(serverPath), '..');
const jobsDir = path.join(projectRoot, 'jobs');
const auditPath = path.join(jobsDir, 'audit', 'approved_employee_tasks.jsonl');
const fakeOpenClawBinDir = await installFakeOpenClaw();
process.env.PATH = `${fakeOpenClawBinDir}${path.delimiter}${process.env.PATH ?? ''}`;

const client = new Client(
  {
    name: 'han-agent-bus-openclaw-send-task-approved-test-client',
    version: '1.0.0',
  },
  {
    capabilities: {},
  },
);

const transport = new StdioClientTransport({
  command: 'node',
  args: [serverPath],
});

await client.connect(transport);

try {
  const badApprovalDryrun = await createDryrun({
    agent: 'main',
    task: 'Say OK only.',
    risk_level: 'low',
  });

  const badApproval = await callTool('openclaw_send_task_approved', {
    dryrun_job_id: badApprovalDryrun.job_id,
    approval_phrase: 'APPROVE_OPENCLAW_SEND:wrong-job-id',
  });

  console.log(`bad_approval_status: ${badApproval.status}`);
  if (badApproval.status !== 'rejected') {
    throw new Error(`Expected bad approval_phrase to be rejected, got ${badApproval.status}`);
  }

  const forgedJobId = await createForgedJob({
    request: {
      tool: 'openclaw_send_task_approved',
      status: 'dry_run',
      approval_required: true,
    },
  });

  const forgedApproved = await callTool('openclaw_send_task_approved', {
    dryrun_job_id: forgedJobId,
    approval_phrase: `APPROVE_OPENCLAW_SEND:${forgedJobId}`,
  });

  console.log(`forged_source_status: ${forgedApproved.status}`);
  if (forgedApproved.status !== 'rejected') {
    throw new Error(`Expected forged non-dryrun tool source to be rejected, got ${forgedApproved.status}`);
  }

  const nonDryrunJobId = await createForgedJob({
    request: {
      tool: 'openclaw_send_task_dryrun',
      status: 'completed',
      approval_required: true,
    },
  });

  const nonDryrunApproved = await callTool('openclaw_send_task_approved', {
    dryrun_job_id: nonDryrunJobId,
    approval_phrase: `APPROVE_OPENCLAW_SEND:${nonDryrunJobId}`,
  });

  console.log(`non_dryrun_source_status: ${nonDryrunApproved.status}`);
  if (nonDryrunApproved.status !== 'rejected') {
    throw new Error(`Expected non dry-run source to be rejected, got ${nonDryrunApproved.status}`);
  }

  const timeoutDryrun = await createDryrun({
    agent: 'main',
    task: 'Say OK only.',
    risk_level: 'low',
  });

  const timeoutResult = await callToolAllowingSchemaError('openclaw_send_task_approved', {
    dryrun_job_id: timeoutDryrun.job_id,
    approval_phrase: `APPROVE_OPENCLAW_SEND:${timeoutDryrun.job_id}`,
    timeout_seconds: 301,
  });

  console.log(`timeout_over_limit_result: ${timeoutResult.schemaRejected ? 'schema_rejected' : timeoutResult.payload.status}`);
  if (!timeoutResult.schemaRejected && timeoutResult.payload.status !== 'rejected') {
    throw new Error(`Expected timeout_seconds > 300 to be rejected, got ${timeoutResult.payload.status}`);
  }

  const highRiskDryrun = await createDryrun({
    agent: 'main',
    task: 'Say OK only.',
    risk_level: 'high',
  });

  const highRiskApproved = await callTool('openclaw_send_task_approved', {
    dryrun_job_id: highRiskDryrun.job_id,
    approval_phrase: `APPROVE_OPENCLAW_SEND:${highRiskDryrun.job_id}`,
  });

  console.log(`high_risk_status: ${highRiskApproved.status}`);
  if (highRiskApproved.status !== 'rejected') {
    throw new Error(`Expected high risk task to be rejected, got ${highRiskApproved.status}`);
  }

  const gitPushDryrun = await createDryrun({
    agent: 'main',
    task: 'Do not git push.',
    risk_level: 'low',
  });

  const gitPushApproved = await callTool('openclaw_send_task_approved', {
    dryrun_job_id: gitPushDryrun.job_id,
    approval_phrase: `APPROVE_OPENCLAW_SEND:${gitPushDryrun.job_id}`,
  });

  console.log(`git_push_status: ${gitPushApproved.status}`);
  if (gitPushApproved.status !== 'rejected') {
    throw new Error(`Expected task containing git push to be rejected, got ${gitPushApproved.status}`);
  }

  const approvedDryrun = await createDryrun({
    agent: 'main',
    task: 'Say OK only.',
    risk_level: 'low',
  });

  const approved = await callTool('openclaw_send_task_approved', {
    dryrun_job_id: approvedDryrun.job_id,
    approval_phrase: `APPROVE_OPENCLAW_SEND:${approvedDryrun.job_id}`,
    timeout_seconds: 60,
  });

  console.log(`approved_job_id: ${approved.job_id}`);
  console.log(`approved_status: ${approved.status}`);
  console.log(`approved_exit_code: ${approved.exit_code}`);
  console.log(`approved_command_preview: ${approved.command_preview}`);
  console.log(`approved_assistant_text: ${approved.assistant_text}`);
  console.log(`approved_assistant_raw_text: ${approved.assistant_raw_text}`);
  console.log(`approved_delivery_succeeded: ${approved.delivery_succeeded}`);
  console.log(`full_chain_status: ${approved.status}`);
  console.log(`full_chain_assistant_text: ${approved.assistant_text}`);
  console.log(`full_chain_delivery_succeeded: ${approved.delivery_succeeded}`);
  console.log(`approved_log_path: ${approved.log_path}`);
  console.log(`approved_stdout_tail: ${approved.stdout_tail}`);
  console.log(`approved_stderr_tail: ${approved.stderr_tail}`);

  if (approved.status !== 'completed') {
    throw new Error(`Expected approved.status to be completed, got ${approved.status}: ${approved.stderr_tail}`);
  }

  if (approved.exit_code !== 0) {
    throw new Error(`Expected approved.exit_code to be 0, got ${approved.exit_code}`);
  }

  if (approved.command_preview !== "openclaw agent --agent main --message 'Say OK only.' --json") {
    throw new Error(`Unexpected command_preview: ${approved.command_preview}`);
  }

  if (approved.command_preview.includes('--deliver')) {
    throw new Error('Approved command_preview must not include --deliver');
  }

  if (approved.assistant_text !== 'OK') {
    throw new Error(`Expected assistant_text to be OK, got ${approved.assistant_text}`);
  }

  if (approved.assistant_raw_text !== 'OK') {
    throw new Error(`Expected assistant_raw_text to be OK, got ${approved.assistant_raw_text}`);
  }

  if (approved.delivery_succeeded !== false) {
    throw new Error(`Expected delivery_succeeded to be false, got ${approved.delivery_succeeded}`);
  }

  const auditLines = (await readFile(auditPath, 'utf8')).trim().split('\n').filter(Boolean);
  const latestAuditText = auditLines.at(-1);
  if (!latestAuditText) {
    throw new Error('Expected approved audit JSONL to contain at least one record');
  }

  const latestAudit = JSON.parse(latestAuditText);
  console.log(`approved_audit_path: ${auditPath}`);
  console.log(`approved_audit_id: ${latestAudit.audit_id}`);
  console.log(`approved_audit_job_id: ${latestAudit.approved_job_id}`);

  if (latestAudit.approved_job_id !== approved.job_id) {
    throw new Error(`Expected latest audit approved_job_id to be ${approved.job_id}, got ${latestAudit.approved_job_id}`);
  }

  if (latestAuditText.includes(`APPROVE_OPENCLAW_SEND:${approvedDryrun.job_id}`)) {
    throw new Error('Audit record must not contain approval_phrase');
  }

  if (Object.prototype.hasOwnProperty.call(latestAudit, 'stdout_tail')) {
    throw new Error('Audit record must not contain stdout_tail');
  }

  if (latestAudit.delivery_succeeded !== false) {
    throw new Error(`Expected latest audit delivery_succeeded to be false, got ${latestAudit.delivery_succeeded}`);
  }
} finally {
  await client.close();
}

async function createDryrun(args) {
  const payload = await callTool('openclaw_send_task_dryrun', args);
  console.log(`dryrun_job_id: ${payload.job_id} status=${payload.status} risk=${args.risk_level}`);

  if (payload.status !== 'dry_run') {
    throw new Error(`Expected dry_run status, got ${payload.status}: ${payload.message}`);
  }

  return payload;
}

async function installFakeOpenClaw() {
  const binDir = await mkdtemp(path.join(os.tmpdir(), 'han-agent-bus-openclaw-test-'));
  const openclawPath = path.join(binDir, 'openclaw');
  await writeFile(
    openclawPath,
    `#!/bin/sh
if [ "$1" != "agent" ] || [ "$2" != "--agent" ] || [ "$3" != "main" ] || [ "$4" != "--message" ] || [ "$5" != "Say OK only." ] || [ "$6" != "--json" ] || [ "$#" -ne 6 ]; then
  echo "unexpected openclaw args: $*" >&2
  exit 64
fi
printf '%s\\n' '{"runId":"test","status":"ok","summary":"completed","result":{"payloads":[{"text":"OK","mediaUrl":null}],"deliverySucceeded":false}}'
`,
  );
  await chmod(openclawPath, 0o755);
  return binDir;
}

async function createForgedJob({ request }) {
  const jobId = `job_test_${Date.now()}_${randomBytes(4).toString('hex')}`;
  const dir = path.join(jobsDir, jobId);
  await mkdir(dir, { recursive: true });

  await writeFile(
    path.join(dir, 'request.json'),
    JSON.stringify(
      {
        job_id: jobId,
        cwd: projectRoot,
        prompt: 'forged source',
        dry_run: true,
        exit_code: 0,
        created_at: new Date().toISOString(),
        ...request,
      },
      null,
      2,
    ),
  );

  await writeFile(
    path.join(dir, 'openclaw_task.json'),
    JSON.stringify(
      {
        task_id: jobId,
        target: 'openclaw',
        agent: 'main',
        task: 'Say OK only.',
        risk_level: 'low',
        require_approval: true,
        created_at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  await writeFile(path.join(dir, 'stdout.log'), '');
  await writeFile(path.join(dir, 'stderr.log'), '');

  console.log(`forged_job_id: ${jobId} tool=${request.tool} status=${request.status}`);
  return jobId;
}

async function callTool(name, args) {
  const result = await client.callTool({
    name,
    arguments: args,
  });
  const text = result.content?.find((item) => item.type === 'text')?.text;
  return text ? JSON.parse(text) : result;
}

async function callToolAllowingSchemaError(name, args) {
  try {
    return {
      schemaRejected: false,
      payload: await callTool(name, args),
    };
  } catch (error) {
    console.log(`schema_error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      schemaRejected: true,
      payload: null,
    };
  }
}
