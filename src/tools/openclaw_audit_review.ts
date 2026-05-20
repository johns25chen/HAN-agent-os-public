import { readFile } from 'node:fs/promises';
import path from 'node:path';
import * as z from 'zod/v4';
import { JOBS_DIR } from '../core/job.js';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;
const AUDIT_PATH = path.join(JOBS_DIR, 'audit', 'approved_employee_tasks.jsonl');

export const openclawAuditReviewInputSchema = {
  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Number of recent audit records to return. Defaults to 5. Max 20.'),
  json: z.boolean().optional().describe('Return structured JSON records instead of a markdown summary. Defaults to false.'),
};

export type OpenClawAuditReviewRecord = {
  review_result: 'pass' | 'warn' | 'fail';
  audit_id: unknown;
  created_at: unknown;
  source_dryrun_job_id: unknown;
  approved_job_id: unknown;
  agent: unknown;
  risk_level: unknown;
  status: unknown;
  exit_code: unknown;
  assistant_text: unknown;
  delivery_succeeded: unknown;
  stderr_tail_empty: boolean;
  task_sha256: unknown;
  task_preview: unknown;
  log_path: unknown;
};

export type OpenClawAuditReviewResult =
  | {
      ok: true;
      format: 'json';
      audit_path: string;
      records_reviewed: number;
      records: OpenClawAuditReviewRecord[];
    }
  | {
      ok: true;
      format: 'markdown';
      audit_path: string;
      records_reviewed: number;
      markdown: string;
    }
  | {
      ok: false;
      error: string;
      audit_path: string;
    };

export async function openclawAuditReview(input: { limit?: number; json?: boolean }): Promise<OpenClawAuditReviewResult> {
  const limit = normalizeLimit(input.limit);
  const recordsResult = await readAuditRecords(AUDIT_PATH);

  if (!recordsResult.ok) {
    return recordsResult;
  }

  const recentRecords = recordsResult.records.slice(-limit).map(sanitizeRecord);

  if (input.json === true) {
    return {
      ok: true,
      format: 'json',
      audit_path: AUDIT_PATH,
      records_reviewed: recentRecords.length,
      records: recentRecords,
    };
  }

  return {
    ok: true,
    format: 'markdown',
    audit_path: AUDIT_PATH,
    records_reviewed: recentRecords.length,
    markdown: formatMarkdownSummary(recentRecords),
  };
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_LIMIT;
  }

  return Math.min(limit, MAX_LIMIT);
}

async function readAuditRecords(
  auditPath: string,
): Promise<{ ok: true; records: Array<Record<string, unknown>> } | { ok: false; error: string; audit_path: string }> {
  let text: string;

  try {
    text = await readFile(auditPath, 'utf8');
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return {
        ok: false,
        error: `Audit file not found: ${auditPath}`,
        audit_path: auditPath,
      };
    }

    throw error;
  }

  const records: Array<Record<string, unknown>> = [];
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    try {
      const parsed = JSON.parse(line) as unknown;
      records.push(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {});
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: `Invalid JSON in ${auditPath} at line ${index + 1}: ${message}`,
        audit_path: auditPath,
      };
    }
  }

  return { ok: true, records };
}

function sanitizeRecord(record: Record<string, unknown>): OpenClawAuditReviewRecord {
  const stderrTail = valueToString(record.stderr_tail);
  const assistantText = valueToString(record.assistant_text);

  return {
    review_result: getReviewResult(record, stderrTail, assistantText),
    audit_id: record.audit_id ?? null,
    created_at: record.created_at ?? null,
    source_dryrun_job_id: record.source_dryrun_job_id ?? null,
    approved_job_id: record.approved_job_id ?? null,
    agent: record.agent ?? null,
    risk_level: record.risk_level ?? null,
    status: record.status ?? null,
    exit_code: record.exit_code ?? null,
    assistant_text: record.assistant_text ?? null,
    delivery_succeeded: record.delivery_succeeded ?? null,
    stderr_tail_empty: stderrTail.length === 0,
    task_sha256: record.task_sha256 ?? null,
    task_preview: record.task_preview ?? null,
    log_path: record.log_path ?? null,
  };
}

function getReviewResult(
  record: Record<string, unknown>,
  stderrTail: string,
  assistantText: string,
): OpenClawAuditReviewRecord['review_result'] {
  if (record.status !== 'completed' || record.exit_code !== 0) {
    return 'fail';
  }

  if (stderrTail.length > 0 || assistantText.length === 0) {
    return 'warn';
  }

  if (record.delivery_succeeded === false) {
    return 'pass';
  }

  return 'warn';
}

function formatMarkdownSummary(records: OpenClawAuditReviewRecord[]): string {
  const lines = [
    '# Approved Employee Task Audit Review',
    '',
    `Audit file: \`${AUDIT_PATH}\``,
    `Records reviewed: ${records.length}`,
    '',
  ];

  if (records.length === 0) {
    lines.push('No audit records found.');
    return lines.join('\n');
  }

  records.forEach((record, index) => {
    lines.push(`## ${index + 1}. ${record.audit_id ?? '(missing audit_id)'} - ${record.review_result}`);
    lines.push(`- audit_id: ${formatValue(record.audit_id)}`);
    lines.push(`- created_at: ${formatValue(record.created_at)}`);
    lines.push(`- source_dryrun_job_id: ${formatValue(record.source_dryrun_job_id)}`);
    lines.push(`- approved_job_id: ${formatValue(record.approved_job_id)}`);
    lines.push(`- agent: ${formatValue(record.agent)}`);
    lines.push(`- risk_level: ${formatValue(record.risk_level)}`);
    lines.push(`- status: ${formatValue(record.status)}`);
    lines.push(`- exit_code: ${formatValue(record.exit_code)}`);
    lines.push(`- assistant_text: ${formatValue(record.assistant_text)}`);
    lines.push(`- delivery_succeeded: ${formatValue(record.delivery_succeeded)}`);
    lines.push(`- stderr_tail_empty: ${record.stderr_tail_empty}`);
    lines.push(`- task_sha256: ${formatValue(record.task_sha256)}`);
    lines.push(`- task_preview: ${formatValue(record.task_preview)}`);
    lines.push(`- log_path: ${formatValue(record.log_path)}`);
    lines.push('');
  });

  return lines.join('\n');
}

function valueToString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '`null`';
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  return String(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
