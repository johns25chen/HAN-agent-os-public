# Public Workflow Matrix

This document shows what the public HAN Agent OS repository currently supports, what is only defined as a contract, and what is explicitly not available.

It is a capability boundary table.

It is not a permission grant.

---

## Current public workflow matrix

| Workflow | Contract | Mock implementation | Live execution | CI covered | Public status |
|---|---:|---:|---:|---:|---|
| status-read | yes | yes | no | yes | public-safe |
| dry-run | yes | yes | no | yes | public-safe |
| live execution | no | no | no | no | not authorized |
| file mutation | no | no | no | no | not authorized |
| shell execution | no | no | no | no | not authorized |
| browser automation | no | no | no | no | not authorized |
| credential access | no | no | no | no | not authorized |
| API key persistence | no | no | no | no | not authorized |
| chained execution | no | no | no | no | not authorized |
| repeated execution | no | no | no | no | not authorized |

---

## What is currently public-safe

The public repository currently supports two workflow lines.

### 1. Status-read

Status-read is for answering a narrow status question.

Current support:

- workflow contract: yes
- mock implementation: yes
- live OpenClaw call: no
- file mutation: no
- shell execution: no
- browser automation: no
- credential access: no
- CI coverage: yes

Related files:

- `docs/workflows/public-safe-status-read-workflow.md`
- `src/workflows/public_status_read.ts`
- `scripts/test-public-status-read-workflow.mjs`
- `scripts/test-public-status-read-example.mjs`

### 2. Dry-run

Dry-run is for previewing a proposed action before real execution.

Current support:

- workflow contract: yes
- mock implementation: yes
- live OpenClaw call: no
- file mutation: no
- shell execution: no
- browser automation: no
- credential access: no
- CI coverage: yes

Related files:

- `docs/workflows/public-safe-dry-run-workflow.md`
- `src/workflows/public_dry_run.ts`
- `scripts/test-public-dry-run-workflow.mjs`
- `scripts/test-public-dry-run-example.mjs`

---

## What is explicitly not available

The public repository does not currently support:

- live OpenClaw execution
- real OpenClaw adapter calls
- shell command execution
- browser automation
- file mutation workflows
- credential access
- browser session access
- API key persistence
- repeated execution
- chained execution
- private runtime receipt exposure
- raw stdout or stderr exposure
- private job artifact usage

These are intentionally out of scope.

---

## Role boundary

| Role | Current public behavior |
|---|---|
| Hermes | represented as the reasoning/classification role |
| HAN Agent OS | controls workflow boundary and receipt shape |
| OpenClaw | represented by mock fixtures only |
| Codex | not executed by public examples |
| Human | required before any later live action |

---

## Capability interpretation

Use this rule:

    yes in Contract means the workflow is documented.
    yes in Mock implementation means a public-safe mock example exists.
    no in Live execution means no real action is performed.
    yes in CI covered means the public repository tests the boundary.

A workflow is not ready for live use just because it has a contract.

A mock implementation is not a live adapter.

---

## Safe next-step rule

The next public milestone may add more examples, but it should not jump directly to live execution.

A safe progression is:

    contract
      -> mock implementation
      -> CI coverage
      -> public review
      -> stricter boundary checks
      -> only then consider controlled adapter design

Do not skip the boundary checks.

---

## Current public version meaning

The v0.2 public line means:

    v0.2.0 = status-read contract
    v0.2.1 = status-read mock implementation
    v0.2.2 = dry-run contract
    v0.2.3 = dry-run mock implementation
    v0.2.4 = workflow matrix and capability boundary table

This matrix should be updated whenever a new public workflow is added.

---

## Final boundary

Current public capability is limited to:

- status-read contract and mock example
- dry-run contract and mock example
- public smoke tests
- CI validation
- documentation and examples

Current public capability does not include live execution.
