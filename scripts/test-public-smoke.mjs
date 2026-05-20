import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (['.git', 'node_modules', 'dist'].includes(name)) continue;
    const full = path.join(dir, name);
    const rel = path.relative(root, full);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else {
      files.push(rel);
    }
  }
  return files;
}

function checkRequiredFiles() {
  const required = [
    'README.md',
    'LICENSE',
    'SECURITY.md',
    'CONTRIBUTING.md',
    'docs/quick-start.md',
    'docs/han-agent-bus/technical-tool-reference.md',
    'docs/han-agent-bus/safety-model.md',
    'docs/han-agent-bus/public-roadmap.md',
    'package.json',
    'pnpm-lock.yaml',
    'tsconfig.json'
  ];

  for (const file of required) {
    assert(existsSync(path.join(root, file)), `missing required file: ${file}`);
  }
}

function gitTrackedFiles() {
  const result = spawnSync('git', ['ls-files'], {
    cwd: root,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    throw new Error(`git ls-files failed: ${result.stderr || result.stdout}`);
  }

  return result.stdout.split(/\r?\n/).filter(Boolean);
}

function checkForbiddenPaths() {
  const forbiddenExisting = [
    'jobs',
    'docs/han-agent-bus/han-agent-os-public-release-safety-audit.md',
    'docs/han-agent-bus/han-agent-os-public-sanitized-export-plan.md',
    'PUBLIC_EXPORT_READINESS_AUDIT.md'
  ];

  for (const item of forbiddenExisting) {
    assert(!existsSync(path.join(root, item)), `forbidden public artifact exists: ${item}`);
  }

  const tracked = gitTrackedFiles();
  const forbiddenTrackedPrefixes = [
    'jobs/',
    'dist/',
    'node_modules/'
  ];

  const forbiddenTracked = tracked.filter((file) => {
    return forbiddenTrackedPrefixes.some((prefix) => file.startsWith(prefix));
  });

  assert(
    forbiddenTracked.length === 0,
    `forbidden generated/private paths are tracked:\n${forbiddenTracked.join('\n')}`
  );
}

function checkPackageScripts() {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert(pkg.scripts?.build === 'tsc', 'missing build script');
  assert(pkg.scripts?.start === 'node dist/mcp-server.js', 'missing start script');
  assert(pkg.scripts?.dev === 'tsx src/mcp-server.ts', 'missing dev script');
  assert(pkg.scripts?.['test:public'] === 'node scripts/test-public-smoke.mjs', 'missing test:public script');
}

function extractMarkdownLinks(text) {
  const matches = [...text.matchAll(/\(([^)]+)\)/g)];
  return matches.map((m) => m[1]).filter((link) => {
    return !link.startsWith('http') && !link.startsWith('#') && !link.startsWith('mailto:');
  });
}

function checkLinksIn(filePath, baseDir) {
  const text = readFileSync(path.join(root, filePath), 'utf8');
  const links = extractMarkdownLinks(text);
  const missing = [];

  for (const link of links) {
    const clean = link.split('#')[0];
    if (!clean) continue;
    const target = path.resolve(root, baseDir, clean);
    if (!existsSync(target)) missing.push(`${filePath} -> ${link}`);
  }

  assert(missing.length === 0, `missing markdown links:\n${missing.join('\n')}`);
}

function checkSecretLikeStrings() {
  const files = walk(root);
  const pattern = /(gho_[A-Za-z0-9_]+|ghp_[A-Za-z0-9_]+|sk-[A-Za-z0-9_-]{20,}|OPENAI_API_KEY=|ANTHROPIC_API_KEY=|BEGIN OPENSSH|BEGIN RSA PRIVATE KEY|refresh_token[=:]|access_token[=:]|sessionId[=:]|cookie[=:])/;

  const allowedMarkers = [
    'pnpm-lock.yaml',
    'cookie: 0.7.2',
    'han-agent-bus-openclaw-send-task-approved-test-client',
    'verify-v8.1-live-adapter-sandbox-contract.mjs'
  ];

  const hits = [];

  for (const file of files) {
    const full = path.join(root, file);
    const text = readFileSync(full, 'utf8');
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        const hit = `${file}:${index + 1}:${line}`;
        if (!allowedMarkers.some((marker) => hit.includes(marker))) {
          hits.push(hit);
        }
      }
    });
  }

  assert(hits.length === 0, `unclassified high-confidence secret-like hits:\n${hits.join('\n')}`);
}

checkRequiredFiles();
checkForbiddenPaths();
checkPackageScripts();
checkLinksIn('README.md', '.');
checkLinksIn('docs/quick-start.md', 'docs');
checkSecretLikeStrings();

console.log('public_smoke_result: pass');
