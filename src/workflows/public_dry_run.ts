export type PublicSafeDryRunTarget = "openclaw";
export type PublicSafeDryRunMode = "mock";
export type PublicSafeDryRunAction = "status_check_preview";

export interface PublicSafeDryRunRequest {
  target?: PublicSafeDryRunTarget;
  mode?: PublicSafeDryRunMode;
  requested_action?: PublicSafeDryRunAction;
  request_id?: string;
  requested_by?: string;
}

export interface PublicSafeDryRunReceipt {
  operation_type: "dry_run";
  request_id: string;
  target: PublicSafeDryRunTarget;
  mode: PublicSafeDryRunMode;
  requested_action: PublicSafeDryRunAction;
  dry_run_source: "mock_public_fixture";
  simulated_plan_available: boolean;
  simulated_command_mapping_available: boolean;
  simulated_plan: string[];
  approval_required_before_live_action: boolean;
  hermes_role: string;
  codex_required: boolean;
  openclaw_live_call_performed: boolean;
  codex_execution_performed: boolean;
  mutation_performed: boolean;
  live_task_executed: boolean;
  file_write_performed: boolean;
  shell_execution_performed: boolean;
  browser_automation_performed: boolean;
  credential_access_performed: boolean;
  repeated_execution_performed: boolean;
  chained_execution_performed: boolean;
  private_runtime_artifacts_used: boolean;
  raw_stdout_exposed: boolean;
  raw_stderr_exposed: boolean;
  next_step: string;
}

export function runPublicSafeDryRun(
  request: PublicSafeDryRunRequest = {}
): PublicSafeDryRunReceipt {
  const target = request.target ?? "openclaw";
  const mode = request.mode ?? "mock";
  const requestedAction = request.requested_action ?? "status_check_preview";

  if (target !== "openclaw") {
    throw new Error(`unsupported public-safe dry-run target: ${target}`);
  }

  if (mode !== "mock") {
    throw new Error(`unsupported public-safe dry-run mode: ${mode}`);
  }

  if (requestedAction !== "status_check_preview") {
    throw new Error(`unsupported public-safe dry-run action: ${requestedAction}`);
  }

  return {
    operation_type: "dry_run",
    request_id: request.request_id ?? "public-safe-dry-run-example",
    target,
    mode,
    requested_action: requestedAction,
    dry_run_source: "mock_public_fixture",
    simulated_plan_available: true,
    simulated_command_mapping_available: true,
    simulated_plan: [
      "Classify the request as dry_run.",
      "Confirm the target is OpenClaw.",
      "Confirm the requested action is a status check preview.",
      "Do not call live OpenClaw.",
      "Do not execute shell commands.",
      "Do not mutate files.",
      "Return a dry-run receipt for human review."
    ],
    approval_required_before_live_action: true,
    hermes_role:
      "Hermes classifies the user request as dry_run and prepares a proposed plan only.",
    codex_required: false,
    openclaw_live_call_performed: false,
    codex_execution_performed: false,
    mutation_performed: false,
    live_task_executed: false,
    file_write_performed: false,
    shell_execution_performed: false,
    browser_automation_performed: false,
    credential_access_performed: false,
    repeated_execution_performed: false,
    chained_execution_performed: false,
    private_runtime_artifacts_used: false,
    raw_stdout_exposed: false,
    raw_stderr_exposed: false,
    next_step:
      "Human approval required before any live OpenClaw action, shell execution, file mutation, or Codex execution."
  };
}
