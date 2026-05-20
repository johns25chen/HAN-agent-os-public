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
  assert(tagExists('han-agent-bus-v8.3-openclaw-pre-live-readiness'), 'missing v8.3 pre-live readiness tag');
  assert(tagExists('han-agent-bus-v8.3-controlled-noop-live-adapter-ping-execution-package'), 'missing v8.3 execution package tag');
}

function collectMappingState() {
  validateBaselineTags();

  const agentHelp = run('openclaw', ['agent', '--help']);
  assert(agentHelp.status === 0, 'openclaw agent help failed');

  const agentsJson = run('openclaw', ['agents', 'list', '--json']);
  assert(agentsJson.status === 0, 'openclaw agents list --json failed');

  let agents;
  try {
    agents = JSON.parse(agentsJson.stdout);
  } catch {
    throw new Error('openclaw agents list --json did not return valid JSON');
  }

  const agentIds = agents.map((agent) => agent.id);
  const plannerPresent = agentIds.includes('planner');

  const helpText = [
    agentHelp.stdout,
    run('openclaw', ['--help']).stdout,
    run('openclaw', ['agents', '--help']).stdout
  ].join('\n');

  const blocker = {
    blocker_id: 'command_mapping_blocker_job_20260519115852_b784842d_v8_3',
    source_job_id: 'job_20260519115852_b784842d',
    source_readiness_tag: 'han-agent-bus-v8.3-openclaw-pre-live-readiness',
    blocker_mode: 'command_mapping_blocker_only',
    blocker_status: 'blocked_missing_planner_agent_and_live_tool_mapping',
    target: 'openclaw',
    required_agent: 'planner',
    required_live_tool: 'openclaw_send_task_live',
    operation_type: 'no_op_ping',
    openclaw_agent_command_present: /Usage:\s*openclaw agent/.test(agentHelp.stdout),
    planner_agent_present: plannerPresent,
    openclaw_send_task_live_cli_command_present: /openclaw_send_task_live/.test(helpText),
    exact_command_mapping_available: false,
    live_ping_authorized: false,
    live_call_performed: false,
    noop_ping_performed: false,
    final_live_receipt_materialized: false,
    v8_3_stable_allowed: false,
    available_agent_ids: agentIds,
    created_at: '2026-05-20T10:20:00.000Z',
    safety_boundary: 'v8.3 command mapping blocker prevents live ping because the required planner agent and openclaw_send_task_live command mapping are not verified.'
  };

  return blocker;
}

function validateBlocker(blocker) {
  assert(blocker && typeof blocker === 'object', 'blocker record is missing');
  assert(blocker.source_job_id === 'job_20260519115852_b784842d', 'source_job_id mismatch');
  assert(blocker.source_readiness_tag === 'han-agent-bus-v8.3-openclaw-pre-live-readiness', 'readiness tag mismatch');
  assert(blocker.blocker_mode === 'command_mapping_blocker_only', 'blocker mode mismatch');
  assert(blocker.blocker_status === 'blocked_missing_planner_agent_and_live_tool_mapping', 'blocker status mismatch');
  assert(blocker.target === 'openclaw', 'target mismatch');
  assert(blocker.required_agent === 'planner', 'required agent mismatch');
  assert(blocker.required_live_tool === 'openclaw_send_task_live', 'required live tool mismatch');
  assert(blocker.operation_type === 'no_op_ping', 'operation type mismatch');
  assert(blocker.openclaw_agent_command_present === true, 'openclaw agent command must be present');
  assert(blocker.planner_agent_present === false, 'planner agent must be absent for this blocker');
  assert(blocker.openclaw_send_task_live_cli_command_present === false, 'openclaw_send_task_live CLI command must be unverified');
  assert(blocker.exact_command_mapping_available === false, 'exact command mapping must be unavailable');
  assert(blocker.live_ping_authorized === false, 'live ping must not be authorized');
  assert(blocker.live_call_performed === false, 'live call must not be performed');
  assert(blocker.noop_ping_performed === false, 'noop ping must not be performed');
  assert(blocker.final_live_receipt_materialized === false, 'final live receipt must not be materialized');
  assert(blocker.v8_3_stable_allowed === false, 'v8.3 stable must not be allowed');
  assert(String(blocker.safety_boundary).includes('prevents live ping'), 'safety boundary must prevent live ping');
  assert(String(blocker.safety_boundary).includes('planner agent'), 'safety boundary must mention planner agent');
  assert(String(blocker.safety_boundary).includes('openclaw_send_task_live'), 'safety boundary must mention live tool mapping');
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

const validBlocker = collectMappingState();

const checks = [
  expectPass('valid v8.3 command mapping blocker passes', () => {
    validateBlocker(validBlocker);
  }),
  expectReject('missing blocker is rejected', () => {
    validateBlocker(null);
  }),
  expectReject('planner agent present invalidates blocker', () => {
    validateBlocker({ ...validBlocker, planner_agent_present: true });
  }),
  expectReject('live tool command present invalidates blocker', () => {
    validateBlocker({ ...validBlocker, openclaw_send_task_live_cli_command_present: true });
  }),
  expectReject('exact command mapping available invalidates blocker', () => {
    validateBlocker({ ...validBlocker, exact_command_mapping_available: true });
  }),
  expectReject('live ping authorized is rejected', () => {
    validateBlocker({ ...validBlocker, live_ping_authorized: true });
  }),
  expectReject('live call performed is rejected', () => {
    validateBlocker({ ...validBlocker, live_call_performed: true });
  }),
  expectReject('noop ping performed is rejected', () => {
    validateBlocker({ ...validBlocker, noop_ping_performed: true });
  }),
  expectReject('final live receipt materialized is rejected', () => {
    validateBlocker({ ...validBlocker, final_live_receipt_materialized: true });
  }),
  expectReject('v8.3 stable allowed is rejected', () => {
    validateBlocker({ ...validBlocker, v8_3_stable_allowed: true });
  })
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v8.3-command-mapping-blocker',
  verdict,
  source_job_id: validBlocker.source_job_id,
  blocker_id: validBlocker.blocker_id,
  blocker_status: validBlocker.blocker_status,
  target: validBlocker.target,
  required_agent: validBlocker.required_agent,
  required_live_tool: validBlocker.required_live_tool,
  operation_type: validBlocker.operation_type,
  openclaw_agent_command_present: validBlocker.openclaw_agent_command_present,
  planner_agent_present: validBlocker.planner_agent_present,
  openclaw_send_task_live_cli_command_present: validBlocker.openclaw_send_task_live_cli_command_present,
  exact_command_mapping_available: validBlocker.exact_command_mapping_available,
  live_ping_authorized: validBlocker.live_ping_authorized,
  live_call_performed: validBlocker.live_call_performed,
  noop_ping_performed: validBlocker.noop_ping_performed,
  final_live_receipt_materialized: validBlocker.final_live_receipt_materialized,
  v8_3_stable_allowed: validBlocker.v8_3_stable_allowed,
  available_agent_ids: validBlocker.available_agent_ids,
  no_live_execution_tool_called: true,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
