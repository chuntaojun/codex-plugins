---
description: Ask Claude to review the implementation reasonableness of current uncommitted git changes.
argument-hint: "[optional review focus]"
allowed-tools: [Bash(git:*), Bash(node:*), Bash(claude:*)]
---

# Claude Review

Review the current git working tree implementation with Claude.

## Preflight

1. Confirm this is a git repository:

```bash
git rev-parse --show-toplevel
```

2. Check whether there are uncommitted changes:

```bash
git status --short
git diff --stat
git diff --cached --stat
```

If there are no unstaged or staged changes, tell the user there is nothing to review.

## Plan

Call the `claude_task` MCP tool with:

- `cwd`: the current Codex workspace directory
- `permissionMode`: `default`
- `prompt`: the review prompt below, plus any optional focus from `$ARGUMENTS`

Use `permissionMode: default` because this command is a review command and should not edit files.

## Commands

Use this prompt:

```text
Review the current git uncommitted changes in this repository for implementation reasonableness.

Scope:
- Include both staged and unstaged changes.
- Use git status, git diff --stat, git diff, and git diff --cached as needed.
- Do not modify files.

Focus:
- Is the implementation direction reasonable?
- Are there simpler or more robust alternatives?
- Are there correctness bugs, regressions, missing edge cases, or missing tests?
- Are there risky assumptions, over-engineering, or temporary fixes?
- If you find issues, lead with findings ordered by severity and include file/line references when possible.
- If there are no material issues, say that clearly and mention residual risks or test gaps.

Additional user focus:
$ARGUMENTS
```

## Verification

Confirm the `claude_task` result has `isError: false`. If it failed, show the tool output and status fields.

## Summary

Return Claude's review output verbatim. Do not paraphrase or add extra commentary.
