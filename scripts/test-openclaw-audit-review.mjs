import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const serverPath = '/Volumes/ComfySSD/Desktop/HAN-agent-os/dist/mcp-server.js';
const forbiddenFields = ['approval_phrase', 'stdout_tail', 'stdout', 'full stdout'];
const expectedFields = [
  'review_result',
  'audit_id',
  'created_at',
  'source_dryrun_job_id',
  'approved_job_id',
  'agent',
  'risk_level',
  'status',
  'exit_code',
  'assistant_text',
  'delivery_succeeded',
  'stderr_tail_empty',
  'task_sha256',
  'task_preview',
  'log_path',
];

const client = new Client(
  {
    name: 'han-agent-bus-openclaw-audit-review-test-client',
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
  const markdownResult = await client.callTool({
    name: 'openclaw_audit_review',
    arguments: {},
  });
  const markdownText = getText(markdownResult);

  console.log('markdown_preview:');
  console.log(markdownText.split('\n').slice(0, 8).join('\n'));

  if (!markdownText.includes('# Approved Employee Task Audit Review')) {
    throw new Error('Expected markdown review heading');
  }

  assertNoForbiddenMarkdownFields(markdownText);

  const jsonPayload = await callJson({
    limit: 20,
    json: true,
  });

  console.log(`records_reviewed: ${jsonPayload.length}`);

  if (!Array.isArray(jsonPayload)) {
    throw new Error('Expected JSON response to be a records array');
  }

  if (jsonPayload.length > 20) {
    throw new Error(`Expected at most 20 records, got ${jsonPayload.length}`);
  }

  for (const record of jsonPayload) {
    assertExactRecordFields(record);
    assertNoForbiddenFields(record);
    if (typeof record.stderr_tail_empty !== 'boolean') {
      throw new Error('Expected stderr_tail_empty to be boolean');
    }
  }

  const limitedPayload = await callJson({
    limit: 2,
    json: true,
  });

  console.log(`limited_records_reviewed: ${limitedPayload.length}`);
  if (limitedPayload.length > 2) {
    throw new Error(`Expected at most 2 limited records, got ${limitedPayload.length}`);
  }
} finally {
  await client.close();
}

function getText(result) {
  return result.content?.find((item) => item.type === 'text')?.text ?? '';
}

async function callJson(args) {
  const result = await client.callTool({
    name: 'openclaw_audit_review',
    arguments: args,
  });
  const text = getText(result);
  return JSON.parse(text);
}

function assertExactRecordFields(record) {
  const keys = Object.keys(record).sort();
  const expected = [...expectedFields].sort();

  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected record fields: ${keys.join(', ')}`);
  }
}

function assertNoForbiddenFields(value) {
  for (const field of forbiddenFields) {
    if (Object.prototype.hasOwnProperty.call(value, field)) {
      throw new Error(`Forbidden field returned: ${field}`);
    }
  }
}

function assertNoForbiddenMarkdownFields(text) {
  for (const field of forbiddenFields) {
    if (text.includes(`- ${field}:`)) {
      throw new Error(`Forbidden markdown field returned: ${field}`);
    }
  }
}
