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
  assert(tagExists('han-agent-bus-v8.3-planner-agent-setup-plan'), 'missing planner agent setup plan tag');
  assert(tagExists('han-agent-bus-v8.3-command-mapping-resolution-decision'), 'missing command mapping resolution decision tag');
}

function collectDiscovery() {
  validateBaselineTags();

  const addHelp = run('openclaw', ['agents', 'add', '--help']);
  assert(addHelp.status === 0, 'openclaw agents add --help failed');

  const identityHelp = run('openclaw', ['agents', 'set-identity', '--help']);
  assert(identityHelp.status === 0, 'openclaw agents set-identity --help failed');

  const listJson = run('openclaw', ['agents', 'list', '--json']);
  assert(listJson.status === 0, 'openclaw agents list --json failed');

  let agents;
  try {
    agents = JSON.parse(listJson.stdout);
  } catch {
    throw new Error('openclaw agents list --json did not return valid JSON');
  }

  const agentIds = agents.map((agent) => agent.id);
  const addText = addHelp.stdout;
  const identityText = identityHelp.stdout;

  return {
    discovery_id: 'planner_agent_command_discovery_job_20260519115852_b784842d_v8_3',
    source_job_id: 'job_20260519115852_b784842d',
    source_setup_plan_tag: 'han-agent-bus-v8.3-planner-agent-setup-plan',
    discovery_mode: 'planner_agent_command_discovery_only',
    discovery_status: 'discovery_pass_planner_absent',
    agents_add_command_present: /Usage:\s*openclaw agents add/.test(addText),
    agents_add_non_interactive_supported: /--non-interactive/.test(addText),
    agents_add_workspace_supported: /--workspace/.test(addText),
    agents_add_agent_dir_supported: /--agent-dir/.test(addText),
    agents_add_model_supported: /--model/.test(addText),
    agents_add_json_supported: /--json/.test(addText),
    agents_set_identity_present: /Usage:\s*openclaw agents set-identity/.test(identityText),
    agents_list_json_supported: true,
    planner_agent_present_before_creation: agentIds.includes('planner'),
    planned_agent_id: 'planner',
    planned_workspace: '~/.openclaw/workspace/agents/planner',
    planned_agent_dir: '~/.openclaw/agents/planner/agent',
    planned_model: 'openai/gpt-5.5',
    planned_creation_command: 'openclaw agents add planner --non-interactive --workspace ~/.openclaw/workspace/agents/planner --agent-dir ~/.openclaw/agents/planner/agent --model openai/gpt-5.5 --json',
    planned_identity_command: 'openclaw agents set-identity --agent planner --name "Planner" --emoji "🧭" --json',
    planner_agent_created: false,
    live_call_performed: false,
    noop_ping_performed: false,
    final_live_receipt_materialized: false,
    v8_3_stable_allowed: false,
    available_agent_ids: agentIds,
    created_at: '2026-05-20T10:35:00.000Z',
    safety_boundary: 'v8.3 planner agent command discovery records command shape only. It does not create the planner agent, perform the no-op ping, call live tools, or materialize a final live receipt.'
  };
}

