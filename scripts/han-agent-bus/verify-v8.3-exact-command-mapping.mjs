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
  assert(tagExists('han-agent-bus-v8.3-planner-agent-creation'), 'missing planner creation tag');
  assert(tagExists('han-agent-bus-v8.3-planner-agent-creation-verification'), 'missing planner creation verification tag');
  assert(tagExists('han-agent-bus-v8.3-controlled-noop-live-adapter-ping-execution-package'), 'missing execution package tag');
}

function collectMapping() {
  validateBaselineTags();

  const agentHelp = run('openclaw', ['agent', '--help']);
  assert(agentHelp.status === 0, 'openclaw agent --help failed');
  assert(/--agent/.test(agentHelp.stdout), 'openclaw agent help missing --agent');
  assert(/--message/.test(agentHelp.stdout), 'openclaw agent help missing --message');
  assert(/--json/.test(agentHelp.stdout), 'openclaw agent help missing --json');

  const listJson = run('openclaw', ['agents', 'list', '--json']);
  assert(listJson.status === 0, 'openclaw agents list --json failed');

  let agents;
  try {
    agents = JSON.parse(listJson.stdout);
  } catch {
    throw new Error('agents list JSON parse failed');
  }

  const planner = agents.find((agent) => agent.id === 'planner');

  const exactMessage = 'HAN_AGENT_BUS_V8_3_NOOP_LIVE_ADAPTER_PING source_job_id=job_20260519115852_b784842d target=openclaw agent=planner operation=no_op_ping execution_count=1 exact_scope=true single_use=true no_credentials=true no_browser_session=true no_cookies=true no_api_keys=true';

  return {
    mapping_id: 'exact_command_mapping_job_20260519115852_b784842d_v8_3',
    source_job_id: 'job_20260519115852_b784842d',
    source_planner_creation_tag: 'han-agent-bus-v8.3-planner-agent-creation',
    mapping_status: 'exact_mapping_verified_no_ping',
    target: 'openclaw',
    agent: 'planner',
    abstract_live_tool: 'openclaw_send_task_live',
    concrete_command_shape: 'openclaw agent --agent planner --message "<exact no-op ping message>" --json',
    operation_type: 'no_op_ping',
    exact_noop_message: exactMessage,
    planner_agent_exists: Boolean(planner),
    planner_model: planner?.model || null,
    planner_bindings: planner?.bindings ?? null,
    planner_is_default: planner?.isDefault ?? null,
    execution_count_allowed: 1,
    execution_count_performed: 0,
    exact_scope_enforced: true,
    single_use_required: true,
    live_call_performed: false,
    noop_ping_performed: false,
    final_live_receipt_materialized: false,
    v8_3_stable_allowed: false,
    created_at: '2026-05-20T11:05:00.000Z',
    safety_boundary: 'v8.3 exact command mapping verifies command shape only. It does not execute no-op ping, call live tools, materialize final live receipt, or allow v8.3 stable.'
  };
}

