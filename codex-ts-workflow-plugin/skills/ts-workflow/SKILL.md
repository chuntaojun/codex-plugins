---
name: ts-workflow
description: Optional adapter for invoking Harness Workflow from Codex through MCP or the harness-cli binary.
---

# TS Workflow Skill

Use this skill only as a thin adapter when the user wants Codex to invoke the local Harness Workflow runner. The workflow runtime is `harness-cli`; Codex-internal triggering should prefer the MCP tool.

## Input Contract

For the binary-first flow, collect or infer:

- `cwd`: current repository checkout directory when using MCP
- `workflowFile`: path to a workflow JSON file
- `paramFile`: path to a parameter JSON file
- `outputDir`: optional; default `.codex-workflows/runs/<workflow-file-name>-<timestamp>`
- `runId`: optional stable id for the run branch, worktree, and default output directory
- `worktreeDir`: optional explicit run worktree directory

## Execution

When the Harness Workflow MCP tool is available, call `run_workflow` with:

```json
{
  "cwd": "<current repo root>",
  "workflowFile": "<workflow.json>",
  "paramFile": "<param.json>",
  "outputDir": "<optional-output-dir>",
  "runId": "<optional-run-id>",
  "worktreeDir": "<optional-worktree-dir>"
}
```

Use these MCP tools to inspect an existing run:

- `workflow_status`: stage progress, current stage, session ids, failed gates
- `workflow_tail`: recent `trace.jsonl` events
- `workflow_report`: final summary and final artifact preview

Use the CLI when MCP is not available or when running from a terminal or CI. The CLI automatically prepares the run worktree:

```bash
node "$SKILL_DIR/../../scripts/run-workflow.mjs" run "<workflow.json>" "<param.json>"
```

Add `--outputDir "<path>"` when the user requests a specific artifact directory. Add `--worktreeDir "<path>"` or `--worktree-dir "<path>"` only when the user wants a specific worktree location.

The installed package also exposes this binary name:

```bash
harness-cli run "<workflow.json>" "<param.json>"
```

Use these CLI inspection commands for terminal display:

```bash
harness-cli status "<outputDir>"
harness-cli tail "<outputDir>" --limit 20
harness-cli report "<outputDir>"
harness-cli watch "<outputDir>"
```

## Rules

- Prefer the `run_workflow` MCP tool for Codex-internal triggering; use CLI as fallback or for local/CI execution.
- Prefer `workflow_status`, `workflow_tail`, and `workflow_report` for Codex-internal display instead of streaming raw runner stdout through MCP.
- `harness-cli run` creates a sibling linked git worktree when invoked from the primary checkout, and reuses the current directory when invoked from an existing linked worktree.
- Do not run workflows from non-git directories or git submodules.
- Prefer `read-only` unless the user explicitly asks to modify code.
- Always write artifacts under `.codex-workflows/runs/`.
- Treat every stage as an isolated context window. Pass data between stages only through `input.json`, artifact files, structured stage results, and explicit rework feedback.
- Store stage runtime files under `stages/<stage>/attempts/<attempt>/` with `stage.json`, `input.json`, `prompt.md`, `codex-events.jsonl`, `codex-stdout.log`, `codex-stderr.log`, `session.json`, agent output, optional `gate-result.json`, and `result.json`.
- Preserve each stage's Codex session id in `session.json` and `result.json` when Codex emits one.
- Use `status.json` for live stage display. It should show `pending`, `running`, `passed`, and `failed` without exposing hidden reasoning.
- Use gates as runner-owned checks after a stage completes. Do not rely on an agent's self-reported success when a command gate is available.
- Model restart as the same stage with the same input. Model rework as a new attempt that includes structured feedback from a failed gate or review stage.
- Return the final report path, summary, risks, and recommended next action.
- Do not expose internal runner implementation unless the user asks.