function validateDiscovery(d) {
  assert(d && typeof d === 'object', 'discovery record is missing');
  assert(d.source_job_id === 'job_20260519115852_b784842d', 'source_job_id mismatch');
  assert(d.source_setup_plan_tag === 'han-agent-bus-v8.3-planner-agent-setup-plan', 'setup plan tag mismatch');
  assert(d.discovery_mode === 'planner_agent_command_discovery_only', 'discovery mode mismatch');
  assert(d.discovery_status === 'discovery_pass_planner_absent', 'discovery status mismatch');
  assert(d.agents_add_command_present === true, 'agents add command must be present');
  assert(d.agents_add_non_interactive_supported === true, 'agents add --non-interactive must be supported');
  assert(d.agents_add_workspace_supported === true, 'agents add --workspace must be supported');
  assert(d.agents_add_agent_dir_supported === true, 'agents add --agent-dir must be supported');
  assert(d.agents_add_model_supported === true, 'agents add --model must be supported');
  assert(d.agents_add_json_supported === true, 'agents add --json must be supported');
  assert(d.agents_set_identity_present === true, 'agents set-identity must be present');
  assert(d.agents_list_json_supported === true, 'agents list --json must be supported');
  assert(d.planner_agent_present_before_creation === false, 'planner must be absent before creation');
  assert(d.planned_agent_id === 'planner', 'planned agent id mismatch');
  assert(d.planned_workspace === '~/.openclaw/workspace/agents/planner', 'planned workspace mismatch');
  assert(d.planned_agent_dir === '~/.openclaw/agents/planner/agent', 'planned agent dir mismatch');
  assert(d.planned_model === 'openai/gpt-5.5', 'planned model mismatch');
  assert(d.planned_creation_command.includes('openclaw agents add planner'), 'planned creation command must add planner');
  assert(d.planned_creation_command.includes('--non-interactive'), 'planned creation command must be non-interactive');
  assert(d.planned_creation_command.includes('--json'), 'planned creation command must output JSON');
  assert(d.planned_identity_command.includes('openclaw agents set-identity'), 'planned identity command mismatch');
  assert(d.planner_agent_created === false, 'planner agent must not be created by discovery');
  assert(d.live_call_performed === false, 'live call must not be performed by discovery');
  assert(d.noop_ping_performed === false, 'noop ping must not be performed by discovery');
  assert(d.final_live_receipt_materialized === false, 'final live receipt must not be materialized by discovery');
  assert(d.v8_3_stable_allowed === false, 'v8.3 stable must not be allowed');
  assert(String(d.safety_boundary).includes('does not create the planner agent'), 'safety boundary must deny planner creation');
  assert(String(d.safety_boundary).includes('perform the no-op ping'), 'safety boundary must deny ping');
  assert(String(d.safety_boundary).includes('call live tools'), 'safety boundary must deny live tools');
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

const validDiscovery = collectDiscovery();

const checks = [
  expectPass('valid planner agent command discovery passes', () => validateDiscovery(validDiscovery)),
  expectReject('missing discovery is rejected', () => validateDiscovery(null)),
  expectReject('missing agents add command is rejected', () => validateDiscovery({ ...validDiscovery, agents_add_command_present: false })),
  expectReject('planner already present is rejected for pre-creation discovery', () => validateDiscovery({ ...validDiscovery, planner_agent_present_before_creation: true })),
  expectReject('planned agent id other than planner is rejected', () => validateDiscovery({ ...validDiscovery, planned_agent_id: 'main' })),
  expectReject('planned model mismatch is rejected', () => validateDiscovery({ ...validDiscovery, planned_model: 'custom-local' })),
  expectReject('planner agent already created is rejected', () => validateDiscovery({ ...validDiscovery, planner_agent_created: true })),
  expectReject('live call performed is rejected', () => validateDiscovery({ ...validDiscovery, live_call_performed: true })),
  expectReject('noop ping performed is rejected', () => validateDiscovery({ ...validDiscovery, noop_ping_performed: true })),
  expectReject('final live receipt materialized is rejected', () => validateDiscovery({ ...validDiscovery, final_live_receipt_materialized: true })),
  expectReject('v8.3 stable allowed is rejected', () => validateDiscovery({ ...validDiscovery, v8_3_stable_allowed: true }))
];

const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL';

const result = {
  version: 'han-agent-bus-v8.3-planner-agent-command-discovery',
  verdict,
  source_job_id: validDiscovery.source_job_id,
  discovery_id: validDiscovery.discovery_id,
  discovery_status: validDiscovery.discovery_status,
  agents_add_command_present: validDiscovery.agents_add_command_present,
  agents_add_non_interactive_supported: validDiscovery.agents_add_non_interactive_supported,
  agents_add_workspace_supported: validDiscovery.agents_add_workspace_supported,
  agents_add_agent_dir_supported: validDiscovery.agents_add_agent_dir_supported,
  agents_add_model_supported: validDiscovery.agents_add_model_supported,
  agents_add_json_supported: validDiscovery.agents_add_json_supported,
  agents_set_identity_present: validDiscovery.agents_set_identity_present,
  agents_list_json_supported: validDiscovery.agents_list_json_supported,
  planner_agent_present_before_creation: validDiscovery.planner_agent_present_before_creation,
  planned_agent_id: validDiscovery.planned_agent_id,
  planned_workspace: validDiscovery.planned_workspace,
  planned_agent_dir: validDiscovery.planned_agent_dir,
  planned_model: validDiscovery.planned_model,
  planned_creation_command: validDiscovery.planned_creation_command,
  planned_identity_command: validDiscovery.planned_identity_command,
  planner_agent_created: validDiscovery.planner_agent_created,
  live_call_performed: validDiscovery.live_call_performed,
  noop_ping_performed: validDiscovery.noop_ping_performed,
  final_live_receipt_materialized: validDiscovery.final_live_receipt_materialized,
  v8_3_stable_allowed: validDiscovery.v8_3_stable_allowed,
  available_agent_ids: validDiscovery.available_agent_ids,
  no_live_execution_tool_called: true,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
