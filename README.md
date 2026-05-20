# HAN Agent OS

**A joint-agent operating system that connects Hermes, OpenClaw, and Codex into one controlled AI workflow.**

HAN Agent OS is designed for builders who want more than a chatbot.

It is for building a real AI work system where:

- **Hermes** acts as the reasoning brain and command center.
- **OpenClaw** acts as the local execution hand.
- **Codex** acts as the code specialist.
- **HAN Agent OS** connects them through task routing, approval gates, command mapping, receipts, rollback records, and audit trails.

In one sentence:

> Hermes thinks. OpenClaw acts. Codex codes. HAN Agent OS keeps the whole chain under control.

---

## Why this project exists

Most AI agent projects focus on making agents more powerful.

That is not enough.

Once an agent can touch your computer, codebase, browser, files, APIs, or workflow tools, the real question becomes:

> Who decides what the agent is allowed to do, which tool should do it, what command actually ran, and how do you prove the result afterward?

HAN Agent OS exists to answer that question.

It is the control layer for a joint-agent stack.

The goal is simple:

> Let AI think, act, and code together without letting it run out of control.

---

## The joint-agent architecture

HAN Agent OS is built around a three-part agent stack.

| Role | System | Responsibility |
|---|---|---|
| Brain | Hermes | Understands goals, plans steps, coordinates the workflow |
| Hands | OpenClaw | Executes local actions, tool calls, workflow operations, and desktop-side tasks |
| Code specialist | Codex | Reads, edits, tests, and improves code repositories |
| Control bus | HAN Agent OS | Routes tasks, checks approval, maps commands, records receipts, and keeps an audit trail |

The architecture looks like this:

    Human Operator
      -> Hermes
      -> HAN Agent OS
      -> OpenClaw for local execution
      -> Codex for code work
      -> Receipt / audit / rollback record

This is not meant to be uncontrolled automation.

It is meant to be controlled delegation.

---

## What HAN Agent OS does

HAN Agent OS provides the control bus between planning and action.

It helps define:

- which agent should handle the task
- whether the task is planning-only, dry-run, or live execution
- whether human approval is required
- which command is allowed to run
- whether the approval is exact or vague
- whether the action may run once or repeatedly
- what evidence proves the result
- what rollback or no-op record should exist after execution

In practical terms, HAN Agent OS is the safety and routing layer that lets Hermes, OpenClaw, and Codex cooperate without becoming a blind auto-runner.

---

## Example workflow

A normal joint-agent flow can look like this:

1. The human gives Hermes a goal.
2. Hermes breaks the goal into a plan.
3. HAN Agent OS classifies the task and checks the allowed boundary.
4. If code changes are needed, Codex handles implementation.
5. If local execution is needed, OpenClaw performs the approved action.
6. HAN Agent OS records what happened.
7. The human gets a receipt, result summary, and next-step decision point.

The important part is not only that the AI can act.

The important part is that every action has a boundary.

---

## Current public milestone

The public release includes the core control-bus work and safety model.

The private development line has already proven a controlled OpenClaw no-op live ping under a strict single-use boundary.

The public project exposes the cleaned architecture, source code, technical references, and safety model without private runtime logs or internal execution artifacts.

Current status:

| Area | Status |
|---|---|
| Public release | v0.1.x public line |
| Core concept | Hermes + OpenClaw + Codex joint-agent control bus |
| Public source | Available |
| Technical reference | Available |
| Safety model | Available |
| Private runtime logs | Excluded |
| Jobs artifacts | Excluded |
| V8.4 | Not open |

---

## What is included

This public repository includes:

- MCP server source
- guarded execution tools
- Codex job runner interface
- OpenClaw task dry-run and approved execution contracts
- dispatch prompt generation and validation
- technical tool reference
- safety model
- public roadmap
- verification scripts

It does not include private runtime history, job artifacts, raw stdout or stderr logs, private audit records, or internal receipts.

---

## Quick start

Install dependencies:

    pnpm install --frozen-lockfile

Build the project:

    pnpm build

Start the MCP server:

    pnpm start

Development mode:

    pnpm dev

For a safer step-by-step setup, read:

- [Quick Start Guide](docs/quick-start.md)

---

## Key links

- [Quick Start Guide](docs/quick-start.md)
- [Technical Tool Reference](docs/han-agent-bus/technical-tool-reference.md)
- [Safety Model](docs/han-agent-bus/safety-model.md)
- [Public Roadmap](docs/han-agent-bus/public-roadmap.md)
- [Security Policy](SECURITY.md)
- [Contributing Guide](CONTRIBUTING.md)
- [License](LICENSE)

---

## Design principles

### 1. Hermes should think, not blindly execute

Reasoning and planning should stay separate from live action.

### 2. OpenClaw should act only inside an approved boundary

Execution should be local, inspectable, and controlled.

### 3. Codex should own code work

Repository edits, tests, refactors, and implementation tasks should go through the code specialist.

### 4. HAN Agent OS should control the chain

The control bus should decide what is allowed, what is blocked, what is logged, and what must be reviewed.

### 5. No vague approval

A vague instruction should not unlock powerful action.

### 6. No fake receipts

A result should be backed by real execution evidence.

### 7. No automatic expansion

A successful phase does not automatically authorize the next phase.

---

## Who this is for

HAN Agent OS is for builders who want to combine reasoning agents, local execution agents, and code agents into one practical system.

It is useful for:

- AI agent developers
- local automation builders
- OpenClaw users
- Hermes-Agent users
- Codex workflow users
- MCP tool builders
- people building human-in-the-loop AI systems
- people who want agents to do real work without losing control

---

## What this is not

HAN Agent OS is not:

- a general chatbot
- a one-click AutoGPT clone
- an unrestricted shell runner
- an uncontrolled browser automation framework
- a finished consumer product
- a promise that agents can safely run everything

It is a control architecture for building joint-agent workflows carefully.

---

## Public roadmap

The next public direction should stay narrow:

1. clearer installation guide
2. better Hermes to OpenClaw to Codex workflow examples
3. minimal demo task
4. public-safe status-read workflow
5. stronger documentation for tool contracts
6. GitHub Actions CI
7. LICENSE, SECURITY.md, and CONTRIBUTING.md

The project should not jump straight into unrestricted live automation.

---

## Current positioning

HAN Agent OS is best understood as:

> A safety-first control bus for a Hermes + OpenClaw + Codex joint-agent system.

Hermes provides the brain.

OpenClaw provides the hands.

Codex provides the coding specialist.

HAN Agent OS provides the rules, routing, approval, receipts, and audit trail that make the system usable without becoming reckless.
