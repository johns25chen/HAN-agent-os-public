# Public Release Index

This document maps the public HAN Agent OS release line.

It helps new users understand which version to use, which versions are historical, and which versions are superseded.

---

## Recommended version

Use the latest public release.

Recommended current release after this document is published:

    v0.2.6-public or newer

If you are new to the project, start with:

1. `README.md`
2. `docs/quick-start.md`
3. `docs/workflows/public-workflow-matrix.md`
4. `docs/examples/minimal-joint-agent-flow.md`

---

## Public release line summary

| Release | Status | Purpose |
|---|---|---|
| `v0.2.6-public` | current | Public release health audit |
| `v0.2.5-public` | stable | Public release index and version map |
| `v0.2.4-public` | stable | Public workflow matrix and capability boundary table |
| `v0.2.3-public` | stable | Public-safe dry-run mock implementation example |
| `v0.2.2-public` | stable | Public-safe dry-run workflow contract |
| `v0.2.1-public` | stable | Public-safe status-read mock implementation example |
| `v0.2.0-public` | stable | Public-safe status-read workflow contract |
| `v0.1.9-public` | stable | Minimal joint-agent flow example |
| `v0.1.8-public` | stable | Public CI hardening |
| `v0.1.7-public` | stable | Public GitHub Actions CI |
| `v0.1.6-public` | stable | Public smoke test fixed and verified |
| `v0.1.5-public` | superseded | Superseded by `v0.1.6-public` |
| `v0.1.4-public` | superseded | Superseded by `v0.1.6-public` |
| `v0.1.3-public` | historical | Quick Start initial version |
| `v0.1.2-public` | historical | LICENSE, SECURITY, CONTRIBUTING |
| `v0.1.1-public` | historical | Hermes / OpenClaw / Codex positioning fix |
| `v0.1.0-public` | historical | Initial sanitized public release |

---

## What v0.1.x means

The `v0.1.x-public` line built the public repository foundation.

It established:

- cleaned public repository
- clear Hermes / OpenClaw / Codex positioning
- Quick Start
- LICENSE
- SECURITY.md
- CONTRIBUTING.md
- public smoke test
- GitHub Actions CI
- minimal joint-agent example

Important notes:

- `v0.1.4-public` is superseded.
- `v0.1.5-public` is superseded.
- Use `v0.1.6-public` or newer if you need a healthy v0.1 line.

---

## What v0.2.x means

The `v0.2.x-public` line starts the public workflow line.

It adds public-safe workflow contracts and mock examples while keeping live execution closed.

Current v0.2 line:

| Release | Workflow area | Contract | Mock implementation | Live execution |
|---|---|---:|---:|---:|
| `v0.2.0-public` | status-read | yes | no | no |
| `v0.2.1-public` | status-read | yes | yes | no |
| `v0.2.2-public` | dry-run | yes | no | no |
| `v0.2.3-public` | dry-run | yes | yes | no |
| `v0.2.4-public` | workflow matrix | yes | n/a | no |
| `v0.2.5-public` | release index | yes | n/a | no |
| `v0.2.6-public` | release health audit | yes | n/a | no |

---

## Superseded versions

The following public releases should not be used as the recommended starting point:

### `v0.1.4-public`

Reason:

- Introduced public smoke test wiring, but the first version rejected local build output incorrectly.

Use:

    v0.1.6-public or newer

### `v0.1.5-public`

Reason:

- Fixed the local build output issue, but the smoke test still scanned its own secret-detection regex and failed.

Use:

    v0.1.6-public or newer

---

## Recommended reading order

For new users:

1. [README](../../README.md)
2. [Quick Start](../quick-start.md)
3. [Minimal Joint-Agent Flow](../examples/minimal-joint-agent-flow.md)
4. [Public Workflow Matrix](../workflows/public-workflow-matrix.md)
5. [Public-Safe Status-Read Workflow](../workflows/public-safe-status-read-workflow.md)
6. [Public-Safe Status-Read Example](../examples/public-safe-status-read-example.md)
7. [Public-Safe Dry-Run Workflow](../workflows/public-safe-dry-run-workflow.md)
8. [Public-Safe Dry-Run Example](../examples/public-safe-dry-run-example.md)

---

## Current capability boundary

The public repository currently supports:

- status-read contract
- status-read mock implementation
- dry-run contract
- dry-run mock implementation
- workflow matrix
- public smoke checks
- CI verification

The public repository does not currently support:

- live OpenClaw execution
- real OpenClaw adapter calls
- shell execution
- browser automation
- file mutation workflows
- credential access
- API key persistence
- repeated execution
- chained live execution
- private runtime receipt exposure

---

## Version selection rule

Use this rule:

    If you want the clearest public release health audit coverage, use v0.2.6-public or newer.
    If you want the first complete public workflow boundary line, use v0.2.4-public or newer.
    If you want the first working dry-run mock example, use v0.2.3-public or newer.
    If you want the first working status-read mock example, use v0.2.1-public or newer.
    Do not start from v0.1.4-public or v0.1.5-public.

---

## Final boundary

This release index is documentation only.

It does not add live execution.

It does not authorize OpenClaw live calls.

It does not authorize shell execution.

It does not authorize browser automation.

It does not authorize file mutation.

It does not expose private runtime artifacts.
