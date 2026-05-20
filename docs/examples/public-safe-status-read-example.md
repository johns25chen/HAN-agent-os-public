# Public-Safe Status-Read Example

This example is the first minimal implementation example for the public v0.2 workflow line.

It shows how HAN Agent OS can represent a status-read workflow without calling live OpenClaw, reading private runtime artifacts, mutating files, or using secrets.

---

## What this example does

The example returns a structured status-read receipt.

It proves that the workflow can answer a status question while keeping the boundary safe.

The example uses a mock public fixture.

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
    pnpm run test:status-read-example

Expected result:

    public_status_read_example_result: pass

---

## Example receipt shape

The implementation returns a receipt with these guarantees:

    operation_type: status_read
    target: openclaw
    mode: mock
    status_source: mock_public_fixture
    openclaw_live_call_performed: false
    mutation_performed: false
    live_task_executed: false
    file_write_performed: false
    shell_execution_performed: false
    browser_automation_performed: false
    credential_access_performed: false
    private_runtime_artifacts_used: false

The important part is not the mock status.

The important part is the boundary.

---

## Role mapping

| Role | Behavior in this example |
|---|---|
| Hermes | Classifies the request as status-read |
| HAN Agent OS | Enforces read-only boundaries |
| OpenClaw | Represented by mock status only |
| Codex | Not required |
| Human | Must approve any next step beyond status-read |

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

The next possible public milestone is a dry-run workflow.

That should still avoid live execution.

Do not jump from this example directly into unrestricted OpenClaw execution.
