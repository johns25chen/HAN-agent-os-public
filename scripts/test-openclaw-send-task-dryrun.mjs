import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const serverPath = '/Volumes/ComfySSD/Desktop/HAN-agent-os/dist/mcp-server.js';

const client = new Client(
  {
    name: 'han-agent-bus-openclaw-send-task-dryrun-test-client',
    version: '1.0.0',
  },
  {
    capabilities: {},
  },
);

const transport = new StdioClientTransport({
  command: 'node',
  args: [serverPath],
});

await client.connect(transport);

try {
  const result = await client.callTool({
    name: 'openclaw_send_task_dryrun',
    arguments: {
      agent: 'planner',
      task: 'Draft a local implementation plan for the Han Agent Bus README.',
      risk_level: 'low',
    },
  });

  const text = result.content?.find((item) => item.type === 'text')?.text;
  const payload = text ? JSON.parse(text) : result;

  console.log(`job_id: ${payload.job_id}`);
  console.log(`status: ${payload.status}`);
  console.log(`approval_required: ${payload.approval_required}`);
  console.log(`log_path: ${payload.log_path}`);
  console.log('task_json:');
  console.log(JSON.stringify(payload.task_json, null, 2));

  if (payload.status !== 'dry_run') {
    throw new Error(`Expected dry_run status, got ${payload.status}`);
  }

  if (payload.approval_required !== true) {
    throw new Error('Expected approval_required to default to true');
  }

  const taskJsonPath = path.join(payload.log_path, 'openclaw_task.json');
  await access(taskJsonPath);

  const [taskJson, request, stdout, stderr] = await Promise.all([
    readFile(taskJsonPath, 'utf8').then(JSON.parse),
    readFile(path.join(payload.log_path, 'request.json'), 'utf8').then(JSON.parse),
    readFile(path.join(payload.log_path, 'stdout.log'), 'utf8'),
    readFile(path.join(payload.log_path, 'stderr.log'), 'utf8'),
  ]);

  console.log('files_written: openclaw_task.json request.json stdout.log stderr.log');

  if (taskJson.target !== 'openclaw' || taskJson.task_id !== payload.job_id) {
    throw new Error('openclaw_task.json did not contain the expected target/task_id');
  }

  if (request.status !== 'dry_run' || request.tool !== 'openclaw_send_task_dryrun') {
    throw new Error('request.json did not contain the expected dry-run request metadata');
  }

  if (!stdout.includes('"target": "openclaw"') || stderr !== '') {
    throw new Error('stdout.log/stderr.log contents were not as expected');
  }

  const allowedGuardrails = [
    'Do not run git push.',
    'Do not git push.',
    'Do not send messages.',
    'Do not modify files.',
    'Do not delete files.',
    'Never git push.',
    'Never send messages.',
    '不要 git push',
    '不要删除文件',
    '禁止 git push',
    'Draft a safe local implementation plan for checking OpenClaw status only. Do not send messages. Do not modify files. Do not run git push.',
  ];

  for (const task of allowedGuardrails) {
    const guardrailResult = await client.callTool({
      name: 'openclaw_send_task_dryrun',
      arguments: {
        agent: 'planner',
        task,
        risk_level: 'low',
      },
    });

    const guardrailText = guardrailResult.content?.find((item) => item.type === 'text')?.text;
    const guardrailPayload = guardrailText ? JSON.parse(guardrailText) : guardrailResult;

    console.log(`guardrail_status: ${guardrailPayload.status} task=${JSON.stringify(task)}`);

    if (guardrailPayload.status !== 'dry_run') {
      throw new Error(`Expected negated guardrail to pass, got ${guardrailPayload.status} for task: ${task}`);
    }
  }

  const rejectedTasks = [
    'git push',
    'please git push now',
    'run git push',
    'send private message',
    'send messages to users',
    'delete files',
    'remove files',
    'read token',
    'read .env',
    'read ~/.ssh',
    'payment',
    'transfer money',
  ];

  for (const task of rejectedTasks) {
    const rejectedResult = await client.callTool({
      name: 'openclaw_send_task_dryrun',
      arguments: {
        agent: 'planner',
        task,
        risk_level: 'high',
        require_approval: false,
      },
    });

    const rejectedText = rejectedResult.content?.find((item) => item.type === 'text')?.text;
    const rejectedPayload = rejectedText ? JSON.parse(rejectedText) : rejectedResult;

    console.log(`rejected_status: ${rejectedPayload.status} task=${JSON.stringify(task)}`);
    console.log(`rejected_approval_required: ${rejectedPayload.approval_required}`);
    console.log(`rejected_message: ${rejectedPayload.message}`);

    if (rejectedPayload.status !== 'rejected') {
      throw new Error(`Expected rejected status, got ${rejectedPayload.status} for task: ${task}`);
    }

    if (rejectedPayload.approval_required !== true) {
      throw new Error('Expected high risk tasks to force approval_required=true');
    }
  }
} finally {
  await client.close();
}
