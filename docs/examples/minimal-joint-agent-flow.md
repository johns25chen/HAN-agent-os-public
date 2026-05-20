# Minimal Joint-Agent Flow

This is the smallest mental model for HAN Agent OS.

HAN Agent OS connects three agent roles into one controlled workflow:

- **Hermes** thinks.
- **OpenClaw** acts.
- **Codex** codes.
- **HAN Agent OS** controls the chain.

This example is conceptual and public-safe.

It does not run live execution.

It does not require secrets.

It does not include private runtime artifacts.

---

## Scenario

A human operator wants the agent system to improve a project README.

The work may involve reasoning, code or text changes, and possibly local execution.

A blind auto-runner would just start doing things.

HAN Agent OS separates the workflow into clear roles and boundaries.

---

## Step 1 — Human gives the goal

Human:

    Improve the README so new users can understand what this project does and how to start safely.

This is the user intent.

At this point, nothing should execute automatically.

---

## Step 2 — Hermes thinks

Hermes acts as the reasoning brain.

Hermes should answer questions like:

- What is the user trying to achieve?
- Is this a planning task, code task, documentation task, or execution task?
- Does the task need Codex?
- Does the task need OpenClaw?
- Is human approval required before anything live happens?

Example Hermes plan:

    Goal: improve README clarity.
    Task type: documentation/codebase edit.
    Suggested specialist: Codex.
    Live execution needed: no.
    Approval needed: only if changes are pushed, published, or executed.
    Expected output: README patch and summary.

Hermes should plan.

Hermes should not secretly execute.

---

## Step 3 — HAN Agent OS routes the task

HAN Agent OS acts as the control bus.

It decides how the task should move through the system.

For this example:

| Question | Answer |
|---|---|
| Is this live execution? | No |
| Does it need OpenClaw? | Not yet |
| Does it need Codex? | Yes |
| Does it require approval? | Only before publishing or live action |
| Should a receipt exist? | Yes, for the final result |
| Should rollback/no-op be considered? | Yes, if changes are applied |

Routing decision:

    Send the documentation/code task to Codex.
    Do not call OpenClaw.
    Do not perform live execution.
    Do not publish automatically.

---

## Step 4 — Codex handles code or document work

Codex acts as the code specialist.

For this example, Codex may:

- inspect `README.md`
- propose clearer wording
- edit documentation
- run local checks
- summarize the diff

Codex should not silently push to GitHub.

Codex should not publish a release.

Codex should not run unrelated shell commands.

Expected Codex output:

    Changed README intro.
    Added clearer architecture explanation.
    Verified links.
    No live execution performed.

---

## Step 5 — OpenClaw is only used if local action is approved

OpenClaw is the execution hand.

It should be used only when the workflow requires local execution and the boundary is explicit.

In this minimal demo, OpenClaw is not required.

If OpenClaw were required, HAN Agent OS should define:

- target agent
- exact command path
- approval phrase
- execution count
- expected receipt
- rollback/no-op rule
- stop condition

Example not-run live action:

    OpenClaw action: not needed.
    Live execution: not authorized.
    Reason: documentation edit can be handled without local automation.

This is the correct safe behavior.

Not every task needs the hands.

---

## Step 6 — HAN Agent OS records the result

After the work is done, HAN Agent OS should produce a result boundary.

Example receipt summary:

    Task: improve README clarity.
    Hermes role: planned the work.
    Codex role: edited documentation.
    OpenClaw role: not used.
    Live execution: none.
    Files changed: README.md.
    Checks: links passed, build not required.
    Next decision: human review before publish.

A receipt is not decoration.

It answers:

- what happened
- who did it
- what did not happen
- what needs human review next

---

## Full flow

    Human Operator
      -> Hermes plans the task
      -> HAN Agent OS classifies and routes it
      -> Codex edits documentation
      -> OpenClaw stays idle because no live action is needed
      -> HAN Agent OS records the result
      -> Human reviews the outcome

---

## Why this matters

The goal is not to make every agent do everything.

The goal is to make the right agent do the right work under the right boundary.

Simple rule:

| Need | Use |
|---|---|
| Reasoning and planning | Hermes |
| Code and repository work | Codex |
| Local execution | OpenClaw |
| Routing, approval, receipts, audit | HAN Agent OS |

---

## Safe first demo

For a public-safe first run, use:

    pnpm install --frozen-lockfile
    pnpm build
    pnpm run test:public

This validates the public repository without live execution.

Do not start with live OpenClaw actions.

Do not add secrets.

Do not add browser sessions.

Do not connect private runtime logs.

---

## Minimal takeaway

HAN Agent OS is not just another agent runner.

It is a controlled joint-agent workflow:

    Hermes thinks.
    Codex codes.
    OpenClaw acts when approved.
    HAN Agent OS controls the chain.
