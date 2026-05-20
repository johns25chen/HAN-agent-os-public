#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_LIMIT = 5;
const AUDIT_PATH = path.resolve('jobs/audit/approved_employee_tasks.jsonl');

const args = parseArgs(process.argv.slice(2));
const records = await readAuditRecords(AUDIT_PATH);
const recentRecords = records.slice(-args.limit).map(sanitizeRecord);

if (args.json) {
  console.log(JSON.stringify(recentRecords, null, 2));
} else {
  printMarkdownSummary(recentRecords);
}

function parseArgs(argv) {
  const parsed = {
    limit: DEFAULT_LIMIT,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--json') {
      parsed.json = true;
      continue;
    }

    if (arg === '--limit') {
      const value = argv[index + 1];
      if (!value) {
        fail('Missing value for --limit.');
      }

      const limit = Number(value);
      if (!Number.isInteger(limit) || limit < 1) {
        fail(`Invalid --limit value: ${value}. Expected a positive integer.`);
      }

      parsed.limit = limit;
      index += 1;
      continue;
    }

    fail(`Unknown argument: ${arg}`);
  }

  return parsed;
}

async function readAuditRecords(auditPath) {
  let text;

  try {
    text = await readFile(auditPath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      fail(`Audit file not found: ${auditPath}`);
    }

    throw error;
  }

  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => parseJsonLine(line, index + 1));
}

function parseJsonLine(line, lineNumber) {
  try {
    return JSON.parse(line);
  } catch (error) {
    fail(`Invalid JSON in ${AUDIT_PATH} at line ${lineNumber}: ${error.message}`);
  }
}

function sanitizeRecord(record) {
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

function getReviewResult(record, stderrTail, assistantText) {
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

function printMarkdownSummary(records) {
  console.log(`# Approved Employee Task Audit Review\n`);
  console.log(`Audit file: \`${AUDIT_PATH}\``);
  console.log(`Records reviewed: ${records.length}\n`);

  if (records.length === 0) {
    console.log('No audit records found.');
    return;
  }

  records.forEach((record, index) => {
    console.log(`## ${index + 1}. ${record.audit_id ?? '(missing audit_id)'} - ${record.review_result}`);
    console.log(`- audit_id: ${formatValue(record.audit_id)}`);
    console.log(`- created_at: ${formatValue(record.created_at)}`);
    console.log(`- source_dryrun_job_id: ${formatValue(record.source_dryrun_job_id)}`);
    console.log(`- approved_job_id: ${formatValue(record.approved_job_id)}`);
    console.log(`- agent: ${formatValue(record.agent)}`);
    console.log(`- risk_level: ${formatValue(record.risk_level)}`);
    console.log(`- status: ${formatValue(record.status)}`);
    console.log(`- exit_code: ${formatValue(record.exit_code)}`);
    console.log(`- assistant_text: ${formatValue(record.assistant_text)}`);
    console.log(`- delivery_succeeded: ${formatValue(record.delivery_succeeded)}`);
    console.log(`- stderr_tail_empty: ${record.stderr_tail_empty}`);
    console.log(`- task_sha256: ${formatValue(record.task_sha256)}`);
    console.log(`- task_preview: ${formatValue(record.task_preview)}`);
    console.log(`- log_path: ${formatValue(record.log_path)}`);
    console.log('');
  });
}

function valueToString(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '`null`';
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  return String(value);
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}
