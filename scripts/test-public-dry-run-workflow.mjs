import { existsSync, readFileSync } from 'node:fs';

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const docPath = 'docs/workflows/public-safe-dry-run-workflow.md';

assert(existsSync(docPath), `missing workflow doc: ${docPath}`);

const text = readFileSync(docPath, 'utf8');

const requiredPhrases = [
  'public-safe dry-run',
  'does not perform live execution',
  'does not mutate files',
  'does not run arbitrary shell commands',
  'does not launch browser automation',
  'does not require secrets',
  'does not call live OpenClaw',
  'task_class: dry_run',
  'mutation_allowed: false',
  'live_task_execution_allowed: false',
  'file_write_allowed: false',
  'shell_execution_allowed: false',
  'browser_automation_allowed: false',
  'credential_access_allowed: false',
  'repeated_execution_allowed: false',
  'chained_execution_allowed: false',
  'operation_type: dry_run',
  'mutation_performed: false',
  'live_task_executed: false',
  'file_write_performed: false',
  'shell_execution_performed: false',
  'browser_automation_performed: false',
  'credential_access_performed: false',
  'openclaw_live_call_performed: false',
  'codex_execution_performed: false',
  'simulated_plan_available: true',
  'human approval required before any live action'
];

for (const phrase of requiredPhrases) {
  assert(text.includes(phrase), `dry-run workflow doc missing required phrase: ${phrase}`);
}

const forbiddenClaims = [
  'live execution is allowed automatically',
  'OpenClaw may be called live without approval',
  'shell commands may run without approval',
  'credentials may be persisted',
  'browser sessions may be persisted',
  'dry-run automatically authorizes live execution'
];

for (const phrase of forbiddenClaims) {
  assert(!text.includes(phrase), `dry-run workflow doc contains forbidden claim: ${phrase}`);
}

console.log('public_dry_run_workflow_result: pass');
