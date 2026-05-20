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
  assert(tagExists('han-agent-bus-v8.3-planner-agent-command-discovery'), 'missing planner command discovery tag');
  assert(tagExists('han-agent-bus-v8.3-planner-agent-command-discovery-verification'), 'missing planner command discovery verification tag');
}

function collectCreationState() {
  validateBaselineTags();

  const listJson = run('openclaw', ['agents', 'list', '--json']);
  assert(listJson.status === 0, 'openclaw agents list --json failed');

  let agents;
  try {
    agents = JSON.parse(listJson.stdout);
  } catch {
    throw new Error('openclaw agents list --json did not return valid JSON');
  }

  const planner = agents.find((agent) => agent.id === 'planner');

  const record = {
    creation_id: 'planner_agent_creation_job_20260519115852_b784842d_v8_3',
    source_job_id: 'job_20260519115852_b784842d',
    source_command_discovery_tag: 'han-agent-bus-v8.3-planner-agent-command-discovery',
    creation_status: 'planner_agent_created_no_live_ping',
    planner_agent_created: Boolean(planner),
    planner_agent_id: planner?.id || null,
    planner_workspace_actual: planner?.workspace || null,
    planner_agent_dir_actual: planner?.agentDir || null,
    planner_model_actual: planner?.model || null,
    planner_bindings_actual: planner?.bindings ?? null,
    planner_is_default_actual: planner?.isDefault ?? null,
    planner_workspace_expected: '/Users/han/.openclaw/workspace/agents/planner',
    planner_agent_dir_expected: '/Users/han/.openclaw/agents/planner/agent',
    planner_model_expected: 'openai/gpt-5.5',
    planner_bindings_expected: 0,
    planner_is_default_expected: false,
    live_call_performed: false,
    noop_ping_performed: false,
    final_live_receipt_materialized: false,
    v8_3_stable_allowed: false,
    created_at: '2026-05-20T10:50:00.000Z',
    safety_boundary: 'v8.3 planner agent creation verifies agent creation only. It does not perform no-op ping, call live tools, materialize final live receipt, or allow v8.3 stable.'
  };

  return record;
}

function validateCreation(record) {
  assert(record && typeof record === 'object', 'creation record is missing');
  assert(record.source_job_id === 'job_20260519115852_b784842d', 'source_job_id mismatch');
  assert(record.source_command_discovery_tag === 'han-agent-bus-v8.3-planner-agent-command-discovery', 'source discovery tag mismatch');
  assert(record.creation_status === 'planner_agent_created_no_live_ping', 'creation status mismatch');
  assert(record.planner_agent_created === true, 'planner agent must be created');
  assert(record.planner_agent_id === 'planner', 'planner agent id mismatch');
  assert(record.planner_workspace_actual === record.planner_workspace_expected, 'planner workspace mismatch');
  assert(record.planner_agent_dir_actual === record.planner_agent_dir_expected, 'planner agent dir mismatch');
  assert(record.planner_model_actual === record.planner_model_expected, 'planner model mismatch');
  assert(record.planner_bindings_actual === record.planner_bindings_expected, 'planner bindings must be 0');
  assert(record.planner_is_default_actual === record.planner_is_default_expected, 'planner must not be default');
  assert(record.live_call_performed === false, 'live call must not be performed');
  assert(record.noop_ping_performed === false, 'noop ping must not be performed');
  assert(record.final_live_receipt_materialized === false, 'final live receipt must not be materialized');
  assert(record.v8_3_stable_allowed === false, 'v8.3 stable must not be allowed');
  assert(String(record.safety_boundary).includes('does not perform no-op ping'), 'safety boundary must deny no-op ping');
  assert(String(record.safety_boundary).includes('call live tools'), 'safety boundary must deny live tools');
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

const validRecord = collectCreationState();

const checks = [
  expectPass('valid planner agent creation passes', () => validateCreation(validRecord)),
  expectReject('missing creation record is rejected', () => validateCreation(null)),
  expectReject('planner not created is rejected', () => validateCreation({ ...validRecord, planner_agent_created: false })),
  expectReject('wrong planner id is rejected', () => validateCreation({ ...validRecord, planner_agent_id: 'main' })),
  expectReject('wrong model is rejected', () => validateCreation({ ...validRecord, planner_model_actual: 'custom-local' })),
  expectReject('routing binding is rejected', () => validateCreation({ ...validRecord, planner_bindings_actual: 1 })),
  expectReject('planner default is rejected', () => validateCreation({ ...validRecord, planner_is_default_actual: true })),
  expectReject('live call performed is rejected', () => validateCreation({ ...validRecord, live_call_performed: true })),
  expectReject('noop ping performed is rejected', () => validateCreation({ ...validRecord, noop_ping_performed: true })),
  expectReject('final live receipt materialized is rejected', () => validateCreation({ ...validRecord, final_live_receipt_materialized: true })),
  expectReject('v8.3 stable allowed is rejected', () => validateCreation({ ...validRecord, v8_3_stable_allowed: true }))
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v8.3-planner-agent-creation',
  verdict,
  source_job_id: validRecord.source_job_id,
  creation_id: validRecord.creation_id,
  creation_status: validRecord.creation_status,
  planner_agent_created: validRecord.planner_agent_created,
  planner_agent_id: validRecord.planner_agent_id,
  planner_workspace_actual: validRecord.planner_workspace_actual,
  planner_agent_dir_actual: validRecord.planner_agent_dir_actual,
  planner_model_actual: validRecord.planner_model_actual,
  planner_bindings_actual: validRecord.planner_bindings_actual,
  planner_is_default_actual: validRecord.planner_is_default_actual,
  live_call_performed: validRecord.live_call_performed,
  noop_ping_performed: validRecord.noop_ping_performed,
  final_live_receipt_materialized: validRecord.final_live_receipt_materialized,
  v8_3_stable_allowed: validRecord.v8_3_stable_allowed,
  no_live_execution_tool_called: true,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
