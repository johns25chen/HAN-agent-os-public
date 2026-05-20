import { existsSync, readFileSync } from 'node:fs';

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const docPath = 'docs/releases/public-release-index.md';

assert(existsSync(docPath), `missing release index doc: ${docPath}`);

const text = readFileSync(docPath, 'utf8');

const requiredPhrases = [
  'Public Release Index',
  'Recommended current release after this document is published:',
  'v0.2.5-public or newer',
  '| `v0.2.5-public` | current | Public release index and version map |',
  '| `v0.2.4-public` | stable | Public workflow matrix and capability boundary table |',
  '| `v0.2.3-public` | stable | Public-safe dry-run mock implementation example |',
  '| `v0.2.2-public` | stable | Public-safe dry-run workflow contract |',
  '| `v0.2.1-public` | stable | Public-safe status-read mock implementation example |',
  '| `v0.2.0-public` | stable | Public-safe status-read workflow contract |',
  '| `v0.1.5-public` | superseded | Superseded by `v0.1.6-public` |',
  '| `v0.1.4-public` | superseded | Superseded by `v0.1.6-public` |',
  'The public repository does not currently support:',
  'live OpenClaw execution',
  'shell execution',
  'browser automation',
  'file mutation workflows',
  'credential access',
  'Do not start from v0.1.4-public or v0.1.5-public',
  'This release index is documentation only',
  'It does not add live execution'
];

for (const phrase of requiredPhrases) {
  assert(text.includes(phrase), `release index missing required phrase: ${phrase}`);
}

const forbiddenClaims = [
  'v0.1.4-public | stable',
  'v0.1.5-public | stable',
  'live OpenClaw execution is supported',
  'shell execution is supported',
  'browser automation is supported',
  'file mutation workflows are supported',
  'credential access is supported'
];

for (const phrase of forbiddenClaims) {
  assert(!text.includes(phrase), `release index contains forbidden claim: ${phrase}`);
}

console.log('public_release_index_result: pass');
