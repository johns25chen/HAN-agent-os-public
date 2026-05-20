import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const serverPath = '/Volumes/ComfySSD/Desktop/HAN-agent-os/dist/mcp-server.js';
const cwd = '/Volumes/ComfySSD/Desktop/HAN-agent-os';
const pollIntervalMs = 10_000;
const timeoutMs = 120_000;

const client = new Client(
  {
    name: 'han-agent-bus-codex-run-async-test-client',
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

let payload;
try {
  const result = await client.callTool({
    name: 'codex_run',
    arguments: {
      cwd,
      prompt: 'Say OK only.',
      async: true,
    },
  });

  const text = result.content?.find((item) => item.type === 'text')?.text;
  payload = text ? JSON.parse(text) : result;

  console.log(`job_id: ${payload.job_id}`);
  console.log(`status: ${payload.status}`);
  console.log(`log_path: ${payload.log_path}`);
} finally {
  await client.close();
}

if (!payload?.job_id || !payload?.log_path) {
  throw new Error('codex_run did not return job_id and log_path');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const tail = (value, maxChars = 4000) => (
  value.length <= maxChars ? value : value.slice(value.length - maxChars)
);

async function readRequest() {
  const raw = await readFile(path.join(payload.log_path, 'request.json'), 'utf8');
  return JSON.parse(raw);
}

const startedAt = Date.now();
let request = await readRequest();

while (Date.now() - startedAt < timeoutMs) {
  if (['completed', 'failed', 'timeout'].includes(request.status)) {
    break;
  }

  console.log(`waiting: status=${request.status}`);
  await sleep(pollIntervalMs);
  request = await readRequest();
}

if (!['completed', 'failed', 'timeout'].includes(request.status)) {
  request = { ...request, status: 'timeout' };
}

const [stdout, stderr] = await Promise.all([
  readFile(path.join(payload.log_path, 'stdout.log'), 'utf8').catch((error) => String(error)),
  readFile(path.join(payload.log_path, 'stderr.log'), 'utf8').catch((error) => String(error)),
]);

console.log(`final_status: ${request.status}`);
console.log(`exit_code: ${request.exit_code ?? 'null'}`);
console.log('stdout_tail:');
console.log(tail(stdout));
console.log('stderr_tail:');
console.log(tail(stderr));

if (request.status !== 'completed') {
  process.exitCode = 1;
}
