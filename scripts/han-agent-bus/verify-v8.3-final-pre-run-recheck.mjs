import { spawnSync } from 'node:child_process';

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function run(command, args) {
  return spawnSync(command, args, { encoding: 'utf8' });
}

function tagExists(tagName) {
  const result = run('git', ['rev-parse', '--verify', `refs/tags/${tagName}`]);
  return result.status === 0;
}

function validateBaselineTags() {
  assert(tagExists('han-agent-bus-v8.3-exact-command-mapping'), 'missing exact command mapping tag');
  assert(tagExists('han-agent-bus-v8.3-exact-command-mapping-verification'), 'missing exact command mapping verification tag');
  assert(tagExists('han-agent-bus-v8.3-planner-agent-creation'), 'missing planner agent creation tag');
  assert(tagExists('han-agent-bus-v8.3-openclaw-pre-live-readiness'), 'missing OpenClaw pre-live readiness tag');
}

function parseTasks(statusText) {
  const taskMatch = statusText.match(/Tasks\s*│\s*(\d+)\s*active\s*·\s*(\d+)\s*queued\s*·\s*(\d+)\s*running/i);
  assert(taskMatch, 'task status summary missing');
  return {
    active: Number(taskMatch[1]),
    queued: Number(taskMatch[2]),
    running: Number(taskMatch[3])
  };
}

function parseSecurity(auditText) {
  const criticalMatch = auditText.match(/Summary:\s*(\d+)\s*critical\s*·\s*(\d+)\s*warn/i);
  assert(criticalMatch, 'security audit summary missing');
  return {
    critical: Number(criticalMatch[1]),
    warn: Number(criticalMatch[2])
  };
}

function collectRecheck() {
  validateBaselineTags();

  const gitStatus = run('git', ['status', '--short']);
  assert(gitStatus.status === 0, 'git status failed');

  const exactMapping = run(process.execPath, ['scripts/han-agent-bus/verify-v8.3-exact-command-mapping.mjs']);
  assert(exactMapping.status === 0, 'exact command mapping verifier failed');

  let mapping;
  try {
    mapping = JSON.parse(exactMapping.stdout);
  } catch {
    throw new Error('exact command mapping verifier did not return valid JSON');
  }

  const agentsList = run('openclaw', ['agents', 'list', '--json']);
  assert(agentsList.status === 0, 'openclaw agents list --json failed');

  let agents;
  try {
    agents = JSON.parse(agentsList.stdout);
  } catch {
    throw new Error('agents list JSON parse failed');
  }

  const planner = agents.find((agent) => agent.id === 'planner');

  const status = run('openclaw', ['status', '--deep']);
  assert(status.status === 0, 'openclaw status --deep failed');

  const audit = run('openclaw', ['security', 'audit']);
  assert(audit.status === 0, 'openclaw security audit failed');

  const tasks = parseTasks(status.stdout);
  const security = parseSecurity(audit.stdout);

  return {
    recheck_id: 'final_pre_run_recheck_job_20260519115852_b784842d_v8_3',
    source_job_id: 'job_20260519115852_b784842d',
    source_exact_mapping_tag: 'han-agent-bus-v8.3-exact-command-mapping',
    recheck_status: 'final_pre_run_recheck_pass_no_ping',
    git_worktree_clean: gitStatus.stdout.trim() === '',
    exact_mapping_verdict: mapping.verdict,
    target: mapping.target,
    agent: mapping.agent,
    live_tool: mapping.abstract_live_tool,
    operation_type: mapping.operation_type,
    planner_agent_exists: Boolean(planner),
    planner_model: planner?.model || null,
    planner_bindings: planner?.bindings ?? null,
    planner_is_default: planner?.isDefault ?? null,
    gateway_loopback: /127\.0\.0\.1:18789/.test(status.stdout),
    gateway_reachable: /Gateway\s*│\s*local.*reachable/i.test(status.stdout) || /Gateway\s+reachable/i.test(status.stdout),
    tailscale_exposure_off: /Tailscale exposure\s*│\s*off/i.test(status.stdout),
    gateway_service_running: /Gateway service\s*│.*running/i.test(status.stdout),
    tasks_active: tasks.active,
    tasks_queued: tasks.queued,
    tasks_running: tasks.running,
    security_critical_count: security.critical,
    security_warn_count: security.warn,
    execution_count_allowed: mapping.execution_count_allowed,
    execution_count_performed: mapping.execution_count_performed,
    live_call_performed: false,
    noop_ping_performed: false,
    final_live_receipt_materialized: false,
    v8_3_stable_allowed: false,
    created_at: '2026-05-20T11:20:00.000Z',
    safety_boundary: 'v8.3 final pre-run recheck verifies environment only. It does not execute no-op ping, call live tools, materialize final live receipt, or allow v8.3 stable.'
  };
}

