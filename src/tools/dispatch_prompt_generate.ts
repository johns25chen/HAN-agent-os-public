import * as z from 'zod/v4';

export const dispatchPromptGenerateInputSchema = {
  objective: z.string().describe('Dry-run task objective for OpenClaw.'),
  state: z.string().describe('Current verified state to include in the dry-run task.'),
  allowed_scope: z.string().describe('Allowed scope for the dry-run task.'),
  expected_output: z.string().describe('Expected output from the dry-run task.'),
  json: z.boolean().optional().describe('Reserved for clients that distinguish structured output.'),
};

export const SAFETY_CHECKLIST = [
  'Do not inspect files unless allowed.',
  'Do not modify files.',
  'Do not perform outbound communication.',
  'Do not use delivery mode or external delivery flags.',
  'Do not access private config files, SSH material, authentication material, or API keys.',
  'Do not change OpenClaw Gateway state.',
  'Do not call approved execution tools.',
] as const;

export const FORBIDDEN_PHRASES = [
  'APPROVE_OPENCLAW_SEND',
  'approval_phrase',
  'stdout_tail',
  'openclaw message send',
  '--deliver',
  'git push',
  'read .env',
  'read ~/.ssh',
  'read token',
  'credential',
  'secret',
  'send external messages',
  'send messages',
  'external messages',
  'private messages',
  'outbound message',
  'outbound messages',
] as const;

export type DispatchPromptGenerateInput = {
  objective: string;
  state: string;
  allowed_scope: string;
  expected_output: string;
  json?: boolean;
};

export type DispatchPromptGenerateResult = {
  task: string;
  safety_checklist: string[];
  forbidden_fields_present: boolean;
};

export function dispatchPromptGenerate(input: DispatchPromptGenerateInput): DispatchPromptGenerateResult {
  const task = buildTask(input);

  return {
    task,
    safety_checklist: [...SAFETY_CHECKLIST],
    forbidden_fields_present: hasForbiddenFields(input, task),
  };
}

function buildTask(input: DispatchPromptGenerateInput): string {
  return [
    'Hermes -> OpenClaw dry-run task',
    '',
    'Current verified state',
    normalizeSection(input.state),
    '',
    'Task objective',
    normalizeSection(input.objective),
    '',
    'Allowed scope',
    normalizeSection(input.allowed_scope),
    '',
    'Expected output',
    normalizeSection(input.expected_output),
    '',
    'Safety checklist',
    ...SAFETY_CHECKLIST.map((item) => `- ${item}`),
  ].join('\n');
}

function normalizeSection(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : 'Not provided.';
}

function hasForbiddenFields(input: DispatchPromptGenerateInput, task: string): boolean {
  const fieldsToCheck = [
    input.objective,
    input.state,
    input.allowed_scope,
    input.expected_output,
    task,
  ]
    .join('\n')
    .toLowerCase();

  return FORBIDDEN_PHRASES.some((phrase) => fieldsToCheck.includes(phrase.toLowerCase()));
}
