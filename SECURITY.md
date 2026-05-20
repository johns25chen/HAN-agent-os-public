# Security Policy

HAN Agent OS is designed for controlled agent execution, but it should still be treated as experimental software.

## Supported versions

The public release line currently starts at:

- `v0.1.x-public`

Security updates will focus on the latest public release.

## Security model

HAN Agent OS is built around strict execution boundaries:

- no hidden live execution
- no guessed command mapping
- no reusable approval
- no fake receipts
- no silent agent substitution
- no automatic phase expansion
- no stable release without verification

The project is intended to help connect Hermes, OpenClaw, and Codex through a controlled workflow.

Hermes thinks.

OpenClaw acts.

Codex codes.

HAN Agent OS controls routing, approval, command mapping, receipts, rollback/no-op records, and audit trails.

## What not to report publicly

Do not post secrets, credentials, tokens, API keys, private logs, raw stdout/stderr dumps, or private runtime artifacts in public issues.

Do not include:

- `.env` contents
- API keys
- access tokens
- browser cookies
- SSH keys
- private OpenClaw runtime logs
- private Codex logs
- job artifacts
- raw execution receipts with sensitive context

## Reporting a vulnerability

If GitHub private vulnerability reporting is available, use it.

If not, open a public issue with a non-sensitive summary only, such as:

- affected component
- high-level impact
- reproduction outline without secrets
- expected safe behavior

Then wait for maintainer follow-up before sharing sensitive details.

## Safe usage expectations

Before running any live agent action, users should verify:

- the target agent is correct
- the command path is explicit
- the approval scope is exact
- the action is not repeated unintentionally
- logs and receipts do not expose secrets
- rollback or no-op handling is defined

## Out of scope

This project does not guarantee that all agent actions are safe.

It provides a control architecture for building safer joint-agent workflows.

Users are responsible for reviewing their own integrations, credentials, runtime permissions, and deployment environment.
