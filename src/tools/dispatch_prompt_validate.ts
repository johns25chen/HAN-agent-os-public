import * as z from 'zod/v4';

export const dispatchPromptValidateInputSchema = {
  task: z.string().describe('Hermes -> OpenClaw dry-run task text to validate.'),
};

export const REQUIRED_SECTIONS = [
  'Hermes -> OpenClaw dry-run task',
  'Current verified state',
  'Task objective',
  'Allowed scope',
  'Expected output',
  'Safety checklist',
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

export type DispatchPromptValidateInput = {
  task: string;
};

export type DispatchPromptValidationResult = 'pass' | 'warn' | 'fail';

export type DispatchPromptValidateResult = {
  validation_result: DispatchPromptValidationResult;
  required_sections_present: boolean;
  missing_sections: string[];
  forbidden_fields_present: boolean;
  forbidden_matches: string[];
  dryrun_ready: boolean;
};

export function dispatchPromptValidate(input: DispatchPromptValidateInput): DispatchPromptValidateResult {
  return validateTaskText(input.task);
}

export function validateTaskText(task: string): DispatchPromptValidateResult {
  const missingSections = REQUIRED_SECTIONS.filter((section) => !task.includes(section));
  const loweredTask = task.toLowerCase();
  const forbiddenMatches = FORBIDDEN_PHRASES.filter((phrase) => loweredTask.includes(phrase.toLowerCase()));

  const requiredSectionsPresent = missingSections.length === 0;
  const forbiddenFieldsPresent = forbiddenMatches.length > 0;
  const validationResult: DispatchPromptValidationResult = forbiddenFieldsPresent
    ? 'fail'
    : requiredSectionsPresent
      ? 'pass'
      : 'warn';

  return {
    validation_result: validationResult,
    required_sections_present: requiredSectionsPresent,
    missing_sections: missingSections,
    forbidden_fields_present: forbiddenFieldsPresent,
    forbidden_matches: forbiddenMatches,
    dryrun_ready: validationResult === 'pass',
  };
}
