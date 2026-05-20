# Public-Safe Status-Read Workflow

This document defines the first public-safe workflow for HAN Agent OS.

It is intentionally narrow.

It is read-only.

It does not run live execution.

It does not mutate files.

It does not require secrets.

It does not use browser sessions.

It does not start background tasks.

---

## Purpose

The goal is to show how a Hermes / OpenClaw / Codex joint-agent system can answer a status question without turning into uncontrolled automation.

The workflow answers a simple question:

    What is the current system status?

This should be handled as a status-read workflow, not as a task-execution workflow.

---

## Roles

| Role | System | Responsibility |
|---|---|---|
| Human Operator | Human | Asks for status |
| Brain | Hermes | Understands and classifies the request |
| Control bus | HAN Agent OS | Checks that the request is read-only and safe |
| Hands | OpenClaw | May provide status information only |
| Code specialist | Codex | Not required unless the user asks for code or repository changes |
| Receipt layer | HAN Agent OS | Records what was checked and what was not performed |

---

## Example request

Human:

    Check current OpenClaw status.

Hermes should classify this as:

    task_class: status_read
    mutation_allowed: false
    live_task_execution_allowed: false
    file_write_allowed: false
    shell_execution_allowed: false
    credential_access_allowed: false
    repeated_execution_allowed: false

The important distinction:

    Status-read is allowed.
    Task execution is not allowed.

---

## Allowed behavior

A public-safe status-read workflow may:

- read high-level service availability
- read agent availability
- read public-safe configuration state
- summarize whether a component appears available
- return a human-readable status summary
- return a structured status receipt

It must stay narrow and inspectable.

---

## Forbidden behavior

A public-safe status-read workflow must not:

- execute tasks
- mutate files
- run arbitrary shell commands
- launch browser automation
- persist credentials
- persist browser sessions
- persist API keys
- expose raw private configuration
- expose raw stdout or stderr logs
- expose private runtime receipts
- repeat automatically
- chain into another live action

If a status-read request needs any of the forbidden behavior, it must be blocked and escalated for human review.

---

## Expected routing

The routing should be:

    Human Operator
      -> Hermes classifies the request
      -> HAN Agent OS checks read-only boundary
      -> OpenClaw status-read path may be queried
      -> HAN Agent OS records a status receipt
      -> Human receives summary and next-step options

Codex is not part of the normal status-read path.

Codex is used only if the user asks to change code, inspect repository logic, or update documentation.

---

## Minimal status receipt

A status-read receipt should include:

    operation_type: status_read
    target: openclaw
    mutation_performed: false
    live_task_executed: false
    file_write_performed: false
    shell_execution_performed: false
    browser_automation_performed: false
    credential_access_performed: false
    repeated_execution_performed: false
    summary: public-safe status summary
    next_step: human decision required before any live action

This receipt should prove both what happened and what did not happen.

---

## Human-facing response shape

A good response should look like this:

    Status-read completed.
    OpenClaw appears available.
    No task execution was performed.
    No files were changed.
    No shell command was run.
    No browser automation was used.
    No credentials were accessed.
    Next step: choose whether to plan, dry-run, or stop.

The response should not overclaim.

The response should not pretend that a full execution audit happened if only a status-read happened.

---

## Why this belongs in v0.2.0

The v0.1.x line made the public repository understandable and safe to start:

- clear positioning
- Quick Start
- public smoke test
- CI
- minimal joint-agent demo

The v0.2.0 line should begin with the smallest useful workflow:

    public-safe status-read

This creates a bridge from documentation toward real, controlled workflows without jumping into live execution.

---

## Final boundary

This workflow is a contract and example.

It does not authorize unrestricted OpenClaw execution.

It does not authorize Codex code changes.

It does not authorize shell access.

It does not authorize browser automation.

It only defines a safe read-only workflow shape.
