# Codex Plugins

[中文说明](./README.zh-CN.md)

One Codex marketplace for a personal AI-native engineering stack.

`codex-plugins` packages the Codex extensions I use as a coherent toolkit: one marketplace entry,
two complementary plugins, and one root verification command. The goal is not to collect random
experiments. The goal is a small, durable workspace where Codex can delegate, cross-check, run
structured workflows, and leave behind inspectable artifacts.

## Install

Add the marketplace once:

```bash
codex plugin marketplace add chuntaojun/codex-plugins --ref main
```

Restart Codex after adding or upgrading the marketplace.

The marketplace marks included plugins as installed by default. If your Codex build still requires
explicit installation, run:

```bash
codex plugin add claude@codex-plugins
codex plugin add codex-ultracode@codex-plugins
```

Update later:

```bash
codex plugin marketplace upgrade codex-plugins
```

## What You Get

| Plugin | Role | Best used when |
| --- | --- | --- |
| `claude` | Claude bridge for Codex | You want Claude to review, challenge, implement, or provide a second model pass from inside Codex. |
| `codex-ultracode` | Workflow runner for Codex | You want repeatable multi-stage Codex runs with named workflows, artifacts, gates, run status, and restart/rework controls. |

Together they make Codex less like a single chat window and more like a local engineering cockpit:

- **Cross-model delegation:** ask Claude for a focused pass without leaving Codex.
- **Structured execution:** run Codex workflows as durable stage artifacts instead of one-off prompts.
- **Auditable local automation:** keep prompts, inputs, outputs, traces, reports, and validation commands on disk.
- **Single installation surface:** add one marketplace, manage the suite from one repository.

## Quick Start

Check the Claude bridge:

```text
$claude setup
```

Ask Claude for a second opinion:

```text
$claude task: review the current uncommitted changes and challenge the architecture
```

Run an Ultracode workflow:

```text
$ultracode run a deep research workflow for this repository
```

Inspect Ultracode runs through the plugin's MCP tools:

```text
$ultracode show recent run status and final report
```

## Plugin Details

### Claude

Path: [`plugins/claude-plugin-codex`](./plugins/claude-plugin-codex)

`claude` lets Codex call the local Claude Code CLI and return Claude's final answer to the current
Codex thread.

Requirements:

- Node.js 18.18 or later
- Claude Code CLI available as `claude`
- Claude authenticated and usable from your terminal

Representative requests:

```text
$claude setup
$claude task: inspect docs/tasks/plan.md and find risks
$claude review current uncommitted changes, focus on over-engineering
```

### Codex Ultracode

Path: [`plugins/codex-ultracode`](./plugins/codex-ultracode)

`codex-ultracode` runs JSON-defined and named multi-stage Codex workflows. It writes stage inputs,
prompts, Codex events, outputs, status, and final reports under `.ultracode/runs/`.

Built-in workflow families include:

- `deep-research`
- `code-review`
- `debug-fix`
- `travel-guide`

Representative requests:

```text
$ultracode list available workflows
$ultracode run code-review for the current branch
$ultracode run debug-fix for the failing npm test case
```

## Repository Layout

```text
.agents/plugins/marketplace.json   Marketplace descriptor consumed by Codex
plugins/claude-plugin-codex/       Codex plugin that calls Claude CLI
plugins/codex-ultracode/           Codex plugin and workflow runner
scripts/check-marketplace.mjs      Root marketplace consistency check
context-kg/tasks/                  Local task plan and review notes
```

## Development

Run the full repository validation from the root:

```bash
npm test
```

That runs:

- marketplace consistency checks
- `plugins/claude-plugin-codex` tests
- `plugins/codex-ultracode/scripts` tests
- Ultracode TypeScript typecheck

Individual commands:

```bash
npm run check:marketplace
npm run test:claude
npm run test:ultracode
npm run typecheck:ultracode
```

Validate plugin manifests when changing plugin metadata:

```bash
python3 /Users/chuntao.liao/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/claude-plugin-codex
python3 /Users/chuntao.liao/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/codex-ultracode
```

## Maintenance Notes

- Keep marketplace entries under `.agents/plugins/marketplace.json`.
- Keep each plugin self-contained under `plugins/<plugin-folder>/`.
- Keep the marketplace name as `codex-plugins`; installation commands depend on it.
- Prefer root `npm test` before pushing.
- Plugin histories were imported with `git subtree`; future upstream syncs should preserve the
  same directory boundaries.
