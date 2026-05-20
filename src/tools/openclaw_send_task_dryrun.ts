import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import * as z from 'zod/v4';
import { createJob, createJobId, readJobSummary, writeJobLogs } from '../core/job.js';
import { stripNegatedGuardrails } from '../core/policy.js';

const RISK_LEVELS = ['low', 'medium', 'high'] as const;
type RiskLevel = (typeof RISK_LEVELS)[number];

export type OpenClawTaskJson = {
  task_id: string;
  target: 'openclaw';
  agent: string;
  task: string;
  risk_level: RiskLevel;
  require_approval: boolean;
  created_at: string;
};

type OpenClawDryRunResult = {
  job_id: string;
  status: 'dry_run' | 'rejected';
  approval_required: boolean;
  task_json: OpenClawTaskJson | null;
  log_path: string;
  message: string;
};

const highRiskRules: Array<{ name: string; pattern: RegExp; reason: string }> = [
  {
    name: 'payment',
    pattern: /\b(?:pay|payment|purchase|buy|checkout|invoice|charge|付款|支付|购买|下单|结账)\b/i,
    reason: 'Task appears to involve payment or purchase activity.',
  },
  {
    name: 'transfer',
    pattern: /\b(?:transfer|wire|send money|withdraw|deposit|转账|汇款|提现|充值)\b/i,
    reason: 'Task appears to involve money transfer activity.',
  },
  {
    name: 'delete_files',
    pattern: /\b(?:delete|remove|unlink|rmdir|trash|shred)\s+(?:the\s+)?(?:file|files|folder|folders|directory|directories)\b|(?:删除|移除|清空|销毁).*(?:文件|目录|资料夹)/i,
    reason: 'Task appears to request file deletion.',
  },
  {
    name: 'read_token',
    pattern: /\b(?:read|open|print|show|display|dump|cat)\b[\s\S]{0,80}\b(?:token|secret|api[_-]?key|credential|password|\.env)\b|(?:读取|查看|显示|打印).*(?:token|密钥|密码|凭证|\.env)/i,
    reason: 'Task appears to request reading secrets, tokens, or credentials.',
  },
  {
    name: 'env_read',
    pattern: /\b(?:read|open|print|show|display|dump|cat)\b[\s\S]{0,80}(?:['"]?\.env['"]?|\S*\/\.env)(?:\s|$)|(?:读取|查看|显示|打印).*\.env/i,
    reason: 'Task appears to request reading .env files.',
  },
  {
    name: 'ssh_read',
    pattern: /\b(?:read|open|print|show|display|dump|cat)\b[\s\S]{0,80}(?:~\/\.ssh|\$HOME\/\.ssh|\/Users\/[^/\s]+\/\.ssh|\b\.ssh\b)|(?:读取|查看|显示|打印).*(?:SSH|ssh)/i,
    reason: 'Task appears to request reading SSH material.',
  },
  {
    name: 'private_message',
    pattern: /\b(?:send|dm|message|email|text)\b[\s\S]{0,80}\b(?:private|confidential|secret|personal|customer|client)\b|(?:发送|私信|发消息).*(?:私密|私人|机密|客户)/i,
    reason: 'Task appears to request sending private or sensitive messages.',
  },
  {
    name: 'send_messages',
    pattern: /\b(?:send|dm|message|email|text)\b[\s\S]{0,80}\b(?:message|messages|email|emails|text|texts|dm|dms|users?|people|customers?|clients?)\b|(?:发送|私信|发消息).*(?:消息|邮件|短信|用户|客户)/i,
    reason: 'Task appears to request sending messages.',
  },
  {
    name: 'git_push',
    pattern: /\bgit\s+push\b/i,
    reason: 'Task appears to request git push.',
  },
  {
    name: 'git_commit',
    pattern: /\bgit\s+commit\b/i,
    reason: 'Task appears to request git commit.',
  },
  {
    name: 'openclaw_start_stop',
    pattern: /\b(?:start|stop|restart|launch|kill)\b[\s\S]{0,80}\bopenclaw\b|\bopenclaw\b[\s\S]{0,80}\b(?:start|stop|restart|launch|kill)\b|(?:启动|停止|重启).*(?:OpenClaw|openclaw)/i,
    reason: 'Task appears to request starting or stopping OpenClaw.',
  },
  {
    name: 'docker_compose_up_down',
    pattern: /\bdocker\s+compose\s+(?:up|down)\b/i,
    reason: 'Task appears to request docker compose up/down.',
  },
];

export const openclawSendTaskDryrunInputSchema = {
  agent: z.string().min(1).describe('OpenClaw agent name for the dry-run task JSON.'),
  task: z.string().min(1).describe('Task text to encode into the dry-run task JSON.'),
  risk_level: z.enum(RISK_LEVELS).optional().describe('Risk level for the task. Defaults to medium.'),
  require_approval: z.boolean().optional().describe('Whether approval is required. Defaults to true.'),
};

export async function openclawSendTaskDryrun(input: {
  agent: string;
  task: string;
  risk_level?: RiskLevel;
  require_approval?: boolean;
}): Promise<OpenClawDryRunResult> {
  const jobId = createJobId();
  const createdAt = new Date().toISOString();
  const riskLevel = input.risk_level ?? 'medium';
  const approvalRequired = riskLevel === 'high' ? true : input.require_approval ?? true;
  const rejectedReason = findRejectedReason(input.task);

  const baseRequest = {
    job_id: jobId,
    tool: 'openclaw_send_task_dryrun',
    cwd: process.cwd(),
    prompt: input.task,
    dry_run: true,
    input: {
      agent: input.agent,
      task: input.task,
      risk_level: riskLevel,
      require_approval: input.require_approval ?? true,
    },
    approval_required: approvalRequired,
    exit_code: rejectedReason ? 126 : 0,
  };

  if (rejectedReason) {
    const logPath = await createJob({
      ...baseRequest,
      status: 'rejected',
      rejection_reason: rejectedReason,
    });
    await writeJobLogs(jobId, '', rejectedReason);

    return {
      job_id: jobId,
      status: 'rejected',
      approval_required: approvalRequired,
      task_json: null,
      log_path: logPath,
      message: `Rejected dry-run task: ${rejectedReason}`,
    };
  }

  const taskJson: OpenClawTaskJson = {
    task_id: jobId,
    target: 'openclaw',
    agent: input.agent,
    task: input.task,
    risk_level: riskLevel,
    require_approval: approvalRequired,
    created_at: createdAt,
  };

  const logPath = await createJob({
    ...baseRequest,
    status: 'dry_run',
    task_json_path: path.join('jobs', jobId, 'openclaw_task.json'),
  });

  await writeFile(path.join(logPath, 'openclaw_task.json'), JSON.stringify(taskJson, null, 2));
  await writeJobLogs(jobId, JSON.stringify(taskJson, null, 2), '');
  await readJobSummary(jobId);

  return {
    job_id: jobId,
    status: 'dry_run',
    approval_required: approvalRequired,
    task_json: taskJson,
    log_path: logPath,
    message: 'Dry-run OpenClaw task JSON created. No OpenClaw Gateway, CLI, or real task dispatch was invoked.',
  };
}

function findRejectedReason(task: string): string | null {
  const taskForDangerCheck = stripNegatedGuardrails(task);

  for (const rule of highRiskRules) {
    if (rule.pattern.test(taskForDangerCheck)) {
      return rule.reason;
    }
  }

  return null;
}
