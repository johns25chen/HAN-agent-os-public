import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';

export const ALLOWED_ROOTS = ['/Volumes/ComfySSD/Desktop', '/Users/han'] as const;

export type PolicyResult =
  | { ok: true; cwdRealPath: string }
  | { ok: false; reason: string };

const dangerousRules: Array<{ name: string; pattern: RegExp; reason: string }> = [
  {
    name: 'rm_rf_root',
    pattern: /\brm\s+(?:-[^\s]*r[^\s]*f|-[^\s]*f[^\s]*r)(?:\s+--)?\s*(?:\/(?:\s|$)|['"]\/['"])/i,
    reason: 'Refusing prompt that attempts to run rm -rf /.',
  },
  {
    name: 'ssh_read',
    pattern: /(?:cat|read|open|print|show|display|dump)\s+(?:~\/\.ssh|\$HOME\/\.ssh|\/Users\/[^/\s]+\/\.ssh|\b\.ssh\b)/i,
    reason: 'Refusing prompt that attempts to read SSH material.',
  },
  {
    name: 'env_read',
    pattern: /(?:cat|read|open|print|show|display|dump)\s+(?:['"]?\.env['"]?|\S*\/\.env)(?:\s|$)/i,
    reason: 'Refusing prompt that attempts to read .env files.',
  },
  {
    name: 'curl_pipe_bash',
    pattern: /\bcurl\b[\s\S]{0,160}\|\s*(?:bash|sh)\b/i,
    reason: 'Refusing prompt that attempts to pipe curl into a shell.',
  },
  {
    name: 'wget_pipe_shell',
    pattern: /\bwget\b[\s\S]{0,160}\|\s*(?:bash|sh)\b/i,
    reason: 'Refusing prompt that attempts to pipe wget into a shell.',
  },
  {
    name: 'git_push',
    pattern: /\b(?:run|execute|perform|do|automatically|please)?\s*git\s+push\b/i,
    reason: 'Refusing prompt that attempts to automatically git push.',
  },
  {
    name: 'git_commit',
    pattern: /\b(?:run|execute|perform|do|automatically|please)?\s*git\s+commit\b/i,
    reason: 'Refusing prompt that attempts to automatically git commit.',
  },
  {
    name: 'delete_files',
    pattern: /\b(?:delete|remove|unlink|rmdir|trash|shred)\s+(?:the\s+)?(?:file|files|folder|folders|directory|directories)\b/i,
    reason: 'Refusing prompt that attempts to delete files.',
  },
];

const negatedGuardrailLinePatterns: RegExp[] = [
  /^(?:[-*]\s*)?(?:do\s+not|don't|never)\s+(?:run\s+|perform\s+|execute\s+)?git\s+push\s*[.!?。！？]?$/i,
  /^(?:[-*]\s*)?(?:不要|禁止)\s*(?:执行|运行)?\s*git\s+push\s*[.!?。！？]?$/i,

  /^(?:[-*]\s*)?(?:do\s+not|don't|never)\s+(?:run\s+|perform\s+|execute\s+)?git\s+commit\s*[.!?。！？]?$/i,
  /^(?:[-*]\s*)?(?:不要|禁止)\s*(?:执行|运行)?\s*git\s+commit\s*[.!?。！？]?$/i,

  /^(?:[-*]\s*)?(?:do\s+not|don't|never)\s+(?:delete|remove|modify|write|change)\s+(?:the\s+)?(?:file|files|folder|folders|directory|directories)\s*[.!?。！？]?$/i,
  /^(?:[-*]\s*)?(?:不要|禁止)\s*(?:删除|移除|修改|写入|改动)\s*(?:任何)?\s*(?:文件|目录|资料夹)\s*[.!?。！？]?$/i,

  /^(?:[-*]\s*)?(?:do\s+not|don't|never)\s+(?:send|dm|message|email|text)\s+(?:private\s+|confidential\s+|secret\s+|personal\s+|customer\s+|client\s+)?(?:message|messages|email|emails|text|texts|dm|dms)\s*[.!?。！？]?$/i,
  /^(?:[-*]\s*)?(?:不要|禁止)\s*(?:发送|私信|发消息)\s*(?:私密|私人|机密|客户)?\s*(?:消息|邮件|短信)?\s*[.!?。！？]?$/i,
];

const negatedGuardrailStatementPatterns: RegExp[] = [
  /(^|[\n.!?。！？]\s*)(?:[-*]\s*)?(?:do\s+not|don't|never)\s+(?:run\s+|perform\s+|execute\s+)?git\s+push\s*(?=[.!?。！？]|\s*$|\n)/gi,
  /(^|[\n.!?。！？]\s*)(?:[-*]\s*)?(?:不要|禁止)\s*(?:执行|运行)?\s*git\s+push\s*(?=[.!?。！？]|\s*$|\n)/gi,

  /(^|[\n.!?。！？]\s*)(?:[-*]\s*)?(?:do\s+not|don't|never)\s+(?:run\s+|perform\s+|execute\s+)?git\s+commit\s*(?=[.!?。！？]|\s*$|\n)/gi,
  /(^|[\n.!?。！？]\s*)(?:[-*]\s*)?(?:不要|禁止)\s*(?:执行|运行)?\s*git\s+commit\s*(?=[.!?。！？]|\s*$|\n)/gi,

  /(^|[\n.!?。！？]\s*)(?:[-*]\s*)?(?:do\s+not|don't|never)\s+(?:delete|remove|modify|write|change)\s+(?:the\s+)?(?:file|files|folder|folders|directory|directories)\s*(?=[.!?。！？]|\s*$|\n)/gi,
  /(^|[\n.!?。！？]\s*)(?:[-*]\s*)?(?:不要|禁止)\s*(?:删除|移除|修改|写入|改动)\s*(?:任何)?\s*(?:文件|目录|资料夹)\s*(?=[.!?。！？]|\s*$|\n)/gi,

  /(^|[\n.!?。！？]\s*)(?:[-*]\s*)?(?:do\s+not|don't|never)\s+(?:send|dm|message|email|text)\s+(?:private\s+|confidential\s+|secret\s+|personal\s+|customer\s+|client\s+)?(?:message|messages|email|emails|text|texts|dm|dms)\s*(?=[.!?。！？]|\s*$|\n)/gi,
  /(^|[\n.!?。！？]\s*)(?:[-*]\s*)?(?:不要|禁止)\s*(?:发送|私信|发消息)\s*(?:私密|私人|机密|客户)?\s*(?:消息|邮件|短信)?\s*(?=[.!?。！？]|\s*$|\n)/gi,
];

const adversarialContinuationPattern =
  /\b(?:but|however|then|after that|afterwards|still|anyway|regardless)\b|(?:但是|但|然而|然后|接着|仍然|照样|不管)/i;

function normalizePrompt(prompt: string): string {
  return prompt.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function isNegatedGuardrailLine(line: string): boolean {
  const trimmed = line.trim();

  if (!trimmed) {
    return false;
  }

  if (adversarialContinuationPattern.test(trimmed)) {
    return false;
  }

  return negatedGuardrailLinePatterns.some((pattern) => pattern.test(trimmed));
}

export function stripNegatedGuardrails(prompt: string): string {
  const withoutGuardrailStatements = negatedGuardrailStatementPatterns.reduce(
    (current, pattern) => current.replace(pattern, '$1'),
    normalizePrompt(prompt),
  );

  return withoutGuardrailStatements
    .split('\n')
    .filter((line) => !isNegatedGuardrailLine(line))
    .join('\n');
}

function isInsideAllowedRoot(candidate: string): boolean {
  return ALLOWED_ROOTS.some((root) => {
    const relative = path.relative(root, candidate);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  });
}

export async function validateCwd(cwd: string): Promise<PolicyResult> {
  if (!cwd || typeof cwd !== 'string') {
    return { ok: false, reason: 'cwd must be a non-empty string.' };
  }

  let cwdRealPath: string;
  try {
    const cwdStat = await stat(cwd);
    if (!cwdStat.isDirectory()) {
      return { ok: false, reason: `cwd is not a directory: ${cwd}` };
    }
    cwdRealPath = await realpath(cwd);
  } catch {
    return { ok: false, reason: `cwd does not exist: ${cwd}` };
  }

  if (!isInsideAllowedRoot(cwdRealPath)) {
    return {
      ok: false,
      reason: `cwd is outside allowed roots: ${ALLOWED_ROOTS.join(', ')}`,
    };
  }

  return { ok: true, cwdRealPath };
}

export function validatePrompt(prompt: string): PolicyResult {
  if (!prompt || typeof prompt !== 'string') {
    return { ok: false, reason: 'prompt must be a non-empty string.' };
  }

  const promptForDangerCheck = stripNegatedGuardrails(prompt);

  for (const rule of dangerousRules) {
    if (rule.pattern.test(promptForDangerCheck)) {
      return { ok: false, reason: rule.reason };
    }
  }

  return { ok: true, cwdRealPath: '' };
}

export async function validateCodexRunRequest(cwd: string, prompt: string): Promise<PolicyResult> {
  const cwdResult = await validateCwd(cwd);
  if (!cwdResult.ok) {
    return cwdResult;
  }

  const promptResult = validatePrompt(prompt);
  if (!promptResult.ok) {
    return promptResult;
  }

  return { ok: true, cwdRealPath: cwdResult.cwdRealPath };
}
