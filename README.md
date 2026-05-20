# HAN Agent OS

Safety-first Agent OS for controlled, auditable AI automation.

HAN Agent OS is an experimental execution framework for AI agents that need to interact with real tools without losing control of approval, command mapping, execution evidence, rollback records, and post-run verification.

Most agent frameworks focus on giving agents more power.

HAN Agent OS focuses on the missing layer:

How do we let agents act while still knowing exactly what was approved, what command ran, what happened, and whether it may ever run again?

---

## Status at a glance

| Area | Status |
|---|---|
| Current stable phase | V8.3 |
| Proven live action | Controlled OpenClaw no-op ping |
| Execution count | Exactly once |
| Receipt | Materialized |
| Rollback / no-op record | Materialized |
| Post-run verification | Complete |
| Rerun allowed | No |
| V8.4 | Decision gate only |

## Key links

- [Technical Tool Reference](docs/han-agent-bus/technical-tool-reference.md)
- [Safety Model](docs/han-agent-bus/safety-model.md)
- [Public Roadmap](docs/han-agent-bus/public-roadmap.md)

---

## Why this project exists

AI agents are becoming capable enough to touch real systems:

- local machines
- automation tools
- APIs
- browsers
- files
- workflows
- messaging channels
- long-running tasks

That power is useful, but unsafe when execution is vague.

HAN Agent OS explores a safer architecture for agent execution:

    Intent
      -> Phase Charter
      -> Threat Model
      -> Approval Gate
      -> Exact Command Mapping
      -> Final Pre-Run Check
      -> Single-Use Execution
      -> Receipt
      -> Rollback / No-Op Record
      -> Post-Run Verification
      -> Stable Closure

The goal is not fast automation.

The goal is trustworthy automation.

---

## What makes it different

HAN Agent OS treats live agent execution as a controlled system, not a casual chat response.

Every live action should answer:

| Question | Required answer |
|---|---|
| What is allowed | exact scope |
| Who approved it | explicit operator approval |
| Which agent runs it | verified agent identity |
| Which command runs | exact command mapping |
| How many times may it run | single-use execution |
| What happened | real receipt from stdout and stderr |
| Can it be undone | rollback or no-op record |
| Is it closed | post-run verification and stable tag |

This makes the system slower than just running commands.

That is the point.

---

## Proven milestone: V8.3

HAN Agent Bus V8.3 completed a controlled OpenClaw live no-op adapter ping under a strict single-use boundary.

The V8.3 chain proved:

- exact approval can bind to one live action
- a dedicated planner agent can be created and verified
- an abstract live tool can be mapped to a concrete command
- a final pre-run check can block unsafe execution
- exactly one live no-op ping can be executed
- execution output can be captured as a real receipt
- rollback and no-op records can be materialized
- post-run verification can close the execution loop
- stable tags can represent verified phase boundaries

Final V8.3 result:

- payload: HEARTBEAT_OK
- exit code: 0
- execution count performed: 1
- single-use approval consumed: true
- rerun allowed: false

V8.3 is stable.

V8.4 is not open. Future work should start with a new public phase charter.

---

## Core principles

### No hidden execution

If an action is live, it must be declared.

### No guessed command mapping

An approved abstract tool must map to a concrete command before execution.

### No reusable approval

Approvals are exact, scoped, and single-use.

### No fake receipts

Receipts must come from real execution artifacts.

### No silent substitution

If approval says planner, the system must not quietly run main, codex, or another agent.

### No automatic expansion

A successful phase does not authorize the next phase.

### No stable tag without closure

Stable means verified, not merely completed.

---

## Who this is for

HAN Agent OS is for builders who care about controlled AI automation:

- AI agent developers
- local-first automation builders
- agent framework researchers
- tool-using LLM operators
- safety-conscious automation engineers
- people connecting agents to real machines or workflows

It is especially useful if you believe agents should become more capable while execution becomes more disciplined.

---

## What this is not

HAN Agent OS is not:

- a general chatbot
- a one-click AutoGPT clone
- an unrestricted agent runner
- a consumer automation toy
- a framework for uncontrolled shell or browser automation
- a promise that agents can safely run everything

This project is intentionally conservative.

It is designed for high-trust, human-controlled agent execution.

---

## Current project state

- V8.3: stable
- V8.4: decision gate only
- live no-op ping: completed exactly once
- rerun allowed: false

V8.4 may open only through a new phase charter with:

- one narrow live action
- one target agent
- one command path
- one exact approval phrase
- one receipt format
- one rollback or no-op rule
- one stop condition

---

## Technical reference

For implementation details, tool contracts, input/output examples, and guarded execution behavior, see:

- [Technical Tool Reference](docs/han-agent-bus/technical-tool-reference.md)

---

## Repository structure

    docs/han-agent-bus/
      Phase charters
      Decision gates
      Approval records
      Command mapping records
      Readiness checks
      Receipt model
      Rollback / no-op model
      Post-run verification model
      Retrospectives
      Documentation index
      Phase ledger

    scripts/han-agent-bus/
      Verification scripts for phase gates and receipts


---

## Why it matters

The future of agent systems will not be decided only by model intelligence.

It will be decided by whether humans can trust agent actions.

HAN Agent OS is a working experiment in making agent execution:

- explicit
- bounded
- inspectable
- receipt-driven
- rollback-aware
- resistant to uncontrolled autonomy

Build agents that can act without giving them permission to drift.

---

## Status

This repository is early.

Treat it as a serious architecture experiment for safe agent execution, not as a finished product.

The most important idea here is not more automation.

It is controlled automation you can audit after it acts.
