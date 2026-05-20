# HAN Agent OS — Technical Tool Reference

This document describes the public technical tool contracts and guarded execution behavior.

The top-level README is the public project overview. This file is the implementation and tool reference.

---

# Han Agent Bus

Minimal MCP stdio server for dispatching guarded Codex jobs.

## Release Integrity CI

The Release Integrity CI gate runs on pull requests and on pushes to `main`.
It uses Node 22 with pnpm through Corepack, installs dependencies with the
frozen lockfile, builds the project, and runs the release integrity suite:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm build
node scripts/test-release-integrity-suite.mjs
```

## Tools

### `codex_run`

Input:

```json
{
  "cwd": "<repo>",
  "prompt": "List the files in this project.",
  "dry_run": true,
  "async": true
}
```

Behavior:

- Verifies `cwd` exists and is a directory.
- Allows execution only under `<workspace>` or `~`.
- Rejects prompts that try to read SSH material, read `.env`, run `git push`, delete files, or run `rm -rf /`.
- With `dry_run: true`, creates the job record and empty logs without invoking Codex.
- `async` defaults to `true`.
- With `dry_run: false` and `async: true`, creates a running job, starts `codex exec --cd <cwd> <prompt>` in the background, and immediately returns `job_id`, `status`, `log_path`, and a message.
- With `async: false`, runs synchronously and respects optional `timeout_ms`; timed out jobs return `status: "timeout"`.
- Writes logs under `<runtime-log-dir>/<job_id>/stdout.log`, `<runtime-log-dir>/<job_id>/stderr.log`, and `<runtime-log-dir>/<job_id>/request.json`.
- When the background process finishes, `request.json` is updated to `completed` or `failed` with `exit_code` and `completed_at`.
- Hermes should call `codex_run` first, then poll `read_task_log` with the returned `job_id` until the status is no longer `running`.

### `read_task_log`

Input:

```json
{
  "job_id": "job_20260514120500_ab12cd34"
}
```

Returns `status`, `exit_code`, `created_at`, `completed_at`, stdout/stderr tails, and the job log path.

### `dispatch_prompt_generate`

Read-only generator for standard Hermes -> OpenClaw dry-run task text.

Input:

```json
{
  "objective": "Draft a read-only implementation plan.",
  "state": "Repository inspected locally; no Gateway action requested.",
  "allowed_scope": "README.md and scripts only.",
  "expected_output": "Return changed files, commands run, and test result.",
  "json": true
}
```

Behavior:

- Generates a dry-run task prompt only.
- Does not call OpenClaw.
- Does not call `openclaw_send_task_dryrun`.
- Does not call `openclaw_send_task_approved`.
- Does not write files.
- Does not execute shell commands.
- Does not start, stop, restart, or otherwise change OpenClaw Gateway state.
- The generated task includes `Hermes -> OpenClaw dry-run task`, `Current verified state`, `Task objective`, `Allowed scope`, `Expected output`, and `Safety checklist`.
- Uses the v1.1.1 verified dry-run-safe safety checklist wording.
- Computes `forbidden_fields_present` from both the original input fields and the final generated task.

Returns:

```json
{
  "task": "Hermes -> OpenClaw dry-run task\n\nCurrent verified state\n...",
  "safety_checklist": [
    "Do not inspect files unless allowed.",
    "Do not modify files.",
    "Do not perform outbound communication.",
    "Do not use delivery mode or external delivery flags.",
    "Do not access private config files, SSH material, authentication material, or API keys.",
    "Do not change OpenClaw Gateway state.",
    "Do not call approved execution tools."
  ],
  "forbidden_fields_present": false
}
```

### `dispatch_prompt_validate`

Read-only validator for standard Hermes -> OpenClaw dry-run task text.

Input:

```json
{
  "task": "Hermes -> OpenClaw dry-run task\n\nCurrent verified state\n..."
}
```

Behavior:

- Validates only the provided `task` string.
- Does not support task file paths or read task files.
- Does not dispatch, hand off, or send any task.
- Does not call OpenClaw.
- Does not call `openclaw_send_task_dryrun`.
- Does not call `openclaw_send_task_approved`.
- Does not write files.
- Does not execute shell commands.
- Does not read private config files, SSH material, authentication material, or API keys.
- Does not start, stop, restart, or otherwise change OpenClaw Gateway state.
- Requires `Hermes -> OpenClaw dry-run task`, `Current verified state`, `Task objective`, `Allowed scope`, `Expected output`, and `Safety checklist`.
- Fails prompts containing guarded phrases such as `APPROVE_OPENCLAW_SEND`, `approval_phrase`, `stdout_tail`, `openclaw message send`, `--deliver`, `git push`, credential/secret reads, or outbound/private messaging requests.

Returns:

```json
{
  "validation_result": "pass",
  "required_sections_present": true,
  "missing_sections": [],
  "forbidden_fields_present": false,
  "forbidden_matches": [],
  "dryrun_ready": true
}
```

### `dispatch_preflight`

Read-only Hermes dispatch preflight chain. `dispatch_preflight` only generates and validates the dispatch task; it does not dispatch, hand off, or send the task.

Input:

```json
{
  "objective": "Draft a read-only implementation plan.",
  "state": "Repository inspected locally; no Gateway action requested.",
  "allowed_scope": "README.md and scripts only.",
  "expected_output": "Return changed files, commands run, and test result."
}
```

Behavior:

- Generates the same standard task text as `dispatch_prompt_generate`.
- Validates that generated task with the same rules as `dispatch_prompt_validate`.
- Does not call OpenClaw.
- Does not call `openclaw_send_task_dryrun`.
- Does not call `openclaw_send_task_approved`.
- Does not write files.
- Does not execute shell commands.
- Does not read task-file paths.
- Does not read private config files, SSH material, authentication material, or API keys.
- Does not start, stop, restart, or otherwise change OpenClaw Gateway state.
- Returns `preflight_result: "pass"` only when validation passes and `dryrun_ready` is true.
- On pass, the only next allowed action is human review and a separate human decision about whether to call `openclaw_send_task_dryrun`.

Returns:

```json
{
  "preflight_result": "pass",
  "task": "Hermes -> OpenClaw dry-run task\n\nCurrent verified state\n...",
  "safety_checklist": [
    "Do not inspect files unless allowed.",
    "Do not modify files.",
    "Do not perform outbound communication.",
    "Do not use delivery mode or external delivery flags.",
    "Do not access private config files, SSH material, authentication material, or API keys.",
    "Do not change OpenClaw Gateway state.",
    "Do not call approved execution tools."
  ],
  "validation_result": "pass",
  "required_sections_present": true,
  "missing_sections": [],
  "forbidden_fields_present": false,
  "forbidden_matches": [],
  "dryrun_ready": true,
  "next_allowed_action": "Human may review the task and decide whether to call openclaw_send_task_dryrun."
}
```

### `openclaw_status`

Read-only OpenClaw status check.

Input:

```json
{
  "openclaw_dir": "~",
  "deep": false,
  "probe": false
}
```

Behavior:

- Uses the global `openclaw` CLI. By default it runs `openclaw status`.
- Defaults `cwd` to `process.env.HOME` or `~`.
- Treats `openclaw_dir` only as a `cwd` override and verifies only that the directory exists.
- Runs `openclaw status --deep` when `deep` is `true`.
- Runs `openclaw gateway probe` when `probe` is `true`.
- Rejects requests where both `deep` and `probe` are `true`.
- Do not use the old `~/openclaw-main` checkout or run `pnpm openclaw` there; that tree is OpenClaw 2026.3.3 and cannot read current 2026.5.x configuration.
- Writes stdout/stderr under `<runtime-log-dir>/<job_id>/stdout.log`, `<runtime-log-dir>/<job_id>/stderr.log`, and `<runtime-log-dir>/<job_id>/request.json`.
- Returns `job_id`, `detected_dir`, `exit_code`, `stdout_tail`, `stderr_tail`, and `log_path`.
- This is a read-only tool. It does not start, stop, or modify OpenClaw.

### `openclaw_send_task_dryrun`

Safe dry-run task generator for OpenClaw.

Input:

```json
{
  "agent": "planner",
  "task": "Draft a local implementation plan.",
  "risk_level": "low",
  "require_approval": true
}
```

Behavior:

- Does not connect to OpenClaw Gateway.
- Does not invoke the OpenClaw CLI.
- Does not send any real task.
- Creates standardized task JSON and writes it to `<runtime-log-dir>/<job_id>/openclaw_task.json`.
- Also writes `<runtime-log-dir>/<job_id>/request.json`, `<runtime-log-dir>/<job_id>/stdout.log`, and `<runtime-log-dir>/<job_id>/stderr.log`.
- `require_approval` defaults to `true`.
- `risk_level` defaults to `medium`; if `risk_level` is `high`, `approval_required` is always `true`.
- Rejects tasks that appear to request payment, transfers, file deletion, reading tokens/secrets, sending private messages, `git push`, `git commit`, starting/stopping OpenClaw, or `docker compose up/down`.
- Rejected tasks return `status: "rejected"` and do not create `openclaw_task.json`.

Returns:

```json
{
  "job_id": "job_20260514120500_ab12cd34",
  "status": "dry_run",
  "approval_required": true,
  "task_json": {
    "task_id": "job_20260514120500_ab12cd34",
    "target": "openclaw",
    "agent": "planner",
    "task": "Draft a local implementation plan.",
    "risk_level": "low",
    "require_approval": true,
    "created_at": "2026-05-14T04:05:00.000Z"
  },
  "log_path": "<runtime-log-dir>/job_20260514120500_ab12cd34",
  "message": "Dry-run OpenClaw task JSON created. No OpenClaw Gateway, CLI, or real task dispatch was invoked."
}
```

### `openclaw_send_task_approved`

Human-approved OpenClaw task sender. This is the only tool that may turn an `openclaw_send_task_dryrun` job into a real OpenClaw CLI call.

Input:

```json
{
  "dryrun_job_id": "job_20260514120500_ab12cd34",
  "approval_phrase": "APPROVE_OPENCLAW_SEND:job_20260514120500_ab12cd34",
  "timeout_seconds": 120
}
```

Behavior:

- Reads `jobs/<dryrun_job_id>/openclaw_task.json`.
- Requires `approval_phrase` to exactly equal `APPROVE_OPENCLAW_SEND:<dryrun_job_id>`.
- Returns `status: "rejected"` if the approval phrase is wrong or the dry-run task JSON is missing.
- Returns `status: "rejected"` for `risk_level: "high"`; this version never sends high risk tasks.
- Rejects tasks containing `payment`, `transfer money`, `delete files`, `read .env`, `read ~/.ssh`, `read token`, `git push`, `send private message`, `message send`, or `--deliver`.
- Also rejects task text containing `openclaw message send`, `gateway install/start/restart`, or `docker compose up/down`.
- On approval, runs only `openclaw agent --agent <agent> --message <task> --json`.
- Never uses `openclaw message send`, `--deliver`, gateway install/start/restart, or `docker compose up/down`.
- Writes stdout/stderr under `<runtime-log-dir>/<job_id>/stdout.log`, `<runtime-log-dir>/<job_id>/stderr.log`, and `<runtime-log-dir>/<job_id>/request.json`.
- If OpenClaw stdout is JSON containing `finalAssistantVisibleText`, `finalAssistantRawText`, and `deliverySucceeded`, also returns them as `assistant_text`, `assistant_raw_text`, and `delivery_succeeded`; otherwise those fields are `null`.

Returns:

```json
{
  "job_id": "job_20260514121000_cd34ef56",
  "source_dryrun_job_id": "job_20260514120500_ab12cd34",
  "status": "completed",
  "exit_code": 0,
  "command_preview": "openclaw agent --agent main --message 'Say OK only.' --json",
  "assistant_text": "OK",
  "assistant_raw_text": "OK",
  "delivery_succeeded": false,
  "stdout_tail": "...",
  "stderr_tail": "",
  "log_path": "<runtime-log-dir>/job_20260514121000_cd34ef56"
}
```

### `openclaw_audit_review`

Read-only review of recent approved employee task audit records.

Input:

```json
{
  "limit": 5,
  "json": false
}
```

Behavior:

- Reads only `<runtime-log-dir>/audit/approved_employee_tasks.jsonl`.
- Defaults to the latest 5 records.
- `limit` is capped at 20.
- Returns the same review fields as `scripts/review-approved-audit.mjs`: `review_result`, `audit_id`, `created_at`, `source_dryrun_job_id`, `approved_job_id`, `agent`, `risk_level`, `status`, `exit_code`, `assistant_text`, `delivery_succeeded`, `stderr_tail_empty`, `task_sha256`, `task_preview`, and `log_path`.
- Never returns `approval_phrase`, `stdout_tail`, `stdout`, or full stdout.
- Returns a clear error payload if the audit file does not exist.
- This is a read-only tool. It does not modify files, invoke OpenClaw, or start/stop/restart OpenClaw Gateway.

### `release_integrity_check`

Read-only release integrity MCP check for the Han Agent Bus v2.1 baseline. Hermes exposes this tool as `mcp_han_agent_bus_release_integrity_check`.

Input:

```json
{
  "json": true
}
```

Behavior:

- Reuses `scripts/check-release-integrity.mjs` so the MCP result uses the same check targets and output fields as the local release integrity script.
- Reads only `README.md`, required `docs/*.md` release documents, and required `scripts/*.mjs` release scripts.
- Calls only `git tag --list` for local stable tag inspection.
- This is a read-only release integrity MCP check.
- It does not execute tasks.
- It does not dispatch or hand off tasks.
- It does not call OpenClaw.
- It does not call `openclaw_send_task_dryrun`.
- It does not call `openclaw_send_task_approved`.
- It does not use delivery mode.
- It does not write files or modify files.
- It does not read credentials, secrets, tokens, SSH material, API keys, or raw private config.
- It does not start, stop, restart, or otherwise modify OpenClaw Gateway state.
- It does not modify stable tags.

Returns:

```json
{
  "release_integrity_result": "pass",
  "checked_tags": ["han-agent-bus-v1.0-stable"],
  "missing_tags": [],
  "checked_documents": ["docs/HERMES_PREFLIGHT_TO_DRYRUN_REVIEW_SOP.md"],
  "missing_documents": [],
  "checked_scripts": ["scripts/test-dispatch-prompt-generate.mjs"],
  "missing_scripts": [],
  "checked_readme_tools": ["dispatch_prompt_generate"],
  "missing_readme_tools": [],
  "checked_forbidden_fields": ["approval_phrase"],
  "missing_forbidden_fields": []
}
```

## Build

```bash
pnpm build
```

## Release Integrity Check

Run the read-only Han Agent Bus v2.0/v2.1 release baseline integrity check:

```bash
node scripts/check-release-integrity.mjs
node scripts/check-release-integrity.mjs --json
node scripts/test-release-integrity-negative-fixtures.mjs
```

For the Han Agent Bus v2.4 Release Integrity Suite, use the local suite runner:

```bash
node scripts/test-release-integrity-suite.mjs
```

The suite runner is the local read-only test entrypoint for release integrity. It runs the text check, JSON check, release integrity MCP tool test, and negative fixtures test, then prints `release_integrity_suite_result` and `failed_steps`.

The script checks required stable tags, required SOP documents, required release scripts, required README MCP tool names, and required forbidden evidence-package field names. It only reads `README.md`, `docs/*.md`, and `scripts/*.mjs`, and only calls `git tag --list` for local tag inspection.

This is a read-only release integrity check. The suite runner is also read-only. It does not call OpenClaw, does not call dry-run or approved OpenClaw task tools, does not use delivery mode, does not modify files, does not modify Gateway state, and does not modify stable tags.

The negative fixtures are pure evaluator tests for `evaluateReleaseIntegrity(input)`. They use mock input only, do not delete files, do not modify tags, and do not call OpenClaw.

For MCP clients, use `release_integrity_check`. It returns the same result shape as the local script and remains read-only: no task execution, no OpenClaw call, no dry-run call, no approved call, no file modification, no Gateway state modification, and no stable tag modification.

## Approved Employee Task Audit Review

Generate a local review summary for recent approved employee task audit records:

```bash
node scripts/review-approved-audit.mjs
```

Defaults to the configured local audit log path and reviews the latest 5 records. Use `--limit` to change the number of recent records and `--json` for structured output:

```bash
node scripts/review-approved-audit.mjs --limit 10
node scripts/review-approved-audit.mjs --limit 10 --json
```

## Hermes -> OpenClaw Dry-Run Dispatch Prompt

Generate a local, read-only standard task prompt for Hermes -> OpenClaw dry-run handoff:

```bash
node scripts/generate-dispatch-prompt.mjs \
  --objective "Draft a local implementation plan." \
  --state "Current verified state from local inspection." \
  --allowed-scope "README.md and scripts only." \
  --expected-output "Return changed files, commands run, and test result."
```

Use `--json` for structured output with `task`, `safety_checklist`, and `forbidden_fields_present`:

```bash
node scripts/generate-dispatch-prompt.mjs \
  --objective "Draft a local implementation plan." \
  --state "Current verified state from local inspection." \
  --allowed-scope "README.md and scripts only." \
  --expected-output "Return changed files, commands run, and test result." \
  --json
```

`forbidden_fields_present` is computed from both the original arguments and the final generated task, so the JSON flag reflects the exact prompt text intended for dry-run handoff.

The script only writes to stdout. It does not modify files, invoke OpenClaw, call approved tools, or change Gateway state.

## Hermes -> OpenClaw Dispatch Prompt Validation

Validate a local task prompt before passing it to `openclaw_send_task_dryrun`:

```bash
node scripts/validate-dispatch-prompt.mjs --task "Hermes -> OpenClaw dry-run task..."
```

Validate a prompt stored in a plain text file:

```bash
node scripts/validate-dispatch-prompt.mjs --task-file ./task.txt
```

`--task-file` is only for ordinary task prompt text files. Before reading the file, the validator rejects paths or filenames that look sensitive, including `.env`, `.ssh`, private key names, token, credential, secret, and API key patterns. It also rejects task files larger than 256KB.

Use `--json` for structured output with `validation_result`, `required_sections_present`, `missing_sections`, `forbidden_fields_present`, `forbidden_matches`, and `dryrun_ready`:

```bash
node scripts/validate-dispatch-prompt.mjs --task-file ./task.txt --json
```

The validator only reads the provided task text or regular text file and writes the result to stdout. It does not write files, execute shell commands, invoke OpenClaw, call dry-run or approved tools, or change Gateway state.

For MCP clients, use `dispatch_prompt_validate` when validating a prompt already held as text. The MCP tool accepts only a `task` string, does not read files, and does not dispatch or send the task.

## Start

Development:

```bash
pnpm dev
```

Compiled:

```bash
pnpm build
pnpm start
```

## Hermes MCP Config

Add this server as a stdio MCP server in the Hermes/OpenClaw MCP config:

```json
{
  "mcpServers": {
    "han-agent-bus": {
      "command": "pnpm",
      "args": ["--dir", "<repo>", "start"],
      "env": {}
    }
  }
}
```

For development, use:

```json
{
  "mcpServers": {
    "han-agent-bus": {
      "command": "pnpm",
      "args": ["--dir", "<repo>", "dev"],
      "env": {}
    }
  }
}
```
