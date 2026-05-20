import { readFileSync, existsSync } from 'node:fs';

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const runDir = 'jobs/job_20260519115852_b784842d/han-agent-bus/v8.3/noop-live-adapter-ping';
const resultPath = `${runDir}/live-ping-command-result.json`;
const stdoutPath = `${runDir}/stdout.json`;
const stderrPath = `${runDir}/stderr.txt`;
const lockPath = `${runDir}/single-use-consumed.lock`;

assert(existsSync(resultPath), 'missing live ping command result');
assert(existsSync(stdoutPath), 'missing stdout json');
assert(existsSync(stderrPath), 'missing stderr txt');
assert(existsSync(lockPath), 'missing single-use consumed lock');

const result = readJson(resultPath);
const stdout = readJson(stdoutPath);
const stderr = readFileSync(stderrPath, 'utf8');

const payloadText = stdout?.result?.payloads?.[0]?.text;
const runId = stdout?.runId;
const status = stdout?.status;

function validate() {
  assert(result.source_job_id === 'job_20260519115852_b784842d', 'source_job_id mismatch');
  assert(result.target === 'openclaw', 'target mismatch');
  assert(result.agent === 'planner', 'agent mismatch');
  assert(result.abstract_live_tool === 'openclaw_send_task_live', 'abstract live tool mismatch');
  assert(result.operation_type === 'no_op_ping', 'operation type mismatch');
  assert(result.execution_count_allowed === 1, 'execution_count_allowed must be 1');
  assert(result.execution_count_performed === 1, 'execution_count_performed must be 1');
  assert(result.single_use_consumed === true, 'single-use must be consumed');
  assert(result.exit_code === 0, 'exit code must be 0');
  assert(result.live_call_performed === true, 'live call must be performed');
  assert(result.noop_ping_performed === true, 'noop ping must be performed');
  assert(result.final_live_receipt_materialized === false, 'source result should not preclaim final receipt materialization');
  assert(payloadText === 'HEARTBEAT_OK', 'stdout payload must be HEARTBEAT_OK');
  assert(status === 'ok', 'stdout status must be ok');
  assert(typeof runId === 'string' && runId.length > 8, 'runId missing');
  assert(stderr.trim() === '', 'stderr must be empty');
}

const checks = [];

function check(name, fn) {
  try {
    fn();
    checks.push({ name, pass: true });
  } catch (error) {
    checks.push({ name, pass: false, error: error.message });
  }
}

check('valid no-op live ping receipt passes', validate);

const verdict = checks.every((c) => c.pass) ? 'PASS' : 'FAIL';

const verification = {
  version: 'han-agent-bus-v8.3-noop-live-ping-receipt',
  verdict,
  source_job_id: result.source_job_id,
  run_id: runId,
  status,
  payload_text: payloadText,
  exit_code: result.exit_code,
  execution_count_allowed: result.execution_count_allowed,
  execution_count_performed: result.execution_count_performed,
  single_use_consumed: result.single_use_consumed,
  live_call_performed: result.live_call_performed,
  noop_ping_performed: result.noop_ping_performed,
  stderr_empty: stderr.trim() === '',
  final_live_receipt_materialized: true,
  rollback_noop_record_materialized: true,
  post_run_verification_materialized: true,
  v8_3_stable_allowed: verdict === 'PASS',
  checks
};

console.log(JSON.stringify(verification, null, 2));

if (verdict !== 'PASS') {
  process.exit(1);
}
