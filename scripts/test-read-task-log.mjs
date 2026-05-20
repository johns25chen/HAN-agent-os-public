import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const serverPath = "/Volumes/ComfySSD/Desktop/HAN-agent-os/dist/mcp-server.js";
const jobId = "job_20260514045524_5394a3ed";

const client = new Client(
  {
    name: "han-agent-bus-read-log-test-client",
    version: "1.0.0"
  },
  {
    capabilities: {}
  }
);

const transport = new StdioClientTransport({
  command: "node",
  args: [serverPath]
});

await client.connect(transport);

const result = await client.callTool({
  name: "read_task_log",
  arguments: {
    job_id: jobId
  }
});

console.log("READ_TASK_LOG_RESULT:");
console.log(JSON.stringify(result, null, 2));

await client.close();
