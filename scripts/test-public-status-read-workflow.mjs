import { existsSync, readFileSync } from 'node:fs';

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const docPath = 'docs/workflows/public-safe-status-read-workflow.md';

assert(existsSync(docPath), `missing workflow doc: ${docPath}`);

const text = readFileSync(docPath, 'utf8');

const requiredPhrases = [
  'public-safe status-read',
  'read-only',
  'does not run live execution',
  'does not mutate files',
  'does not require secrets',
  'does not use browser sessions',
  'Hermes',
  'OpenClaw',
  'Codex',
  'HAN Agent OS',
  'task_class: status_read',
  'mutation_allowed: false',
  'live_task_execution_allowed: false',
  'file_write_allowed: false',
  'shell_execution_allowed: false',
  'credential_access_allowed: false',
  'repeated_execution_allowed: false',
  'operation_type: status_read',
  'mutation_performed: false',
  'live_task_executed: false',
  'shell_execution_performed: false',
  'browser_automation_performed: false',
  'credential_access_performed: false'
];

for (const phrase of requiredPhrases) {
  assert(text.includes(phrase), `workflow doc missing required phrase: ${phrase}`);
}

const forbiddenClaims = [
  'unrestricted OpenClaw execution is allowed',
  'automatic live execution is allowed',
  'credentials may be persisted',
  'browser sessions may be persisted',
  'shell commands may run without approval'
];

for (const phrase of forbiddenClaims) {
  assert(!text.includes(phrase), `workflow doc contains forbidden claim: ${phrase}`);
}

console.log('public_status_read_workflow_result: pass');