function validateRecheck(r) {
  assert(r && typeof r === 'object', 'recheck record is missing');
  assert(r.source_job_id === 'job_20260519115852_b784842d', 'source_job_id mismatch');
  assert(r.source_exact_mapping_tag === 'han-agent-bus-v8.3-exact-command-mapping', 'exact mapping tag mismatch');
  assert(r.recheck_status === 'final_pre_run_recheck_pass_no_ping', 'recheck status mismatch');
  assert(r.git_worktree_clean === true, 'git worktree must be clean');
  assert(r.exact_mapping_verdict === 'PASS', 'exact mapping verifier must PASS');
  assert(r.target === 'openclaw', 'target mismatch');
  assert(r.agent === 'planner', 'agent mismatch');
  assert(r.live_tool === 'openclaw_send_task_live', 'live tool mismatch');
  assert(r.operation_type === 'no_op_ping', 'operation type mismatch');
  assert(r.planner_agent_exists === true, 'planner agent must exist');
  assert(r.planner_model === 'openai/gpt-5.5', 'planner model mismatch');
  assert(r.planner_bindings === 0, 'planner bindings must be 0');
  assert(r.planner_is_default === false, 'planner must not be default');
  assert(r.gateway_loopback === true, 'gateway must be loopback');
  assert(r.gateway_reachable === true, 'gateway must be reachable');
  assert(r.tailscale_exposure_off === true, 'tailscale exposure must be off');
  assert(r.gateway_service_running === true, 'gateway service must be running');
  assert(r.tasks_active === 0, 'active tasks must be 0');
  assert(r.tasks_queued === 0, 'queued tasks must be 0');
  assert(r.tasks_running === 0, 'running tasks must be 0');
  assert(r.security_critical_count === 0, 'security critical count must be 0');
  assert(r.execution_count_allowed === 1, 'execution count allowed must be 1');
  assert(r.execution_count_performed === 0, 'execution count performed must be 0');
  assert(r.live_call_performed === false, 'live call must not be performed by recheck');
  assert(r.noop_ping_performed === false, 'noop ping must not be performed by recheck');
  assert(r.final_live_receipt_materialized === false, 'final live receipt must not be materialized by recheck');
  assert(r.v8_3_stable_allowed === false, 'v8.3 stable must not be allowed');
  assert(String(r.safety_boundary).includes('does not execute no-op ping'), 'safety boundary must deny ping');
  assert(String(r.safety_boundary).includes('call live tools'), 'safety boundary must deny live tools');
}

function expectPass(name, fn) {
  try {
    fn();
    return { name, pass: true };
  } catch (error) {
    return { name, pass: false, error: error.message };
  }
}

function expectReject(name, fn) {
  try {
    fn();
    return { name, pass: false, error: 'expected rejection but passed' };
  } catch (error) {
    return { name, pass: true, rejected_with: error.message };
  }
}

const validRecheck = collectRecheck();

const checks = [
  expectPass('valid final pre-run recheck passes', () => validateRecheck(validRecheck)),
  expectReject('missing recheck is rejected', () => validateRecheck(null)),
  expectReject('dirty git worktree is rejected', () => validateRecheck({ ...validRecheck, git_worktree_clean: false })),
  expectReject('failed exact mapping is rejected', () => validateRecheck({ ...validRecheck, exact_mapping_verdict: 'FAIL' })),
  expectReject('wrong agent is rejected', () => validateRecheck({ ...validRecheck, agent: 'main' })),
  expectReject('planner missing is rejected', () => validateRecheck({ ...validRecheck, planner_agent_exists: false })),
  expectReject('planner bindings are rejected', () => validateRecheck({ ...validRecheck, planner_bindings: 1 })),
  expectReject('non-loopback gateway is rejected', () => validateRecheck({ ...validRecheck, gateway_loopback: false })),
  expectReject('tailscale exposure on is rejected', () => validateRecheck({ ...validRecheck, tailscale_exposure_off: false })),
  expectReject('active tasks are rejected', () => validateRecheck({ ...validRecheck, tasks_active: 1 })),
  expectReject('queued tasks are rejected', () => validateRecheck({ ...validRecheck, tasks_queued: 1 })),
  expectReject('running tasks are rejected', () => validateRecheck({ ...validRecheck, tasks_running: 1 })),
  expectReject('security critical is rejected', () => validateRecheck({ ...validRecheck, security_critical_count: 1 })),
  expectReject('execution already performed is rejected', () => validateRecheck({ ...validRecheck, execution_count_performed: 1 })),
  expectReject('live call performed is rejected', () => validateRecheck({ ...validRecheck, live_call_performed: true })),
  expectReject('noop ping performed is rejected', () => validateRecheck({ ...validRecheck, noop_ping_performed: true })),
  expectReject('final live receipt materialized is rejected', () => validateRecheck({ ...validRecheck, final_live_receipt_materialized: true })),
  expectReject('v8.3 stable allowed is rejected', () => validateRecheck({ ...validRecheck, v8_3_stable_allowed: true }))
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v8.3-final-pre-run-recheck',
  verdict,
  source_job_id: validRecheck.source_job_id,
  recheck_id: validRecheck.recheck_id,
  recheck_status: validRecheck.recheck_status,
  git_worktree_clean: validRecheck.git_worktree_clean,
  exact_mapping_verdict: validRecheck.exact_mapping_verdict,
  target: validRecheck.target,
  agent: validRecheck.agent,
  live_tool: validRecheck.live_tool,
  operation_type: validRecheck.operation_type,
  planner_agent_exists: validRecheck.planner_agent_exists,
  planner_model: validRecheck.planner_model,
  planner_bindings: validRecheck.planner_bindings,
  planner_is_default: validRecheck.planner_is_default,
  gateway_loopback: validRecheck.gateway_loopback,
  gateway_reachable: validRecheck.gateway_reachable,
  tailscale_exposure_off: validRecheck.tailscale_exposure_off,
  gateway_service_running: validRecheck.gateway_service_running,
  tasks_active: validRecheck.tasks_active,
  tasks_queued: validRecheck.tasks_queued,
  tasks_running: validRecheck.tasks_running,
  security_critical_count: validRecheck.security_critical_count,
  security_warn_count: validRecheck.security_warn_count,
  execution_count_allowed: validRecheck.execution_count_allowed,
  execution_count_performed: validRecheck.execution_count_performed,
  live_call_performed: validRecheck.live_call_performed,
  noop_ping_performed: validRecheck.noop_ping_performed,
  final_live_receipt_materialized: validRecheck.final_live_receipt_materialized,
  v8_3_stable_allowed: validRecheck.v8_3_stable_allowed,
  no_live_execution_tool_called: true,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
