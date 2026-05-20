import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const version = '0.1.0';

const checks = [];
const warnings = [];

function addCheck(name, pass, message, details = undefined) {
  checks.push({
    name,
    verdict: pass ? 'PASS' : 'FAIL',
    message,
    ...(details === undefined ? {} : { details })
  });
}

function addWarning(message) {
  warnings.push(message);
}

function commandExists(command) {
  const result = spawnSync(command, ['--version'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  return result.status === 0;
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function readJson(filePath) {
  return JSON.parse(readFileSync(path.join(root, filePath), 'utf8'));
}

function checkReleaseIndexExists() {
  const releaseIndexPath = 'docs/releases/public-release-index.md';
  addCheck(
    'release_index_exists',
    existsSync(path.join(root, releaseIndexPath)),
    `${releaseIndexPath} exists`
  );
}

function checkPackageJsonExists() {
  addCheck('package_json_exists', existsSync(path.join(root, 'package.json')), 'package.json exists');
}

function checkReleaseIndexContent() {
  const releaseIndexPath = path.join(root, 'docs/releases/public-release-index.md');

  if (!existsSync(releaseIndexPath)) {
    addCheck('recommended_release_text', false, 'release index is missing');
    addCheck('superseded_v0_1_4', false, 'release index is missing');
    addCheck('superseded_v0_1_5', false, 'release index is missing');
    return;
  }

  const text = readFileSync(releaseIndexPath, 'utf8');
  addCheck(
    'recommended_release_text',
    text.includes('v0.2.5-public or newer'),
    'recommended release text includes "v0.2.5-public or newer"'
  );

  for (const tag of ['v0.1.4-public', 'v0.1.5-public']) {
    const expected = '| `' + tag + '` | superseded |';
    addCheck(
      `superseded_${tag.replaceAll('.', '_').replaceAll('-', '_')}`,
      text.includes(expected),
      `${tag} is marked superseded`
    );
  }
}

function checkPackageScripts() {
  if (!existsSync(path.join(root, 'package.json'))) {
    addCheck('required_package_scripts', false, 'package.json is missing');
    return;
  }

  const requiredScripts = [
    'test:public',
    'test:status-read',
    'test:status-read-example',
    'test:dry-run',
    'test:dry-run-example',
    'test:workflow-matrix',
    'test:release-index'
  ];

  let pkg;
  try {
    pkg = readJson('package.json');
  } catch (error) {
    addCheck('required_package_scripts', false, `package.json could not be parsed: ${error.message}`);
    return;
  }

  const missing = requiredScripts.filter((script) => typeof pkg.scripts?.[script] !== 'string');
  addCheck(
    'required_package_scripts',
    missing.length === 0,
    missing.length === 0 ? 'all required public test scripts exist' : 'required public test scripts are missing',
    missing.length === 0 ? undefined : { missing }
  );
}

function checkGitTag() {
  if (!commandExists('git')) {
    addWarning('git is unavailable; skipped local tag check for v0.2.5-public');
    addCheck('git_tag_v0_2_5_public', true, 'skipped because git is unavailable');
    return;
  }

  const result = run('git', ['rev-parse', '--verify', '--quiet', 'refs/tags/v0.2.5-public']);
  addCheck(
    'git_tag_v0_2_5_public',
    result.status === 0,
    'local git tag v0.2.5-public exists'
  );
}

function checkGithubRelease() {
  if (!commandExists('gh')) {
    addWarning('gh is unavailable; skipped latest GitHub release check');
    addCheck('github_latest_release_v0_2_5_public', true, 'skipped because gh is unavailable');
    return;
  }

  const authStatus = run('gh', ['auth', 'status']);
  if (authStatus.status !== 0) {
    addWarning('gh is available but not authenticated; skipped latest GitHub release check');
    addCheck('github_latest_release_v0_2_5_public', true, 'skipped because gh is not authenticated');
    return;
  }

  const result = run('gh', ['release', 'view', '--json', 'tagName,name,body', '--jq', '[.tagName, .name, .body] | join("\\n")']);
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  addCheck(
    'github_latest_release_v0_2_5_public',
    result.status === 0 && output.includes('v0.2.5-public'),
    'latest GitHub release contains v0.2.5-public'
  );
}

checkReleaseIndexExists();
checkPackageJsonExists();
checkReleaseIndexContent();
checkPackageScripts();
checkGitTag();
checkGithubRelease();

const verdict = checks.every((check) => check.verdict === 'PASS') ? 'PASS' : 'FAIL';
const report = {
  version,
  verdict,
  checks,
  warnings
};

console.log(JSON.stringify(report, null, 2));
process.exit(verdict === 'PASS' ? 0 : 1);
