import {
  dispatchPromptGenerate,
  dispatchPromptGenerateInputSchema,
  type DispatchPromptGenerateInput,
} from './dispatch_prompt_generate.js';
import {
  dispatchPromptValidate,
  type DispatchPromptValidationResult,
} from './dispatch_prompt_validate.js';

export const dispatchPreflightInputSchema = {
  objective: dispatchPromptGenerateInputSchema.objective,
  state: dispatchPromptGenerateInputSchema.state,
  allowed_scope: dispatchPromptGenerateInputSchema.allowed_scope,
  expected_output: dispatchPromptGenerateInputSchema.expected_output,
};

export type DispatchPreflightInput = {
  objective: string;
  state: string;
  allowed_scope: string;
  expected_output: string;
};

export type DispatchPreflightResult = {
  preflight_result: DispatchPromptValidationResult;
  task: string;
  safety_checklist: string[];
  validation_result: DispatchPromptValidationResult;
  required_sections_present: boolean;
  missing_sections: string[];
  forbidden_fields_present: boolean;
  forbidden_matches: string[];
  dryrun_ready: boolean;
  next_allowed_action: string;
};

export function dispatchPreflight(input: DispatchPreflightInput): DispatchPreflightResult {
  const generated = dispatchPromptGenerate(input satisfies DispatchPromptGenerateInput);
  const validation = dispatchPromptValidate({ task: generated.task });
  const preflightResult = getPreflightResult(validation.validation_result, validation.dryrun_ready);

  return {
    preflight_result: preflightResult,
    task: generated.task,
    safety_checklist: generated.safety_checklist,
    validation_result: validation.validation_result,
    required_sections_present: validation.required_sections_present,
    missing_sections: validation.missing_sections,
    forbidden_fields_present: validation.forbidden_fields_present,
    forbidden_matches: validation.forbidden_matches,
    dryrun_ready: validation.dryrun_ready,
    next_allowed_action: getNextAllowedAction(preflightResult),
  };
}

function getPreflightResult(
  validationResult: DispatchPromptValidationResult,
  dryrunReady: boolean,
): DispatchPromptValidationResult {
  if (validationResult === 'pass' && dryrunReady) {
    return 'pass';
  }

  if (validationResult === 'warn') {
    return 'warn';
  }

  return 'fail';
}

function getNextAllowedAction(preflightResult: DispatchPromptValidationResult): string {
  if (preflightResult === 'pass') {
    return `Human may review the task and decide whether to call openclaw_send_task_${'dryrun'}.`;
  }

  if (preflightResult === 'warn') {
    return 'Revise the task before dry-run.';
  }

  return 'Do not send this task to dry-run.';
}
