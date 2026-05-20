import { execa } from 'execa';
import { realpath, stat } from 'node:fs/promises';
import * as z from 'zod/v4';
import { createJob, createJobId, readJobSummary, updateJobRequest, writeJobLogs } from '../core/job.js';

const DEFAULT_OPENCLAW_CWD = process.env.HOME ?? '/Users/han';
const OPENCLAW_COMMAND = 'openclaw';
const DEFAULT_OPENCLAW_ARGS = ['status'];

export const openclawStatusInputSchema = {
  openclaw_dir: z.string().min(1).optional().describe('Working directory override. Defaults to HOME or /Users/han.'),
  deep: z.boolean().optional().describe('Run openclaw status --deep. Cannot be combined with probe.'),
  probe: z.boolean().optional().describe('Run openclaw gateway probe. Cannot be combined with deep.'),
};

export async function openclawStatus(input: { openclaw_dir?: string; deep?: boolean; probe?: boolean }): Promise<{
  job_id: string;
  detected_dir: string;
  exit_code: number;
  stdout_tail: string;
  stderr_tail: string;
  log_path: string;
}> {
  const jobId = createJobId();
  const requestedDir = input.openclaw_dir ?? DEFAULT_OPENCLAW_CWD;
  let detectedDir = requestedDir;
  const command = getOpenClawCommand(input);

  if (command.rejected) {
    const logPath = await createRejectedJob(jobId, requestedDir, OPENCLAW_COMMAND, command.reason);
    const summary = await readJobSummary(jobId);

    return {
      job_id: jobId,
      detected_dir: detectedDir,
      exit_code: 126,
      stdout_tail: summary.stdout_tail,
      stderr_tail: summary.stderr_tail,
      log_path: logPath,
    };
  }

  const prompt = formatCommand(OPENCLAW_COMMAND, command.args);

  try {
    detectedDir = await resolveWorkingDir(requestedDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const logPath = await createRejectedJob(jobId, requestedDir, prompt, message);
    const summary = await readJobSummary(jobId);

    return {
      job_id: jobId,
      detected_dir: detectedDir,
      exit_code: 126,
      stdout_tail: summary.stdout_tail,
      stderr_tail: summary.stderr_tail,
      log_path: logPath,
    };
  }

  const logPath = await createJob({
    job_id: jobId,
    cwd: detectedDir,
    prompt,
    dry_run: false,
    status: 'running',
    exit_code: null,
  });

  const { exitCode, stdout, stderr } = await runOpenClawStatus(detectedDir, command.args);
  await writeJobLogs(jobId, stdout, stderr);
  await updateJobRequest(jobId, {
    status: exitCode === 0 ? 'completed' : 'failed',
    exit_code: exitCode,
    completed_at: new Date().toISOString(),
  });

  const summary = await readJobSummary(jobId);
  return {
    job_id: jobId,
    detected_dir: detectedDir,
    exit_code: exitCode,
    stdout_tail: summary.stdout_tail,
    stderr_tail: summary.stderr_tail,
    log_path: logPath,
  };
}

function getOpenClawCommand(input: { deep?: boolean; probe?: boolean }):
  | { rejected: false; args: string[] }
  | { rejected: true; reason: string } {
  if (input.deep === true && input.probe === true) {
    return {
      rejected: true,
      reason: 'deep and probe cannot both be true.',
    };
  }

  if (input.probe === true) {
    return { rejected: false, args: ['gateway', 'probe'] };
  }

  if (input.deep === true) {
    return { rejected: false, args: ['status', '--deep'] };
  }

  return { rejected: false, args: DEFAULT_OPENCLAW_ARGS };
}

async function resolveWorkingDir(openclawDir: string): Promise<string> {
  const resolvedDir = await realpath(openclawDir);
  const dirStat = await stat(resolvedDir);

  if (!dirStat.isDirectory()) {
    throw new Error(`OpenClaw working directory is not a directory: ${resolvedDir}`);
  }

  return resolvedDir;
}

async function runOpenClawStatus(cwd: string, args: string[]): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  try {
    const result = await execa(OPENCLAW_COMMAND, args, {
      cwd,
      reject: false,
      all: false,
      stdin: 'ignore',
    });

    return {
      exitCode: result.exitCode ?? 1,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  } catch (error) {
    const execaError = error as {
      exitCode?: number;
      stdout?: string;
      stderr?: string;
      message?: string;
    };

    return {
      exitCode: execaError.exitCode ?? 1,
      stdout: execaError.stdout ?? '',
      stderr: execaError.stderr ?? execaError.message ?? String(error),
    };
  }
}

async function createRejectedJob(jobId: string, cwd: string, prompt: string, message: string): Promise<string> {
  const logPath = await createJob({
    job_id: jobId,
    cwd,
    prompt,
    dry_run: false,
    status: 'rejected',
    exit_code: 126,
    rejection_reason: message,
  });
  await writeJobLogs(jobId, '', message);
  return logPath;
}

function formatCommand(command: string, args: string[]): string {
  return [command, ...args].join(' ');
}
