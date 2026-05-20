# Public-Safe Dry-Run Workflow

This document defines a public-safe dry-run workflow contract for HAN Agent OS.

It is intentionally narrow.

It does not perform live execution.

It does not mutate files.

It does not run arbitrary shell commands.

It does not launch browser automation.

It does not require secrets.

It does not call live OpenClaw.

It only defines the safe shape of a future dry-run request, response, and receipt.

---

## Purpose

The goal is to show how HAN Agent OS should handle a proposed action before any real execution happens.

A dry-run is not a live action.

A dry-run should answer:

    What would be done if this were approved later?

It should not actually do the action.

---

## Difference between status-read and dry-run

| Workflow | Purpose | Performs action |
|---|---|---|
| status-read | Read current public-safe status | No |
| dry-run | Simulate or describe a proposed action | No |
| live execution | Actually perform the approved action | Yes, but not in this public workflow |

This document covers dry-run only.

---

## Roles

| Role | System | Responsibility |
|---|---|---|
| Human Operator | Human | Requests a dry-run preview |
| Brain | Hermes | Understands intent and classifies the request |
| Control bus | HAN Agent OS | Enforces dry-run boundary |
| Hands | OpenClaw | Not called live in this public workflow |
| Code specialist | Codex | Not required unless the dry-run concerns code changes |
| Receipt layer | HAN Agent OS | Records the simulated plan and confirms no live action occurred |

---

## Example request

Human:

    Dry-run what would happen if OpenClaw checked local agent status.

Hermes should classify this as:

    task_class: dry_run
    mutation_allowed: false
    live_task_execution_allowed: false
    file_write_allowed: false
    shell_execution_allowed: false
    browser_automation_allowed: false
    credential_access_allowed: false
    repeated_execution_allowed: false
    chained_execution_allowed: false

The important distinction:

    Dry-run planning is allowed.
    Live execution is not allowed.

---

## Allowed dry-run behavior

A public-safe dry-run may:

- describe the intended action
- validate whether the request is narrow enough
- identify the target system
- identify whether human approval would be needed
- produce a simulated command mapping
- produce a simulated receipt shape
- recommend stop, revise, or request approval

It must stay descriptive.

It must not execute the action.

---

## Forbidden dry-run behavior

A public-safe dry-run must not:

- execute tasks
- mutate files
- run arbitrary shell commands
- launch browser automation
- persist credentials
- persist browser sessions
- persist API keys
- call live OpenClaw
- call live Codex execution
- expose raw private configuration
- expose raw stdout or stderr logs
- expose private runtime receipts
- repeat automatically
- chain into a live action

If a dry-run request needs any forbidden behavior, it must be blocked and escalated for human review.

---

## Expected routing

The routing should be:

    Human Operator
      -> Hermes classifies the request as dry_run
      -> HAN Agent OS checks the dry-run boundary
      -> HAN Agent OS produces a simulated action plan
      -> No live OpenClaw call is made
      -> No Codex execution is made unless explicitly scoped as code planning
      -> HAN Agent OS records a dry-run receipt
      -> Human decides whether to stop, revise, or approve a later action

Dry-run does not automatically authorize live execution.

---

## Minimal dry-run receipt

A dry-run receipt should include:

    operation_type: dry_run
    target: openclaw
    requested_action: status_check_preview
    mutation_performed: false
    live_task_executed: false
    file_write_performed: false
    shell_execution_performed: false
    browser_automation_performed: false
    credential_access_performed: false
    openclaw_live_call_performed: false
    codex_execution_performed: false
    repeated_execution_performed: false
    chained_execution_performed: false
    simulated_plan_available: true
    next_step: human approval required before any live action

This receipt proves both the simulated plan and the fact that no live action occurred.

---

## Human-facing response shape

A good response should look like this:

    Dry-run completed.
    Proposed target: OpenClaw.
    Proposed action: status check preview.
    No task execution was performed.
    No files were changed.
    No shell command was run.
    No browser automation was used.
    No credentials were accessed.
    No live OpenClaw call was made.
    Next step: stop, revise the plan, or request explicit approval.

The response should not imply that OpenClaw was actually called.

The response should not imply that a live result was obtained.

---

## Why this belongs in v0.2.2

The v0.2.0 line introduced a public-safe status-read workflow contract.

The v0.2.1 line added a public-safe status-read mock implementation example.

The next safe step is dry-run contract definition.

This creates a controlled bridge between read-only status and future execution planning without jumping into live automation.

---

## Final boundary

This workflow is a contract only.

It does not authorize live OpenClaw execution.

It does not authorize Codex code changes.

It does not authorize shell access.

It does not authorize browser automation.

It only defines a safe dry-run workflow shape.
