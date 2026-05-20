import crypto from 'node:crypto';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export type JobRequest = {
  job_id: string;
  tool?: string;
  cwd: string;
  prompt: string;
  dry_run: boolean;
  input?: unknown;
  approval_required?: boolean;
  task_json_path?: string;
  source_dryrun_job_id?: string;
  command_preview?: string;
  created_at: string;
  status: 'dry_run' | 'running' | 'completed' | 'failed' | 'rejected' | 'timeout';
  exit_code?: number | null;
  completed_at?: string;
  rejection_reason?: string;
  audit_error?: string;
};

export type JobLogSummary = {
  job_id: string;
  request: JobRequest;
  stdout_tail: string;
  stderr_tail: string;
  log_path: string;
};

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const JOBS_DIR = path.join(PROJECT_ROOT, 'jobs');

export function createJobId(): string {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return `job_${timestamp}_${crypto.randomBytes(4).toString('hex')}`;
}

export function assertSafeJobId(jobId: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(jobId)) {
    throw new Error('Invalid job_id. Only letters, numbers, "_" and "-" are allowed.');
  }
}

export function jobDir(jobId: string): string {
  assertSafeJobId(jobId);
  return path.join(JOBS_DIR, jobId);
}

export async function createJob(request: Omit<JobRequest, 'created_at'>): Promise<string> {
  const dir = jobDir(request.job_id);
  await mkdir(dir, { recursive: true });
  const fullRequest: JobRequest = {
    ...request,
    created_at: new Date().toISOString(),
  };
  await writeFile(path.join(dir, 'request.json'), JSON.stringify(fullRequest, null, 2));
  await writeFile(path.join(dir, 'stdout.log'), '');
  await writeFile(path.join(dir, 'stderr.log'), '');
  return dir;
}

export async function updateJobRequest(jobId: string, patch: Partial<JobRequest>): Promise<void> {
  const requestPath = path.join(jobDir(jobId), 'request.json');
  const current = JSON.parse(await readFile(requestPath, 'utf8')) as JobRequest;
  await writeFile(requestPath, JSON.stringify({ ...current, ...patch }, null, 2));
}

export async function writeJobLogs(jobId: string, stdout: string, stderr: string): Promise<void> {
  const dir = jobDir(jobId);
  await writeFile(path.join(dir, 'stdout.log'), stdout);
  await writeFile(path.join(dir, 'stderr.log'), stderr);
}

export function tailText(value: string, maxChars = 4000): string {
  if (value.length <= maxChars) {
    return value;
  }
  return value.slice(value.length - maxChars);
}

export async function readJobSummary(jobId: string): Promise<JobLogSummary> {
  const dir = jobDir(jobId);
  const [request, stdout, stderr] = await Promise.all([
    readFile(path.join(dir, 'request.json'), 'utf8').then((value) => JSON.parse(value) as JobRequest),
    readFile(path.join(dir, 'stdout.log'), 'utf8'),
    readFile(path.join(dir, 'stderr.log'), 'utf8'),
  ]);

  return {
    job_id: jobId,
    request,
    stdout_tail: tailText(stdout),
    stderr_tail: tailText(stderr),
    log_path: dir,
  };
}
