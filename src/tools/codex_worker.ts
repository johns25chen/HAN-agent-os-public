import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { type JobRequest, jobDir, updateJobRequest, writeJobLogs } from '../core/job.js';
import { runCodexJob } from './codex_run.js';

async function main(): Promise<void> {
  const jobId = process.argv[2];
  if (!jobId) {
    throw new Error('Usage: node dist/tools/codex_worker.js <job_id>');
  }

  const requestPath = path.join(jobDir(jobId), 'request.json');
  const request = JSON.parse(await readFile(requestPath, 'utf8')) as JobRequest;

  await runCodexJob(jobId, request.cwd, request.prompt);
}

main().catch(async (error) => {
  const jobId = process.argv[2];
  const message = error instanceof Error ? error.stack ?? error.message : String(error);

  if (!jobId) {
    console.error(message);
    process.exitCode = 1;
    return;
  }

  try {
    await writeJobLogs(jobId, '', message);
    await updateJobRequest(jobId, {
      status: 'failed',
      exit_code: 1,
      completed_at: new Date().toISOString(),
    });
  } catch (updateError) {
    console.error(updateError);
  }

  process.exitCode = 1;
});
