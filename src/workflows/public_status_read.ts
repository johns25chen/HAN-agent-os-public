export type PublicSafeStatusReadTarget = "openclaw";
export type PublicSafeStatusReadMode = "mock";

export interface PublicSafeStatusReadRequest {
  target?: PublicSafeStatusReadTarget;
  mode?: PublicSafeStatusReadMode;
  request_id?: string;
  requested_by?: string;
}

export interface PublicSafeStatusReadReceipt {
  operation_type: "status_read";
  request_id: string;
  target: PublicSafeStatusReadTarget;
  mode: PublicSafeStatusReadMode;
  status_source: "mock_public_fixture";
  status_available: boolean;
  status_summary: string;
  hermes_role: string;
  codex_required: boolean;
  openclaw_live_call_performed: boolean;
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

export function runPublicSafeStatusRead(
  request: PublicSafeStatusReadRequest = {}
): PublicSafeStatusReadReceipt {
  const target = request.target ?? "openclaw";
  const mode = request.mode ?? "mock";

  if (target !== "openclaw") {
    throw new Error(`unsupported public-safe status-read target: ${target}`);
  }

  if (mode !== "mock") {
    throw new Error(`unsupported public-safe status-read mode: ${mode}`);
  }

  return {
    operation_type: "status_read",
    request_id: request.request_id ?? "public-safe-status-read-example",
    target,
    mode,
    status_source: "mock_public_fixture",
    status_available: true,
    status_summary:
      "OpenClaw status is represented by a public-safe mock fixture. No live OpenClaw call was performed.",
    hermes_role:
      "Hermes classifies the user request as read-only status_read before any action is considered.",
    codex_required: false,
    openclaw_live_call_performed: false,
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
      "Human decision required before any dry-run, live action, code change, or OpenClaw execution."
  };
}
