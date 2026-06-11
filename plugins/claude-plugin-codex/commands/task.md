---
description: Ask Claude CLI to execute an arbitrary task and return the result to the current Codex agent.
argument-hint: "[--model <model>] [--effort <low|medium|high|xhigh|max>] [--permission-mode <mode>|--dangerous] [task]"
allowed-tools: [Bash(node:*), Bash(claude:*)]
---

# Claude Task

The user invoked this command with:

```text
$ARGUMENTS
```

## Preflight

1. If no task text was provided, ask the user what Claude should do.
2. Call the `claude_setup` MCP tool. Stop if setup reports Claude is not ready.

## Plan

Delegate the task to Claude CLI in the current workspace, then return Claude's final result to the current Codex agent.

- Default permission mode is Claude's highest permission path: `bypassPermissions` plus `--dangerously-skip-permissions`.
- Use an explicit `--permission-mode` only when the user asks to lower permissions for a run.
- Use `--dangerous` only when the user explicitly includes it.
- Forward `--model`, `--effort`, `--permission-mode`, `--allowed-tools`, `--disallowed-tools`, and `--add-dir` when present.

## Commands

Call the `claude_task` MCP tool with:

- `prompt`: the task text from `$ARGUMENTS`
- `cwd`: the current Codex workspace directory

Forward optional runtime fields only when the user supplied them.

## Verification

Confirm the tool result has `isError: false`. If it failed, show the tool output and status fields.

## Summary

Return Claude's output verbatim. Do not paraphrase, summarize, or add extra commentary before or after it.
