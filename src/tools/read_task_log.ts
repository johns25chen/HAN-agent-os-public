import * as z from 'zod/v4';
import { readJobSummary } from '../core/job.js';

export const readTaskLogInputSchema = {
  job_id: z.string().min(1).describe('Job id returned by codex_run.'),
};

export async function readTaskLog(input: { job_id: string }) {
  const summary = await readJobSummary(input.job_id);
  return {
    job_id: summary.job_id,
    status: summary.request.status,
    exit_code: summary.request.exit_code ?? null,
    created_at: summary.request.created_at,
    completed_at: summary.request.completed_at ?? null,
    stdout_tail: summary.stdout_tail,
    stderr_tail: summary.stderr_tail,
    log_path: summary.log_path,
  };
}
