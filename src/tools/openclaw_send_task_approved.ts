import { execa } from 'execa';
import crypto from 'node:crypto';
import { access, appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import * as z from 'zod/v4';
import {
  assertSafeJobId,
  createJob,
  createJobId,
  JOBS_DIR,
  jobDir,
  readJobSummary,
  tailText,
  updateJobRequest,
  writeJobLogs,
} from '../core/job.js';
import type { OpenClawTaskJson } from './openclaw_send_task_dryrun.js';

const OPENCLAW_COMMAND = 'openclaw';
const DEFAULT_TIMEOUT_SECONDS = 120;
const MAX_TIMEOUT_SECONDS = 300;
const APPROVED_TASK_AUDIT_PATH = path.join(JOBS_DIR, 'audit', 'approved_employee_tasks.jsonl');

type ApprovedStatus = 'completed' | 'failed' | 'rejected' | 'timeout';

type ApprovedResult = {
  job_id: string;
  source_dryrun_job_id: string;
  status: ApprovedStatus;
  exit_code: number | null;
  command_preview: string;
  assistant_text: string | null;
  assistant_raw_text: string | null;
  delivery_succeeded: boolean | null;
  stdout_tail: string;
  stderr_tail: string;
  log_path: string;
};

type ApprovedAuditContext = {
  agent: string | null;
  risk_level: string | null;
  task: string | null;
};

type ApprovedAuditRecord = {
  audit_id: string;
  created_at: string;
  tool: 'openclaw_send_task_approved';
  source_dryrun_job_id: string;
  approved_job_id: string;
  agent: string | null;
  risk_level: string | null;
  status: ApprovedStatus;
  exit_code: number | null;
  command_preview: string;
  assistant_text: string | null;
  delivery_succeeded: boolean | null;
  stderr_tail: string;
  log_path: string;
  task_sha256: string | null;
  task_preview: string | null;
};

const dangerousTaskRules: Array<{ name: string; pattern: RegExp; reason: string }> = [
  { name: 'payment', pattern: /\bpayment\b/i, reason: 'Task contains prohibited dangerous action: payment.' },
  {
    name: 'transfer_money',
    pattern: /\btransfer\s+money\b/i,
    reason: 'Task contains prohibited dangerous action: transfer money.',
  },
  {
    name: 'delete_files',
    pattern: /\bdelete\s+files\b/i,
    reason: 'Task contains prohibited dangerous action: delete files.',
  },
  {
    name: 'read_env',
    pattern: /\bread\s+\.env\b/i,
    reason: 'Task contains prohibited dangerous action: read .env.',
  },
  {
    name: 'read_ssh',
    pattern: /\bread\s+~\/\.ssh\b/i,
    reason: 'Task contains prohibited dangerous action: read ~/.ssh.',
  },
  {
    name: 'read_token',
    pattern: /\bread\s+token\b/i,
    reason: 'Task contains prohibited dangerous action: read token.',
  },
  { name: 'git_push', pattern: /\bgit\s+push\b/i, reason: 'Task contains prohibited dangerous action: git push.' },
  {
    name: 'send_private_message',
    pattern: /\bsend\s+private\s+message\b/i,
    reason: 'Task contains prohibited dangerous action: send private message.',
  },
  {
    name: 'message_send',
    pattern: /\bmessage\s+send\b/i,
    reason: 'Task contains prohibited dangerous action: message send.',
  },
  { name: 'deliver_flag', pattern: /--deliver\b/i, reason: 'Task contains prohibited dangerous action: --deliver.' },
  {
    name: 'openclaw_message_send',
    pattern: /\bopenclaw\s+message\s+send\b/i,
    reason: 'Task contains prohibited command: openclaw message send.',
  },
  {
    name: 'gateway_install_start_restart',
    pattern: /\bgateway\s+(?:install|start|restart)\b/i,
    reason: 'Task contains prohibited gateway install/start/restart command.',
  },
  {
    name: 'docker_compose_up_down',
    pattern: /\bdocker\s+compose\s+(?:up|down)\b/i,
    reason: 'Task contains prohibited docker compose up/down command.',
  },
];

export const openclawSendTaskApprovedInputSchema = {
  dryrun_job_id: z.string().min(1).describe('Job id returned by openclaw_send_task_dryrun.'),
  approval_phrase: z.string().min(1).describe('Must exactly equal APPROVE_OPENCLAW_SEND:<dryrun_job_id>.'),
  timeout_seconds: z
    .number()
    .int()
    .positive()
    .max(MAX_TIMEOUT_SECONDS)
    .optional()
    .describe('OpenClaw CLI timeout in seconds. Defaults to 120. Max 300.'),
};

export async function openclawSendTaskApproved(input: {
  dryrun_job_id: string;
  approval_phrase: string;
  timeout_seconds?: number;
}): Promise<ApprovedResult> {
  const jobId = createJobId();
  const commandPreview = 'openclaw agent --agent <agent> --message <task> --json';

  const safeDryrunJobId = input.dryrun_job_id;
  try {
    assertSafeJobId(input.dryrun_job_id);
  } catch {
    return createRejectedApprovedJob(jobId, input.dryrun_job_id, commandPreview, 'Invalid dryrun_job_id.');
  }

  const expectedApprovalPhrase = `APPROVE_OPENCLAW_SEND:${safeDryrunJobId}`;
  if (input.approval_phrase !== expectedApprovalPhrase) {
    return createRejectedApprovedJob(
      jobId,
      safeDryrunJobId,
      commandPreview,
      `approval_phrase must exactly equal ${expectedApprovalPhrase}.`,
    );
  }

  if (input.timeout_seconds !== undefined && input.timeout_seconds > MAX_TIMEOUT_SECONDS) {
    return createRejectedApprovedJob(
      jobId,
      safeDryrunJobId,
      commandPreview,
      `timeout_seconds must be less than or equal to ${MAX_TIMEOUT_SECONDS}.`,
    );
  }

  const requestJsonPath = path.join(jobDir(safeDryrunJobId), 'request.json');
  let sourceRequest: unknown;
  try {
    sourceRequest = JSON.parse(await readFile(requestJsonPath, 'utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createRejectedApprovedJob(jobId, safeDryrunJobId, commandPreview, `Failed to read dry-run request.json: ${message}`);
  }

  const sourceValidation = validateSourceDryrunRequest(sourceRequest);
  if (!sourceValidation.ok) {
    return createRejectedApprovedJob(jobId, safeDryrunJobId, commandPreview, sourceValidation.reason);
  }

  const taskJsonPath = path.join(jobDir(safeDryrunJobId), 'openclaw_task.json');
  try {
    await access(taskJsonPath);
  } catch {
    return createRejectedApprovedJob(
      jobId,
      safeDryrunJobId,
      commandPreview,
      `openclaw_task.json does not exist for dry-run job: ${safeDryrunJobId}.`,
    );
  }

  let taskJson: OpenClawTaskJson;
  try {
    taskJson = JSON.parse(await readFile(taskJsonPath, 'utf8')) as OpenClawTaskJson;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createRejectedApprovedJob(jobId, safeDryrunJobId, commandPreview, `Failed to read openclaw_task.json: ${message}`);
  }

  const validation = validateTaskJson(taskJson);
  if (!validation.ok) {
    return createRejectedApprovedJob(jobId, safeDryrunJobId, commandPreview, validation.reason, auditContextFromTaskJson(taskJson));
  }

  const args = ['agent', '--agent', taskJson.agent, '--message', taskJson.task, '--json'];
  const concreteCommandPreview = formatCommand(OPENCLAW_COMMAND, args);
  const logPath = await createJob({
    job_id: jobId,
    tool: 'openclaw_send_task_approved',
    cwd: process.cwd(),
    prompt: concreteCommandPreview,
    dry_run: false,
    status: 'running',
    exit_code: null,
    input: {
      dryrun_job_id: input.dryrun_job_id,
      timeout_seconds: input.timeout_seconds,
      approval_phrase: '[redacted]',
    },
    source_dryrun_job_id: safeDryrunJobId,
    command_preview: concreteCommandPreview,
  });

  const result = await runOpenClawAgent(args, input.timeout_seconds);
  await writeJobLogs(jobId, result.stdout, result.stderr);
  const status = result.timedOut ? 'timeout' : result.exitCode === 0 ? 'completed' : 'failed';
  const assistantFields = extractOpenClawAssistantFields(result.stdout);
  await updateJobRequest(jobId, {
    status,
    exit_code: result.exitCode,
    completed_at: new Date().toISOString(),
  });

  const summary = await readJobSummary(jobId);
  const approvedResult: ApprovedResult = {
    job_id: jobId,
    source_dryrun_job_id: safeDryrunJobId,
    status,
    exit_code: result.exitCode,
    command_preview: concreteCommandPreview,
    ...assistantFields,
    stdout_tail: summary.stdout_tail,
    stderr_tail: summary.stderr_tail,
    log_path: logPath,
  };

  return writeApprovedAuditBestEffort(approvedResult, {
    agent: taskJson.agent,
    risk_level: typeof taskJson.risk_level === 'string' ? taskJson.risk_level : null,
    task: taskJson.task,
  });
}

function validateSourceDryrunRequest(request: unknown): { ok: true } | { ok: false; reason: string } {
  if (!request || typeof request !== 'object') {
    return { ok: false, reason: 'dry-run request.json must contain an object.' };
  }

  const candidate = request as {
    tool?: unknown;
    status?: unknown;
    approval_required?: unknown;
  };

  if (candidate.tool !== 'openclaw_send_task_dryrun') {
    return { ok: false, reason: 'dry-run request.json tool must be openclaw_send_task_dryrun.' };
  }

  if (candidate.status !== 'dry_run') {
    return { ok: false, reason: 'dry-run request.json status must be dry_run.' };
  }

  if (candidate.approval_required !== true) {
    return { ok: false, reason: 'dry-run request.json approval_required must be true.' };
  }

  return { ok: true };
}

function validateTaskJson(taskJson: OpenClawTaskJson): { ok: true } | { ok: false; reason: string } {
  if (taskJson.target !== 'openclaw') {
    return { ok: false, reason: 'openclaw_task.json target must be openclaw.' };
  }

  if (!taskJson.agent || typeof taskJson.agent !== 'string') {
    return { ok: false, reason: 'openclaw_task.json agent must be a non-empty string.' };
  }

  if (!/^[a-zA-Z0-9_.:-]+$/.test(taskJson.agent) || taskJson.agent.startsWith('-')) {
    return { ok: false, reason: 'openclaw_task.json agent contains unsupported characters.' };
  }

  if (!taskJson.task || typeof taskJson.task !== 'string') {
    return { ok: false, reason: 'openclaw_task.json task must be a non-empty string.' };
  }

  if (taskJson.risk_level === 'high') {
    return { ok: false, reason: 'High risk OpenClaw tasks cannot be sent by this version.' };
  }

  const dangerousReason = findDangerousTaskReason(taskJson.task);
  if (dangerousReason) {
    return { ok: false, reason: dangerousReason };
  }

  return { ok: true };
}

function auditContextFromTaskJson(taskJson: Partial<OpenClawTaskJson>): ApprovedAuditContext {
  return {
    agent: typeof taskJson.agent === 'string' ? taskJson.agent : null,
    risk_level: typeof taskJson.risk_level === 'string' ? taskJson.risk_level : null,
    task: typeof taskJson.task === 'string' ? taskJson.task : null,
  };
}

function findDangerousTaskReason(task: string): string | null {
  for (const rule of dangerousTaskRules) {
    if (rule.pattern.test(task)) {
      return rule.reason;
    }
  }

  return null;
}

function extractOpenClawAssistantFields(stdout: string): Pick<
  ApprovedResult,
  'assistant_text' | 'assistant_raw_text' | 'delivery_succeeded'
> {
  const empty = {
    assistant_text: null,
    assistant_raw_text: null,
    delivery_succeeded: null,
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout.trim());
  } catch {
    return empty;
  }

  const candidate = findOpenClawAssistantFields(parsed);
  if (!candidate) {
    return empty;
  }

  return {
    assistant_text: candidate.assistant_text,
    assistant_raw_text: candidate.assistant_raw_text,
    delivery_succeeded: candidate.delivery_succeeded,
  };
}

function findOpenClawAssistantFields(value: unknown):
  | Pick<ApprovedResult, 'assistant_text' | 'assistant_raw_text' | 'delivery_succeeded'>
  | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as {
    finalAssistantVisibleText?: unknown;
    finalAssistantRawText?: unknown;
    payloads?: unknown;
    deliverySucceeded?: unknown;
  };

  if (
    typeof candidate.finalAssistantVisibleText === 'string' &&
    typeof candidate.finalAssistantRawText === 'string' &&
    typeof candidate.deliverySucceeded === 'boolean'
  ) {
    return {
      assistant_text: candidate.finalAssistantVisibleText,
      assistant_raw_text: candidate.finalAssistantRawText,
      delivery_succeeded: candidate.deliverySucceeded,
    };
  }

  if (Array.isArray(candidate.payloads) && typeof candidate.deliverySucceeded === 'boolean') {
    const payloadText = candidate.payloads
      .map((payload) => (payload && typeof payload === 'object' ? (payload as { text?: unknown }).text : undefined))
      .filter((text): text is string => typeof text === 'string')
      .join('');

    if (payloadText.length > 0) {
      return {
        assistant_text: payloadText,
        assistant_raw_text: payloadText,
        delivery_succeeded: candidate.deliverySucceeded,
      };
    }
  }

  const nestedValues = Array.isArray(value) ? value : Object.values(value);
  for (const nestedValue of nestedValues) {
    const nestedCandidate = findOpenClawAssistantFields(nestedValue);
    if (nestedCandidate) {
      return nestedCandidate;
    }
  }

  return null;
}

async function runOpenClawAgent(
  args: string[],
  timeoutSeconds?: number,
): Promise<{ exitCode: number | null; stdout: string; stderr: string; timedOut: boolean }> {
  try {
    const result = await execa(OPENCLAW_COMMAND, args, {
      reject: false,
      all: false,
      stdin: 'ignore',
      timeout: Math.min(timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS, MAX_TIMEOUT_SECONDS) * 1000,
    });

    return {
      exitCode: result.exitCode ?? 1,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      timedOut: result.timedOut === true,
    };
  } catch (error) {
    const execaError = error as {
      exitCode?: number;
      stdout?: string;
      stderr?: string;
      timedOut?: boolean;
      message?: string;
    };

    return {
      exitCode: execaError.timedOut === true ? null : execaError.exitCode ?? 1,
      stdout: execaError.stdout ?? '',
      stderr: execaError.stderr ?? execaError.message ?? String(error),
      timedOut: execaError.timedOut === true,
    };
  }
}

async function createRejectedApprovedJob(
  jobId: string,
  sourceDryrunJobId: string,
  commandPreview: string,
  reason: string,
  auditContext?: Partial<ApprovedAuditContext>,
): Promise<ApprovedResult> {
  const logPath = await createJob({
    job_id: jobId,
    tool: 'openclaw_send_task_approved',
    cwd: process.cwd(),
    prompt: commandPreview,
    dry_run: false,
    status: 'rejected',
    exit_code: 126,
    input: {
      dryrun_job_id: sourceDryrunJobId,
    },
    source_dryrun_job_id: sourceDryrunJobId,
    command_preview: commandPreview,
    rejection_reason: reason,
  });

  await writeJobLogs(jobId, '', reason);
  const summary = await readJobSummary(jobId);
  const rejectedResult: ApprovedResult = {
    job_id: jobId,
    source_dryrun_job_id: sourceDryrunJobId,
    status: 'rejected',
    exit_code: 126,
    command_preview: commandPreview,
    assistant_text: null,
    assistant_raw_text: null,
    delivery_succeeded: null,
    stdout_tail: summary.stdout_tail,
    stderr_tail: summary.stderr_tail,
    log_path: logPath,
  };

  return writeApprovedAuditBestEffort(rejectedResult, {
    agent: auditContext?.agent ?? null,
    risk_level: auditContext?.risk_level ?? null,
    task: auditContext?.task ?? null,
  });
}

async function writeApprovedAuditBestEffort(
  result: ApprovedResult,
  context: ApprovedAuditContext,
): Promise<ApprovedResult> {
  try {
    const record = buildApprovedAuditRecord(result, context);
    await mkdir(path.dirname(APPROVED_TASK_AUDIT_PATH), { recursive: true });
    await appendFile(APPROVED_TASK_AUDIT_PATH, `${JSON.stringify(record)}\n`, 'utf8');
    return result;
  } catch (error) {
    const auditError = `audit_error: ${error instanceof Error ? error.message : String(error)}`;
    try {
      await updateJobRequest(result.job_id, { audit_error: auditError });
    } catch {
      // Audit failures must not change the task outcome.
    }

    return {
      ...result,
      stderr_tail: tailText([result.stderr_tail, auditError].filter(Boolean).join('\n')),
    };
  }
}

function buildApprovedAuditRecord(result: ApprovedResult, context: ApprovedAuditContext): ApprovedAuditRecord {
  return {
    audit_id: `audit_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}_${crypto
      .randomBytes(4)
      .toString('hex')}`,
    created_at: new Date().toISOString(),
    tool: 'openclaw_send_task_approved',
    source_dryrun_job_id: sanitizeAuditText(result.source_dryrun_job_id) ?? '',
    approved_job_id: sanitizeAuditText(result.job_id) ?? '',
    agent: sanitizeAuditText(context.agent),
    risk_level: sanitizeAuditText(context.risk_level),
    status: result.status,
    exit_code: result.exit_code,
    command_preview: sanitizeAuditText(result.command_preview) ?? '',
    assistant_text: sanitizeAuditText(result.assistant_text),
    delivery_succeeded: result.delivery_succeeded,
    stderr_tail: sanitizeAuditText(result.stderr_tail) ?? '',
    log_path: result.log_path,
    task_sha256: context.task === null ? null : crypto.createHash('sha256').update(context.task).digest('hex'),
    task_preview: makeTaskPreview(context.task),
  };
}

function makeTaskPreview(task: string | null): string | null {
  const sanitizedTask = sanitizeAuditText(task);
  if (sanitizedTask === null) {
    return null;
  }

  return sanitizedTask.length > 300 ? sanitizedTask.slice(0, 300) : sanitizedTask;
}

function sanitizeAuditText(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  return value
    .replace(/APPROVE_OPENCLAW_SEND:[a-zA-Z0-9_-]+/g, '[redacted-approval]')
    .replace(/~\/\.ssh[^\s'"]*/g, '[redacted-ssh-path]')
    .replace(/\.env[^\s'"]*/g, '[redacted-env-path]')
    .replace(/\b(token|credential|password|secret|api[_-]?key)\b/gi, '[redacted-sensitive-keyword]')
    .replace(/\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g, '[redacted-token-like-value]')
    .replace(/\b(?:sk|pk|rk|ghp|github_pat)_[A-Za-z0-9_=-]{16,}\b/g, '[redacted-token-like-value]');
}

function formatCommand(command: string, args: string[]): string {
  return [command, ...args.map(shellPreviewArg)].join(' ');
}

function shellPreviewArg(arg: string): string {
  if (/^[a-zA-Z0-9_./:-]+$/.test(arg)) {
    return arg;
  }

  return `'${arg.replace(/'/g, `'\\''`)}'`;
}
