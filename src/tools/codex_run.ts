import { execa } from 'execa';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as z from 'zod/v4';
import { createJob, createJobId, readJobSummary, updateJobRequest, writeJobLogs } from '../core/job.js';
import { validateCodexRunRequest, validatePrompt } from '../core/policy.js';

export const codexRunInputSchema = {
  cwd: z.string().min(1).describe('Working directory for Codex.'),
  prompt: z.string().min(1).describe('Prompt passed to codex exec.'),
  dry_run: z.boolean().optional().describe('Create a job record without invoking Codex.'),
  async: z.boolean().optional().describe('Run Codex in the background. Defaults to true.'),
  timeout_ms: z.number().int().positive().optional().describe('Synchronous timeout in milliseconds. Only used when async is false.'),
};

export async function codexRun(input: {
  cwd: string;
  prompt: string;
  dry_run?: boolean;
  async?: boolean;
  timeout_ms?: number;
}): Promise<{
  job_id: string;
  status: 'dry_run' | 'running' | 'completed' | 'failed' | 'rejected' | 'timeout';
  exit_code: number | null;
  stdout_tail?: string;
  stderr_tail?: string;
  log_path: string;
  message?: string;
}> {
  const dryRun = input.dry_run === true;
  const asyncMode = input.async !== false;
  const jobId = createJobId();

  const promptCheck = validatePrompt(input.prompt);
  if (!promptCheck.ok) {
    const logPath = await createJob({
      job_id: jobId,
      cwd: input.cwd,
      prompt: input.prompt,
      dry_run: dryRun,
      status: 'rejected',
      exit_code: 126,
      rejection_reason: promptCheck.reason,
    });
    await writeJobLogs(jobId, '', promptCheck.reason);
    const summary = await readJobSummary(jobId);
    return {
      job_id: jobId,
      status: 'rejected',
      exit_code: 126,
      stdout_tail: summary.stdout_tail,
      stderr_tail: summary.stderr_tail,
      log_path: logPath,
    };
  }

  const validation = await validateCodexRunRequest(input.cwd, input.prompt);
  if (!validation.ok) {
    const logPath = await createJob({
      job_id: jobId,
      cwd: input.cwd,
      prompt: input.prompt,
      dry_run: dryRun,
      status: 'rejected',
      exit_code: 126,
      rejection_reason: validation.reason,
    });
    await writeJobLogs(jobId, '', validation.reason);
    const summary = await readJobSummary(jobId);
    return {
      job_id: jobId,
      status: 'rejected',
      exit_code: 126,
      stdout_tail: summary.stdout_tail,
      stderr_tail: summary.stderr_tail,
      log_path: logPath,
    };
  }

  const logPath = await createJob({
    job_id: jobId,
    cwd: validation.cwdRealPath,
    prompt: input.prompt,
    dry_run: dryRun,
    status: dryRun ? 'dry_run' : 'running',
    exit_code: dryRun ? 0 : null,
  });

  if (dryRun) {
    const summary = await readJobSummary(jobId);
    return {
      job_id: jobId,
      status: 'dry_run',
      exit_code: 0,
      stdout_tail: summary.stdout_tail,
      stderr_tail: summary.stderr_tail,
      log_path: logPath,
      message: 'Dry run job created. Codex was not invoked.',
    };
  }

  if (asyncMode) {
    const workerPath = fileURLToPath(new URL('./codex_worker.js', import.meta.url));
    const child = spawn(process.execPath, [workerPath, jobId], {
      cwd: process.cwd(),
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    return {
      job_id: jobId,
      status: 'running',
      exit_code: null,
      log_path: logPath,
      message: 'Codex job started in the background. Use read_task_log with job_id to check status and logs.',
    };
  }

  const result = await runCodexJob(jobId, validation.cwdRealPath, input.prompt, input.timeout_ms);
  const summary = await readJobSummary(jobId);
  return {
    job_id: jobId,
    status: result.status,
    exit_code: result.exitCode,
    stdout_tail: summary.stdout_tail,
    stderr_tail: summary.stderr_tail,
    log_path: logPath,
    message: result.status === 'timeout' ? 'Codex job timed out.' : undefined,
  };
}

export async function runCodexJob(
  jobId: string,
  cwd: string,
  prompt: string,
  timeoutMs?: number,
): Promise<{ status: 'completed' | 'failed' | 'timeout'; exitCode: number | null }> {
  let exitCode = 0;
  let stdout = '';
  let stderr = '';
  let timedOut = false;

  try {
    const result = await execa('codex', ['exec', '--cd', cwd, prompt], {
      cwd,
      reject: false,
      all: false,
      stdin: 'ignore',
      timeout: timeoutMs,
    });
    exitCode = result.exitCode ?? 1;
    stdout = result.stdout ?? '';
    stderr = result.stderr ?? '';
    timedOut = result.timedOut === true;
  } catch (error) {
    const execaError = error as {
      exitCode?: number;
      stdout?: string;
      stderr?: string;
      timedOut?: boolean;
      message?: string;
    };
    exitCode = execaError.exitCode ?? 1;
    stdout = execaError.stdout ?? '';
    stderr = execaError.stderr ?? execaError.message ?? String(error);
    timedOut = execaError.timedOut === true;
  }

  await writeJobLogs(jobId, stdout, stderr);
  const status = timedOut ? 'timeout' : exitCode === 0 ? 'completed' : 'failed';
  await updateJobRequest(jobId, {
    status,
    exit_code: exitCode,
    completed_at: new Date().toISOString(),
  });

  return { status, exitCode };
}
