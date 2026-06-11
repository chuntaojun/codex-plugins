# Codex Plugins

[中文说明](./README.zh-CN.md)

A personal Codex plugin marketplace for agentic engineering workflows.

This repository is designed as a single installation point for the Codex tools I use every day:
cross-model delegation, workflow automation, structured reviews, and repeatable local agent runs.
Add this marketplace once, and Codex can discover the plugins in this suite from one source.

## Why This Exists

Codex is strongest when it can compose focused tools instead of carrying every responsibility in a
single context window. This marketplace packages that idea into a small, practical toolkit:

- use Claude from a Codex session when a second model should review, challenge, or execute a task
- run multi-stage Codex workflows with durable artifacts, gates, and restartable stages
- keep local automation explicit, inspectable, and versioned in Git
- install and update the whole toolkit from one marketplace repository

## Install Once

Add the marketplace:

```bash
codex plugin marketplace add chuntaojun/codex-plugins --ref main
```

Then restart Codex. The marketplace marks the included plugins as installed by default. If your
Codex build still requires explicit plugin installation, run:

```bash
codex plugin add claude@codex-plugins
codex plugin add codex-ultracode@codex-plugins
```

Refresh later:

```bash
codex plugin marketplace upgrade codex-plugins
```

## Plugin Suite

| Plugin | Purpose | Invocation |
| --- | --- | --- |
| `claude` | Use Claude CLI from inside Codex for review, critique, implementation, and focused second-opinion passes. | `$claude setup`, `$claude task: review the current diff` |
| `codex-ultracode` | Run JSON-defined, multi-stage Codex workflows with artifacts, gates, worktrees, named workflows, and MCP inspection tools. | `$ultracode ...`, `ultracode_run`, `ultracode_status` |

## Included Plugins

### Claude

Path: [`plugins/claude-plugin-codex`](./plugins/claude-plugin-codex)

`claude` is a Codex plugin that lets Codex call the local Claude Code CLI and bring Claude's final
answer back into the current Codex thread. It is useful when you want a second model to:

- review a design, plan, or uncommitted diff
- challenge implementation direction before a commit
- run a focused implementation pass in the same workspace
- compare reasoning between Codex and Claude without manually switching tools

Requirements:

- Claude Code CLI available as `claude`
- Claude authenticated in your terminal
- Node.js 18.18 or later

First check:

```text
$claude setup
```

Example:

```text
$claude task: review the current uncommitted changes and challenge the architecture
```

### Codex Ultracode

Path: [`plugins/codex-ultracode`](./plugins/codex-ultracode)

`codex-ultracode` is a workflow runner for Codex. It turns JSON workflow definitions into isolated,
stage-by-stage Codex runs, writing trace files, status files, stage results, review artifacts, and
final reports to disk.

It is useful when a one-shot prompt is not enough:

- multi-stage research, review, debug, and implementation plans
- restartable or reworkable stages
- command gates after agent output
- named workflows such as travel guide, deep research, code review, and debug/fix
- MCP tools for status, tail, report, and run management

Example:

```text
$ultracode run a deep research workflow for this repository
```

## Repository Layout

```text
.agents/plugins/marketplace.json   Codex marketplace descriptor
plugins/claude-plugin-codex/       Codex plugin for calling Claude CLI
plugins/codex-ultracode/           Codex workflow runner plugin
context-kg/tasks/                  Local task notes and verification history
```

## Development

Validate Claude plugin:

```bash
cd plugins/claude-plugin-codex
npm test
```

Validate Ultracode:

```bash
cd plugins/codex-ultracode/scripts
npm test
npm run typecheck
```

Validate plugin manifests:

```bash
python3 /Users/chuntao.liao/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/claude-plugin-codex
python3 /Users/chuntao.liao/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/codex-ultracode
```

## Notes

- This repository is intentionally a marketplace, not just a source-code dump.
- Each plugin remains self-contained under `plugins/<plugin-folder>/`.
- The marketplace name is `codex-plugins`.
- Source histories were imported with `git subtree` so each plugin can still be reasoned about as
  its own project inside the suite.
