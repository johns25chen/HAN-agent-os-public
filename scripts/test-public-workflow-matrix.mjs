import { existsSync, readFileSync } from 'node:fs';

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const docPath = 'docs/workflows/public-workflow-matrix.md';

assert(existsSync(docPath), `missing matrix doc: ${docPath}`);

const text = readFileSync(docPath, 'utf8');

const requiredPhrases = [
  'Public Workflow Matrix',
  'capability boundary table',
  'It is not a permission grant',
  '| status-read | yes | yes | no | yes | public-safe |',
  '| dry-run | yes | yes | no | yes | public-safe |',
  '| live execution | no | no | no | no | not authorized |',
  '| file mutation | no | no | no | no | not authorized |',
  '| shell execution | no | no | no | no | not authorized |',
  '| browser automation | no | no | no | no | not authorized |',
  '| credential access | no | no | no | no | not authorized |',
  '| API key persistence | no | no | no | no | not authorized |',
  '| chained execution | no | no | no | no | not authorized |',
  '| repeated execution | no | no | no | no | not authorized |',
  'OpenClaw | represented by mock fixtures only',
  'Codex | not executed by public examples',
  'A mock implementation is not a live adapter',
  'Current public capability does not include live execution'
];

for (const phrase of requiredPhrases) {
  assert(text.includes(phrase), `workflow matrix missing required phrase: ${phrase}`);
}

const forbiddenClaims = [
  'live execution | yes',
  'shell execution | yes',
  'browser automation | yes',
  'credential access | yes',
  'API key persistence | yes',
  'live OpenClaw execution is available',
  'mock implementation is a live adapter',
  'public examples execute Codex'
];

for (const phrase of forbiddenClaims) {
  assert(!text.includes(phrase), `workflow matrix contains forbidden claim: ${phrase}`);
}

console.log('public_workflow_matrix_result: pass');
