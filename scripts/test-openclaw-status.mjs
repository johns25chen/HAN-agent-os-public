import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const serverPath = '/Volumes/ComfySSD/Desktop/HAN-agent-os/dist/mcp-server.js';
const expectedJobsPrefix = '/Volumes/ComfySSD/Desktop/HAN-agent-os/jobs/';

const client = new Client(
  {
    name: 'han-agent-bus-openclaw-status-test-client',
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
  await printOpenClawStatus('default openclaw status', {});
  await printOpenClawStatus('probe openclaw gateway probe', { probe: true });
} finally {
  await client.close();
}

async function printOpenClawStatus(label, args) {
  const result = await client.callTool({
    name: 'openclaw_status',
    arguments: args,
  });
  const text = result.content?.find((item) => item.type === 'text')?.text;
  const payload = text ? JSON.parse(text) : result;

  console.log(`\n# ${label}`);
  console.log(`job_id: ${payload.job_id}`);
  console.log(`detected_dir: ${payload.detected_dir}`);
  console.log(`exit_code: ${payload.exit_code}`);
  console.log('stdout_tail:');
  console.log(payload.stdout_tail ?? '');
  console.log('stderr_tail:');
  console.log(payload.stderr_tail ?? '');
  console.log(`log_path: ${payload.log_path}`);

  if (!payload.log_path?.includes(expectedJobsPrefix)) {
    throw new Error(`Expected log_path to include ${expectedJobsPrefix}, got ${payload.log_path}`);
  }
}
