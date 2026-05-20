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
  assert(tagExists('han-agent-bus-v8.3-controlled-noop-live-adapter-ping-execution-package'), 'missing v8.3 execution package tag');
  assert(tagExists('han-agent-bus-v8.3-controlled-noop-live-adapter-ping-execution-package-verification'), 'missing v8.3 execution package verification tag');
}

function collectOpenClawReadiness() {
  validateBaselineTags();

  const cli = run('bash', ['-lc', 'command -v openclaw']);
  assert(cli.status === 0, 'openclaw CLI is missing');

  const status = run('openclaw', ['status', '--deep']);
  assert(status.status === 0, 'openclaw status --deep failed');

  const audit = run('openclaw', ['security', 'audit']);
  assert(audit.status === 0, 'openclaw security audit failed');

  const statusText = status.stdout;
  const auditText = audit.stdout;

  const criticalMatch = auditText.match(/Summary:\s*(\d+)\s*critical\s*·\s*(\d+)\s*warn/i);
  assert(criticalMatch, 'security audit summary missing');

  const taskMatch = statusText.match(/Tasks\s*│\s*(\d+)\s*active\s*·\s*(\d+)\s*queued\s*·\s*(\d+)\s*running/i);
  assert(taskMatch, 'task status summary missing');

  const readiness = {
    readiness_id: 'openclaw_pre_live_readiness_job_20260519115852_b784842d_v8_3',
    source_job_id: 'job_20260519115852_b784842d',
    source_execution_package_tag: 'han-agent-bus-v8.3-controlled-noop-live-adapter-ping-execution-package',
    readiness_mode: 'openclaw_pre_live_readiness_only',
    readiness_status: 'conditional_pass_noop_only',
    openclaw_cli_present: true,
    gateway_loopback: /127\.0\.0\.1:18789/.test(statusText),
    gateway_reachable: /Gateway\s*│\s*local.*reachable/i.test(statusText) || /Gateway\s+reachable/i.test(statusText),
    tailscale_exposure_off: /Tailscale exposure\s*│\s*off/i.test(statusText),
    gateway_service_running: /Gateway service\s*│.*running/i.test(statusText),
    tasks_active: Number(taskMatch[1]),
    tasks_queued: Number(taskMatch[2]),
    tasks_running: Number(taskMatch[3]),
    security_critical_count: Number(criticalMatch[1]),
    security_warn_count: Number(criticalMatch[2]),
    warnings_accepted_for_noop_only: true,
    target: 'openclaw',
    agent: 'planner',
    live_tool: 'openclaw_send_task_live',
    operation_type: 'no_op_ping',
    live_call_performed: false,
    noop_ping_performed: false,
    final_live_receipt_materialized: false,
    credential_persistence_allowed: false,
    browser_session_persistence_allowed: false,
    cookie_persistence_allowed: false,
    api_key_persistence_allowed: false,
    created_at: '2026-05-20T10:05:00.000Z',
    safety_boundary: 'v8.3 pre-live readiness checks OpenClaw environment only. It does not perform the ping, call live tools, materialize a final live receipt, or persist credentials.'
  };

  return readiness;
}

