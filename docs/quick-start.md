# HAN Agent OS — Quick Start

This guide helps you run the public HAN Agent OS project locally and understand the safe first path.

HAN Agent OS is a joint-agent control bus:

- Hermes thinks.
- OpenClaw acts.
- Codex codes.
- HAN Agent OS controls the workflow.

The first run should stay safe:

- build the project
- inspect the MCP server entry point
- run public-safe verification scripts
- do not connect live actions yet
- do not provide secrets or credentials

---

## 1. Requirements

Recommended local environment:

- Node.js 22 or newer
- pnpm 10 or newer
- Git
- macOS, Linux, or WSL2

Enable Corepack if needed:

    corepack enable

Check versions:

    node --version
    pnpm --version

---

## 2. Install dependencies

From the repository root:

    pnpm install --frozen-lockfile

This installs the TypeScript and MCP server dependencies.

---

## 3. Build

Run:

    pnpm build

Expected result:

- TypeScript compiles successfully
- `dist/` is generated locally
- no live agent execution is performed

The generated `dist/` directory is ignored by Git.

Note: `pnpm build` creates a local `dist/` directory. That is expected. `dist/` must not be committed or published.

---

## 4. Start the MCP server

After building:

    pnpm start

For development mode:

    pnpm dev

This starts the HAN Agent OS MCP server entry point.

The public repository does not ship private runtime logs, private jobs, internal receipts, or private OpenClaw execution artifacts.

---

## 5. Understand the control flow

HAN Agent OS is not meant to be a blind auto-runner.

A safe joint-agent flow should look like this:

    Human Operator
      -> Hermes
      -> HAN Agent OS
      -> Codex for code work
      -> OpenClaw for approved local execution
      -> Receipt / audit / rollback record

The key idea:

> Planning and execution should not be the same thing.

Hermes may reason and coordinate.

Codex may handle repository work.

OpenClaw may execute local actions.

HAN Agent OS should decide what is allowed, what is blocked, what needs approval, and what must be recorded.

---

## 6. Public-safe smoke checks

These checks are meant to stay local and public-safe.

Build check:

    pnpm build

Dispatch prompt generation check:

    node scripts/test-dispatch-prompt-generate.mjs

Dispatch prompt validation check:

    node scripts/test-dispatch-prompt-validate.mjs

Public smoke check:

    pnpm run test:public

Public status-read workflow contract check:

    pnpm run test:status-read

Public status-read implementation example check:

    pnpm run test:status-read-example

These checks are intended to validate public code paths and safety constraints.

They should not require private runtime artifacts.

Do not use the private release-integrity suite as a public first-run check. That suite belongs to the private audit line and expects private documents, internal tags, and internal release records that are intentionally not included in this public repository.

---

## 7. What not to do on the first run

Do not start by connecting live tools.

Do not add secrets.

Do not add browser cookies.

Do not add API keys.

Do not point the system at private logs.

Do not run uncontrolled shell commands.

Do not use OpenClaw live execution until you understand the approval and receipt model.

The first public run should be build-first, inspect-first, dry-run-first.

---

## 8. Where to read next

Start with:

- [Technical Tool Reference](han-agent-bus/technical-tool-reference.md)
- [Safety Model](han-agent-bus/safety-model.md)
- [Public Roadmap](han-agent-bus/public-roadmap.md)
- [Public-Safe Status-Read Workflow](workflows/public-safe-status-read-workflow.md)
- [Public-Safe Status-Read Example](examples/public-safe-status-read-example.md)
- [Security Policy](../SECURITY.md)
- [Contributing Guide](../CONTRIBUTING.md)

---

## 9. Minimal mental model

If you remember only one thing, remember this:

> Hermes thinks.  
> OpenClaw acts.  
> Codex codes.  
> HAN Agent OS controls the chain.

That is the project.
