# Public-Safe Dry-Run Example

This example is the first minimal implementation example for the public-safe dry-run workflow.

It shows how HAN Agent OS can preview a proposed action without calling live OpenClaw, executing shell commands, mutating files, using browser automation, or accessing credentials.

---

## What this example does

The example returns a structured dry-run receipt.

It simulates the plan for a narrow action:

    status_check_preview

It does not perform the action.

It does not contact OpenClaw.

It does not contact Codex.

It does not execute shell commands.

It does not write files.

It does not access credentials.

---

## Run the example test

From the repository root:

    pnpm install --frozen-lockfile
    pnpm build
    pnpm run test:dry-run-example

Expected result:

    public_dry_run_example_result: pass

---

## Example receipt shape

The implementation returns a receipt with these guarantees:

    operation_type: dry_run
    target: openclaw
    mode: mock
    requested_action: status_check_preview
    dry_run_source: mock_public_fixture
    simulated_plan_available: true
    simulated_command_mapping_available: true
    approval_required_before_live_action: true
    openclaw_live_call_performed: false
    codex_execution_performed: false
    mutation_performed: false
    live_task_executed: false
    file_write_performed: false
    shell_execution_performed: false
    browser_automation_performed: false
    credential_access_performed: false
    private_runtime_artifacts_used: false

The important part is not the mock plan.

The important part is the boundary.

---

## Role mapping

| Role | Behavior in this example |
|---|---|
| Hermes | Classifies the request as dry-run |
| HAN Agent OS | Enforces dry-run boundaries |
| OpenClaw | Not called live |
| Codex | Not required |
| Human | Must approve any later live action |

---

## Why this is public-safe

This example is safe for the public repository because it does not depend on:

- private jobs
- private logs
- private OpenClaw runtime
- browser sessions
- API keys
- shell execution
- live execution receipts

It is a teaching and verification example.

It is not a live adapter.

---

## Next boundary

The next possible public milestone is a more complete dry-run example library.

That should still avoid live execution.

Do not jump from this example directly into unrestricted OpenClaw execution.