function validateReadiness(r) {
  assert(r && typeof r === 'object', 'readiness record is missing');
  assert(r.source_job_id === 'job_20260519115852_b784842d', 'source_job_id mismatch');
  assert(r.source_execution_package_tag === 'han-agent-bus-v8.3-controlled-noop-live-adapter-ping-execution-package', 'execution package tag mismatch');
  assert(r.readiness_mode === 'openclaw_pre_live_readiness_only', 'readiness mode mismatch');
  assert(r.readiness_status === 'conditional_pass_noop_only', 'readiness status mismatch');
  assert(r.openclaw_cli_present === true, 'openclaw CLI must be present');
  assert(r.gateway_loopback === true, 'gateway must be loopback');
  assert(r.gateway_reachable === true, 'gateway must be reachable');
  assert(r.tailscale_exposure_off === true, 'tailscale exposure must be off');
  assert(r.gateway_service_running === true, 'gateway service must be running');
  assert(r.tasks_active === 0, 'active tasks must be 0');
  assert(r.tasks_queued === 0, 'queued tasks must be 0');
  assert(r.tasks_running === 0, 'running tasks must be 0');
  assert(r.security_critical_count === 0, 'security critical count must be 0');
  assert(r.warnings_accepted_for_noop_only === true, 'warnings must be accepted only for noop boundary');
  assert(r.target === 'openclaw', 'target mismatch');
  assert(r.agent === 'planner', 'agent mismatch');
  assert(r.live_tool === 'openclaw_send_task_live', 'live tool mismatch');
  assert(r.operation_type === 'no_op_ping', 'operation type mismatch');
  assert(r.live_call_performed === false, 'live call must not be performed by readiness');
  assert(r.noop_ping_performed === false, 'noop ping must not be performed by readiness');
  assert(r.final_live_receipt_materialized === false, 'final live receipt must not be materialized by readiness');
  assert(r.credential_persistence_allowed === false, 'credential persistence must be false');
  assert(r.browser_session_persistence_allowed === false, 'browser session persistence must be false');
  assert(r.cookie_persistence_allowed === false, 'cookie persistence must be false');
  assert(r.api_key_persistence_allowed === false, 'API key persistence must be false');
  assert(String(r.safety_boundary).includes('does not perform the ping'), 'safety boundary must deny ping');
  assert(String(r.safety_boundary).includes('call live tools'), 'safety boundary must deny live tool calls');
  assert(String(r.safety_boundary).includes('materialize a final live receipt'), 'safety boundary must deny final receipt');
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

const validReadiness = collectOpenClawReadiness();

const checks = [
  expectPass('valid OpenClaw pre-live readiness passes', () => {
    validateReadiness(validReadiness);
  }),
  expectReject('missing readiness is rejected', () => {
    validateReadiness(null);
  }),
  expectReject('security critical issue is rejected', () => {
    validateReadiness({ ...validReadiness, security_critical_count: 1 });
  }),
  expectReject('non-loopback gateway is rejected', () => {
    validateReadiness({ ...validReadiness, gateway_loopback: false });
  }),
  expectReject('tailscale exposure on is rejected', () => {
    validateReadiness({ ...validReadiness, tailscale_exposure_off: false });
  }),
  expectReject('active tasks are rejected', () => {
    validateReadiness({ ...validReadiness, tasks_active: 1 });
  }),
  expectReject('queued tasks are rejected', () => {
    validateReadiness({ ...validReadiness, tasks_queued: 1 });
  }),
  expectReject('running tasks are rejected', () => {
    validateReadiness({ ...validReadiness, tasks_running: 1 });
  }),
  expectReject('live call performed is rejected', () => {
    validateReadiness({ ...validReadiness, live_call_performed: true });
  }),
  expectReject('noop ping performed is rejected', () => {
    validateReadiness({ ...validReadiness, noop_ping_performed: true });
  }),
  expectReject('final live receipt materialized is rejected', () => {
    validateReadiness({ ...validReadiness, final_live_receipt_materialized: true });
  }),
  expectReject('credential persistence allowed is rejected', () => {
    validateReadiness({ ...validReadiness, credential_persistence_allowed: true });
  })
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v8.3-openclaw-pre-live-readiness',
  verdict,
  source_job_id: validReadiness.source_job_id,
  readiness_id: validReadiness.readiness_id,
  readiness_mode: validReadiness.readiness_mode,
  readiness_status: validReadiness.readiness_status,
  gateway_loopback: validReadiness.gateway_loopback,
  gateway_reachable: validReadiness.gateway_reachable,
  tailscale_exposure_off: validReadiness.tailscale_exposure_off,
  gateway_service_running: validReadiness.gateway_service_running,
  tasks_active: validReadiness.tasks_active,
  tasks_queued: validReadiness.tasks_queued,
  tasks_running: validReadiness.tasks_running,
  security_critical_count: validReadiness.security_critical_count,
  security_warn_count: validReadiness.security_warn_count,
  warnings_accepted_for_noop_only: validReadiness.warnings_accepted_for_noop_only,
  target: validReadiness.target,
  agent: validReadiness.agent,
  live_tool: validReadiness.live_tool,
  operation_type: validReadiness.operation_type,
  live_call_performed: validReadiness.live_call_performed,
  noop_ping_performed: validReadiness.noop_ping_performed,
  final_live_receipt_materialized: validReadiness.final_live_receipt_materialized,
  no_live_execution_tool_called: true,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
