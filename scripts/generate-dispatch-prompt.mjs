#!/usr/bin/env node

const SAFETY_CHECKLIST = [
  'Do not inspect files unless allowed.',
  'Do not modify files.',
  'Do not perform outbound communication.',
  'Do not use delivery mode or external delivery flags.',
  'Do not access private config files, SSH material, authentication material, or API keys.',
  'Do not change OpenClaw Gateway state.',
  'Do not call approved execution tools.',
];

const FORBIDDEN_PHRASES = [
  'APPROVE_OPENCLAW_SEND',
  'approval_phrase',
  'stdout_tail',
  'send external messages',
  'send messages',
  'external messages',
  'private messages',
  'outbound message',
  'outbound messages',
  'openclaw message send',
  '--deliver',
  'git push',
  'read .env',
  'read ~/.ssh',
  'read token',
  'credential',
  'secret',
];

function parseArgs(argv) {
  const args = {
    objective: '',
    state: '',
    allowedScope: '',
    expectedOutput: '',
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

    if (arg === '--objective') {
      args.objective = value;
    } else if (arg === '--state') {
      args.state = value;
    } else if (arg === '--allowed-scope') {
      args.allowedScope = value;
    } else if (arg === '--expected-output') {
      args.expectedOutput = value;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }

    index += 1;
  }

  return args;
}

function hasForbiddenFields(args, task) {
  const fieldsToCheck = [
    args.objective,
    args.state,
    args.allowedScope,
    args.expectedOutput,
    task,
  ].join('\n').toLowerCase();

  return FORBIDDEN_PHRASES.some((phrase) => fieldsToCheck.includes(phrase.toLowerCase()));
}

function buildTask(args) {
  return [
    'Hermes -> OpenClaw dry-run task',
    '',
    'Current verified state',
    args.state || 'Not provided.',
    '',
    'Task objective',
    args.objective || 'Not provided.',
    '',
    'Allowed scope',
    args.allowedScope || 'Not provided.',
    '',
    'Expected output',
    args.expectedOutput || 'Not provided.',
    '',
    'Safety checklist',
    ...SAFETY_CHECKLIST.map((item) => `- ${item}`),
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const task = buildTask(args);
  const forbiddenFieldsPresent = hasForbiddenFields(args, task);

  if (args.json) {
    console.log(JSON.stringify({
      task,
      safety_checklist: SAFETY_CHECKLIST,
      forbidden_fields_present: forbiddenFieldsPresent,
    }, null, 2));
    return;
  }

  console.log(task);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
