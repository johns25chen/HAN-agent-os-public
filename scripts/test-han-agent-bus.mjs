import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const serverPath = "/Volumes/ComfySSD/Desktop/HAN-agent-os/dist/mcp-server.js";

const client = new Client(
  {
    name: "han-agent-bus-test-client",
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

const tools = await client.listTools();
console.log("TOOLS:");
console.log(JSON.stringify(tools.tools.map((t) => t.name), null, 2));

const result = await client.callTool({
  name: "codex_run",
  arguments: {
    cwd: "/Volumes/ComfySSD/Desktop/HAN-agent-os",
    prompt: "Dry run test only. Do not modify files.",
    dry_run: true
  }
});

console.log("CODEX_RUN_DRYRUN_RESULT:");
console.log(JSON.stringify(result, null, 2));

await client.close();
