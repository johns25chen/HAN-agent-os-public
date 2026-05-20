#!/usr/bin/env node

import { readFile, stat } from 'node:fs/promises';

const MAX_TASK_FILE_BYTES = 256 * 1024;

const SENSITIVE_TASK_FILE_PATH_PATTERNS = [
  '.env',
  '.ssh',
  'id_rsa',
  'id_ed25519',
  'token',
  'credential',
  'credentials',
  'secret',
  'api_key',
  'apikey',
  'private_key',
  'private-key',
];

const REQUIRED_SECTIONS = [
  'Hermes -> OpenClaw dry-run task',
  'Current verified state',
  'Task objective',
  'Allowed scope',
  'Expected output',
  'Safety checklist',
];

const FORBIDDEN_PHRASES = [
  'APPROVE_OPENCLAW_SEND',
  'approval_phrase',
  'stdout_tail',
  'openclaw message send',
  '--deliver',
  'git push',
  'read .env',
  'read ~/.ssh',
  'read token',
  'credential',
  'secret',
  'send external messages',
  'send messages',
  'external messages',
  'private messages',
  'outbound message',
  'outbound messages',
];

function parseArgs(argv) {
  const args = {
    task: undefined,
    taskFile: undefined,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--json') {
      args.json = true;
      continue;
    }

    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for ${arg}`);
    }

    if (arg === '--task') {
      args.task = value;
    } else if (arg === '--task-file') {
      args.taskFile = value;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }

    index += 1;
  }

  if (args.task !== undefined && args.taskFile !== undefined) {
    throw new Error('Use either --task or --task-file, not both.');
  }

  if (args.task === undefined && args.taskFile === undefined) {
    throw new Error('Provide --task or --task-file.');
  }

  return args;
}

async function loadTask(args) {
  if (args.taskFile === undefined) {
    return args.task;
  }

  const loweredTaskFilePath = args.taskFile.toLowerCase();
  const sensitivePathPattern = SENSITIVE_TASK_FILE_PATH_PATTERNS.find((pattern) =>
    loweredTaskFilePath.includes(pattern),
  );
  if (sensitivePathPattern !== undefined) {
    throw new Error('Refusing to read sensitive task-file path.');
  }

  const info = await stat(args.taskFile);
  if (!info.isFile()) {
    throw new Error('--task-file must point to a regular text file.');
  }

  if (info.size > MAX_TASK_FILE_BYTES) {
    throw new Error('Task file is too large.');
  }

  const task = await readFile(args.taskFile, 'utf8');
  if (task.includes('\0')) {
    throw new Error('--task-file must be a text file.');
  }

  return task;
}

function validateTask(task) {
  const missingSections = REQUIRED_SECTIONS.filter((section) => !task.includes(section));
  const loweredTask = task.toLowerCase();
  const forbiddenMatches = FORBIDDEN_PHRASES.filter((phrase) => loweredTask.includes(phrase.toLowerCase()));

  const requiredSectionsPresent = missingSections.length === 0;
  const forbiddenFieldsPresent = forbiddenMatches.length > 0;
  const validationResult = forbiddenFieldsPresent ? 'fail' : requiredSectionsPresent ? 'pass' : 'warn';

  return {
    validation_result: validationResult,
    required_sections_present: requiredSectionsPresent,
    missing_sections: missingSections,
    forbidden_fields_present: forbiddenFieldsPresent,
    forbidden_matches: forbiddenMatches,
    dryrun_ready: validationResult === 'pass',
  };
}

function formatMarkdown(result) {
  const missing = result.missing_sections.length > 0 ? result.missing_sections.join(', ') : 'None';
  const forbidden = result.forbidden_matches.length > 0 ? result.forbidden_matches.join(', ') : 'None';

  return [
    '# Dispatch Prompt Validation',
    '',
    `- validation_result: ${result.validation_result}`,
    `- required_sections_present: ${result.required_sections_present}`,
    `- missing_sections: ${missing}`,
    `- forbidden_fields_present: ${result.forbidden_fields_present}`,
    `- forbidden_matches: ${forbidden}`,
    `- dryrun_ready: ${result.dryrun_ready}`,
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const task = await loadTask(args);
  const result = validateTask(task);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(formatMarkdown(result));
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

export {
  FORBIDDEN_PHRASES,
  MAX_TASK_FILE_BYTES,
  REQUIRED_SECTIONS,
  SENSITIVE_TASK_FILE_PATH_PATTERNS,
  formatMarkdown,
  parseArgs,
  validateTask,
};
