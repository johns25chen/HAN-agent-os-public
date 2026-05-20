import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { codexRun, codexRunInputSchema } from './tools/codex_run.js';
import {
  dispatchPromptGenerate,
  dispatchPromptGenerateInputSchema,
} from './tools/dispatch_prompt_generate.js';
import {
  dispatchPromptValidate,
  dispatchPromptValidateInputSchema,
} from './tools/dispatch_prompt_validate.js';
import { dispatchPreflight, dispatchPreflightInputSchema } from './tools/dispatch_preflight.js';
import {
  openclawAuditReview,
  openclawAuditReviewInputSchema,
} from './tools/openclaw_audit_review.js';
import {
  openclawSendTaskDryrun,
  openclawSendTaskDryrunInputSchema,
} from './tools/openclaw_send_task_dryrun.js';
import {
  openclawSendTaskApproved,
  openclawSendTaskApprovedInputSchema,
} from './tools/openclaw_send_task_approved.js';
import { openclawStatus, openclawStatusInputSchema } from './tools/openclaw_status.js';
import { readTaskLog, readTaskLogInputSchema } from './tools/read_task_log.js';
import {
  releaseIntegrityCheck,
  releaseIntegrityCheckInputSchema,
} from './tools/release_integrity_check.js';

function asTextContent(value: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

const server = new McpServer({
  name: 'Han Agent Bus',
  version: '0.1.0',
});

server.registerTool(
  'codex_run',
  {
    title: 'Run Codex',
    description: 'Run codex exec in an allowed working directory and persist stdout/stderr under jobs/<job_id>/.',
    inputSchema: codexRunInputSchema,
  },
  async (input) => asTextContent(await codexRun(input)),
);

server.registerTool(
  'read_task_log',
  {
    title: 'Read Task Log',
    description: 'Read request and stdout/stderr tails for a Han Agent Bus job.',
    inputSchema: readTaskLogInputSchema,
  },
  async (input) => asTextContent(await readTaskLog(input)),
);

server.registerTool(
  'dispatch_prompt_generate',
  {
    title: 'Generate Dispatch Prompt',
    description:
      'Read-only generator for standard Hermes -> OpenClaw dry-run task text. It does not call OpenClaw, write files, execute shell commands, or change Gateway state.',
    inputSchema: dispatchPromptGenerateInputSchema,
  },
  async (input) => asTextContent(dispatchPromptGenerate(input)),
);

server.registerTool(
  'dispatch_prompt_validate',
  {
    title: 'Validate Dispatch Prompt',
    description:
      'Read-only validator for Hermes -> OpenClaw dry-run task text. It only validates the provided task string and does not read files, call OpenClaw tools, execute shell commands, write files, or change Gateway state.',
    inputSchema: dispatchPromptValidateInputSchema,
  },
  async (input) => asTextContent(dispatchPromptValidate(input)),
);

server.registerTool(
  'dispatch_preflight',
  {
    title: 'Dispatch Preflight',
    description:
      'Read-only Hermes dispatch preflight chain. It generates standard dry-run task text, validates that generated text, and does not dispatch, write files, execute shell commands, read task paths, or change Gateway state.',
    inputSchema: dispatchPreflightInputSchema,
  },
  async (input) => asTextContent(dispatchPreflight(input)),
);

server.registerTool(
  'openclaw_status',
  {
    title: 'OpenClaw Status',
    description:
      'Read OpenClaw status by running the global openclaw CLI. Supports openclaw status, openclaw status --deep, and openclaw gateway probe.',
    inputSchema: openclawStatusInputSchema,
  },
  async (input) => asTextContent(await openclawStatus(input)),
);

server.registerTool(
  'openclaw_send_task_dryrun',
  {
    title: 'OpenClaw Send Task Dry Run',
    description:
      'Create a standardized OpenClaw task JSON under jobs/<job_id>/ without connecting to OpenClaw Gateway, invoking OpenClaw CLI, or sending a real task.',
    inputSchema: openclawSendTaskDryrunInputSchema,
  },
  async (input) => asTextContent(await openclawSendTaskDryrun(input)),
);

server.registerTool(
  'openclaw_send_task_approved',
  {
    title: 'OpenClaw Send Task Approved',
    description:
      'After exact human approval, send a previously generated OpenClaw dry-run task using only openclaw agent --agent <agent> --message <task> --json.',
    inputSchema: openclawSendTaskApprovedInputSchema,
  },
  async (input) => asTextContent(await openclawSendTaskApproved(input)),
);

server.registerTool(
  'openclaw_audit_review',
  {
    title: 'OpenClaw Audit Review',
    description:
      'Read the recent approved employee task audit review from jobs/audit/approved_employee_tasks.jsonl without exposing approval phrases or stdout.',
    inputSchema: openclawAuditReviewInputSchema,
  },
  async (input) => {
    const result = await openclawAuditReview(input);

    if (result.ok && result.format === 'markdown') {
      return {
        content: [
          {
            type: 'text' as const,
            text: result.markdown,
          },
        ],
      };
    }

    if (result.ok && result.format === 'json') {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result.records, null, 2),
          },
        ],
      };
    }

    return asTextContent({
      error: result.error,
      audit_path: result.audit_path,
    });
  },
);

server.registerTool(
  'release_integrity_check',
  {
    title: 'Release Integrity Check',
    description:
      'Read-only release integrity MCP check for the Han Agent Bus v2.1 baseline. It reads local release evidence and local git tags only; it does not execute tasks, dispatch, invoke OpenClaw, call dry-run or approved tools, write files, or modify stable tags.',
    inputSchema: releaseIntegrityCheckInputSchema,
  },
  async (input) => asTextContent(await releaseIntegrityCheck(input)),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Han Agent Bus failed to start:', error);
  process.exit(1);
});
