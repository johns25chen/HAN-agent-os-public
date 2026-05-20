# Contributing to HAN Agent OS

Thanks for your interest in HAN Agent OS.

HAN Agent OS is a joint-agent control bus for Hermes, OpenClaw, and Codex.

The core idea is simple:

> Hermes thinks. OpenClaw acts. Codex codes. HAN Agent OS keeps the whole chain under control.

## Project direction

Contributions should support controlled, auditable AI automation.

Good contributions improve:

- task routing
- approval gates
- command mapping
- dry-run behavior
- receipt handling
- rollback or no-op records
- post-run verification
- documentation clarity
- safe examples
- build and test reliability

Avoid contributions that push the project toward uncontrolled automation.

## Hard boundaries

Do not add features that:

- run shell commands without clear approval
- perform browser automation without explicit scope
- mutate files silently
- persist credentials, cookies, sessions, or API keys
- bypass approval gates
- repeat live actions automatically
- chain agents without a clear stop condition
- hide execution results
- fake receipts or audit records

## Development setup

Install dependencies:

    pnpm install --frozen-lockfile

Build:

    pnpm build

Run in development mode:

    pnpm dev

Start compiled server:

    pnpm start

## Before opening a pull request

Run:

    pnpm install --frozen-lockfile
    pnpm build

Also check that you did not commit generated or private artifacts:

- `node_modules/`
- `dist/`
- `jobs/`
- `.env`
- `.env.*`
- raw `stdout` or `stderr` logs
- private runtime receipts
- local machine paths
- secrets or tokens

## Documentation style

Write for builders first.

Prefer clear product language over internal protocol language.

Good:

> Hermes thinks. OpenClaw acts. Codex codes. HAN Agent OS controls the workflow.

Bad:

> Phase-based verification layer with receipt materialization semantics.

Internal safety language is useful, but it should not hide what the project actually does.

## Pull request checklist

A good pull request should answer:

- What problem does this solve?
- Which part of the Hermes / OpenClaw / Codex workflow does it affect?
- Does it change live execution behavior?
- Does it require approval handling?
- Does it write files or logs?
- Does it expose any private runtime data?
- How was it tested?

## Safety-first contribution rule

If a change makes the system more powerful, it must also make the control boundary clearer.

Capability without control is not the goal of this project.