function validateMapping(m) {
  assert(m && typeof m === 'object', 'mapping record is missing');
  assert(m.source_job_id === 'job_20260519115852_b784842d', 'source_job_id mismatch');
  assert(m.source_planner_creation_tag === 'han-agent-bus-v8.3-planner-agent-creation', 'planner creation tag mismatch');
  assert(m.mapping_status === 'exact_mapping_verified_no_ping', 'mapping status mismatch');
  assert(m.target === 'openclaw', 'target mismatch');
  assert(m.agent === 'planner', 'agent mismatch');
  assert(m.abstract_live_tool === 'openclaw_send_task_live', 'abstract live tool mismatch');
  assert(m.concrete_command_shape.includes('openclaw agent --agent planner'), 'concrete command must target planner');
  assert(m.concrete_command_shape.includes('--message'), 'concrete command must include message');
  assert(m.concrete_command_shape.includes('--json'), 'concrete command must include json');
  assert(m.operation_type === 'no_op_ping', 'operation type mismatch');
  assert(m.exact_noop_message.includes('source_job_id=job_20260519115852_b784842d'), 'exact message missing source job');
  assert(m.exact_noop_message.includes('agent=planner'), 'exact message missing planner');
  assert(m.exact_noop_message.includes('operation=no_op_ping'), 'exact message missing no_op_ping');
  assert(m.planner_agent_exists === true, 'planner agent must exist');
  assert(m.planner_model === 'openai/gpt-5.5', 'planner model mismatch');
  assert(m.planner_bindings === 0, 'planner bindings must be 0');
  assert(m.planner_is_default === false, 'planner must not be default');
  assert(m.execution_count_allowed === 1, 'execution count allowed must be 1');
  assert(m.execution_count_performed === 0, 'execution count performed must be 0');
  assert(m.exact_scope_enforced === true, 'exact scope must be enforced');
  assert(m.single_use_required === true, 'single-use must be required');
  assert(m.live_call_performed === false, 'live call must not be performed');
  assert(m.noop_ping_performed === false, 'noop ping must not be performed');
  assert(m.final_live_receipt_materialized === false, 'final live receipt must not be materialized');
  assert(m.v8_3_stable_allowed === false, 'v8.3 stable must not be allowed');
  assert(String(m.safety_boundary).includes('does not execute no-op ping'), 'safety boundary must deny ping');
  assert(String(m.safety_boundary).includes('call live tools'), 'safety boundary must deny live tools');
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

const validMapping = collectMapping();

const checks = [
  expectPass('valid exact command mapping passes', () => validateMapping(validMapping)),
  expectReject('missing mapping is rejected', () => validateMapping(null)),
  expectReject('wrong agent is rejected', () => validateMapping({ ...validMapping, agent: 'main' })),
  expectReject('wrong abstract live tool is rejected', () => validateMapping({ ...validMapping, abstract_live_tool: 'shell_exec' })),
  expectReject('missing planner command shape is rejected', () => validateMapping({ ...validMapping, concrete_command_shape: 'openclaw agent --agent main --message x --json' })),
  expectReject('planner missing is rejected', () => validateMapping({ ...validMapping, planner_agent_exists: false })),
  expectReject('planner model mismatch is rejected', () => validateMapping({ ...validMapping, planner_model: 'custom-local' })),
  expectReject('planner bindings are rejected', () => validateMapping({ ...validMapping, planner_bindings: 1 })),
  expectReject('planner default is rejected', () => validateMapping({ ...validMapping, planner_is_default: true })),
  expectReject('execution count already performed is rejected', () => validateMapping({ ...validMapping, execution_count_performed: 1 })),
  expectReject('live call performed is rejected', () => validateMapping({ ...validMapping, live_call_performed: true })),
  expectReject('noop ping performed is rejected', () => validateMapping({ ...validMapping, noop_ping_performed: true })),
  expectReject('final live receipt materialized is rejected', () => validateMapping({ ...validMapping, final_live_receipt_materialized: true })),
  expectReject('v8.3 stable allowed is rejected', () => validateMapping({ ...validMapping, v8_3_stable_allowed: true }))
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v8.3-exact-command-mapping',
  verdict,
  source_job_id: validMapping.source_job_id,
  mapping_id: validMapping.mapping_id,
  mapping_status: validMapping.mapping_status,
  target: validMapping.target,
  agent: validMapping.agent,
  abstract_live_tool: validMapping.abstract_live_tool,
  concrete_command_shape: validMapping.concrete_command_shape,
  operation_type: validMapping.operation_type,
  planner_agent_exists: validMapping.planner_agent_exists,
  planner_model: validMapping.planner_model,
  planner_bindings: validMapping.planner_bindings,
  planner_is_default: validMapping.planner_is_default,
  execution_count_allowed: validMapping.execution_count_allowed,
  execution_count_performed: validMapping.execution_count_performed,
  live_call_performed: validMapping.live_call_performed,
  noop_ping_performed: validMapping.noop_ping_performed,
  final_live_receipt_materialized: validMapping.final_live_receipt_materialized,
  v8_3_stable_allowed: validMapping.v8_3_stable_allowed,
  no_live_execution_tool_called: true,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
