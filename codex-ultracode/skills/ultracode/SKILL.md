---
name: ultracode
description: Optional adapter for invoking Ultracode from Codex through MCP or the ultracode binary.
---

# Ultracode Skill

Use this skill only as a thin adapter when the user wants Codex to invoke the local Ultracode runner. The workflow runtime is `ultracode`; Codex-internal triggering should prefer named MCP workflows when a registered workflow fits the request.

## Input Contract

For the preferred named workflow flow, infer:

- `cwd`: current repository checkout directory when using MCP
- `workflowName`: registered workflow name under `skills/ultracode/workflows/`
- `intent`: the user's natural-language task request
- `params`: optional structured fields extracted from the request

Do not ask the user for `runId`, `outputDir`, or `worktreeDir` unless they explicitly need deterministic reproduction or a custom artifact location.

For open-ended tasks that may need a new workflow shape, infer:

- `intent`: the user's natural-language task request
- `cwd`: current repository checkout directory for ready-to-call execution arguments and dynamic plan artifacts
- `outputPlan`: optional override for a reusable plan artifact path; omit it unless a deterministic path is required; relative values require `cwd`
- `planFile`: reviewed dynamic plan artifact returned by `ultracode_dispatch` or `ultracode_plan_dynamic`, only after the user has confirmed it
- `approved`: must be `true` before dynamic execution

For the explicit JSON flow, collect or infer:

- `workflowFile`: path to a workflow JSON file
- `paramFile`: path to a parameter JSON file
- `outputDir`: optional; default `.ultracode/runs/<workflow-file-name>-<timestamp>`
- `runId`: optional stable id for the run branch, worktree, and default output directory
- `worktreeDir`: optional explicit run worktree directory

## Execution

For open-ended user requests, call `ultracode_dispatch` first with the current workspace `cwd`, the user's intent, and any extracted structured `params`. If `dispatch.action` is `ran_named`, the matching read-only named workflow has already run; use `inspection` from the result for status, report, and artifact follow-up. If `dispatch.action` is `needs_confirmation`, show the returned preview and ask for user approval before calling the tool named by `executionAfterApproval.tool` with `executionAfterApproval.arguments`. Write-capable named workflow previews use `ultracode_run_named` with `approved: true`; dynamic workflow previews use `ultracode_run_dynamic`. Do not reconstruct these arguments manually; they preserve user-provided `params` and any explicit `runId`, `outputDir`, or `worktreeDir`. After an approved write-capable named run, use `approvedNamedWorkflowFile` or `inspection.approvedNamedWorkflowFile` as the approval audit record.

If the user names Ultracode and explicitly asks to inspect available workflows before running, call `ultracode_list_workflows` first, then call `ultracode_describe_workflow` for the most likely match.

Use `ultracode_plan_dynamic` only when the user explicitly wants planning without auto-running matching named workflows. If its result is `run_named`, show the returned `workflow`, `preview.summary`, `preview.stagePlan`, `preview.writeStages`, and `preview.outputFiles`. Read-only named previews point to direct `execution.arguments`; use them when present. If the result has `requiresConfirmation: true`, ask for user approval first and then call `executionAfterApproval.tool` with `executionAfterApproval.arguments`; this is required for write-capable named workflows and those arguments include `approved: true`. Approved write-capable named runs store `<outputDir>/approved-named-workflow.json`; MCP returns it as `approvedNamedWorkflowFile` and `inspection.approvedNamedWorkflowFile`. If a named workflow preview has neither `execution` nor `executionAfterApproval` because `cwd` was omitted, re-run `ultracode_plan_dynamic` with `cwd` before execution. This path does not create a plan artifact by default. If the result is `review_dynamic`, Ultracode will generate a reusable `planFile` under `.ultracode/plans/` when `cwd` is provided; pass `outputPlan` only when a deterministic path is needed, and only use a relative `outputPlan` together with `cwd`. Show `preview.template`, `preview.summary`, `preview.stagePlan`, `preview.writeStages`, `preview.outputFiles`, `preview.risks`, the returned `planFile`, and the full workflow JSON before asking for confirmation. If a dynamic preview lacks `executionAfterApproval` because `cwd` was omitted, re-run `ultracode_plan_dynamic` with `cwd` before execution so the approved workflow runs in the intended workspace. The dynamic planner may produce debug/fix, code-change, research, content-deliverable, or generic templates; the selected template is stored in `preview.template`, and `reason` explains why it was selected. Debug/fix templates use reproduce -> diagnose -> implement -> verify with only `implement-fix` in write mode. Content-deliverable templates use deliverable-brief -> draft-deliverable -> review-deliverable for guides, release notes, proposals, docs, emails, announcements, and similar artifact-first tasks without repository write mode. Explicit content deliverables take priority over generic changes/change wording, so release notes or changelogs from repository changes remain read-only unless the user asks to edit files. Code-change templates can include an `agent.mode: "write"` implementation stage, but only run write stages after confirmation through `ultracode_run_dynamic` with `approved: true` and the reviewed `planFile`. After confirmation, use `executionAfterApproval.arguments` from the plan result so execution uses the exact reviewed plan. Runs started from `planFile` store the approved snapshot at `<outputDir>/approved-plan.json`; the snapshot includes `sourcePlanFile`, the reviewed plan, and the effective params / execution context used by this run. During `ultracode_run_dynamic`, saved plan-file params are the base and explicit `params` deep-merge over them; saved `runId`, `outputDir`, and `worktreeDir` are reused when omitted, while explicit arguments override saved context. MCP returns the approved snapshot path as `approvedPlanFile`.

When a registered workflow fits the request, call `ultracode_run_named` with:

```json
{
  "cwd": "<current repo root>",
  "workflowName": "travel-guide",
  "intent": "<user-facing task request>",
  "params": {
    "trip": {
      "destination": "Kyoto, Japan",
      "durationDays": 3
    }
  }
}
```

Use `ultracode_run` only when the user explicitly provides workflow and param JSON files:

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

Use `ultracode_run_dynamic` only after the user has confirmed a dynamic workflow preview, and pass the reviewed `planFile` returned by `ultracode_dispatch` or `ultracode_plan_dynamic`:

```json
{
  "cwd": "<current repo root>",
  "approved": true,
  "planFile": ".ultracode/plans/example.plan.json",
  "params": {}
}
```

After any MCP run tool returns (`ultracode_run`, `ultracode_run_named`, or `ultracode_run_dynamic`), use `structuredContent.inspection` for follow-up display. MCP restart/rework calls also return `structuredContent.inspection` when invoked with `cwd + runId`; use it immediately after stage actions instead of reconstructing follow-up calls. Prefer `inspection.status.arguments`, `inspection.tail.arguments`, `inspection.report.arguments`, `inspection.artifact.arguments`, concrete per-stage `inspection.stages[].restartStage.arguments` / `inspection.stages[].reworkStage.arguments`, and per-stage `inspection.stages[].artifact` metadata instead of reconstructing `outputDir`, `runId`, stage names, or artifact paths manually. Status, tail, report, and stage-action arguments are normally `cwd + runId`; `inspection.outputDir` is retained for audit/debug context. For approved runs, prefer `inspection.approvedNamedWorkflowFile` or `inspection.approvedPlanFile` as the relevant approval audit record. Use the generic `inspection.restartStage` / `inspection.reworkStage` templates only when the desired stage is not listed in `inspection.stages`.

Use these MCP tools to inspect an existing run:

- `ultracode_list_workflows`: available registered workflows
- `ultracode_describe_workflow`: workflow files, parameter template, and README content
- `ultracode_dispatch`: one-call open-ended intent handling; runs matching read-only named workflows, returns confirmation previews for write-capable named workflows, or returns dynamic previews requiring confirmation
- `ultracode_plan_dynamic`: recommends a named workflow or returns a constrained dynamic workflow preview; pass `cwd` for ready-to-call execution arguments and dynamic preview plan artifacts
- `ultracode_run_dynamic`: validates and runs a confirmed dynamic workflow preview from a reviewed `planFile`
- `ultracode_restart_stage`: retry one stage with the same input as its latest attempt; accepts `outputDir` or `cwd` plus `runId`
- `ultracode_rework_stage`: retry one stage with structured feedback in `input.rework`; accepts `outputDir` or `cwd` plus `runId`
- `ultracode_list_runs`: recent runs from the current checkout and sibling run worktrees
- `ultracode_artifact`: final artifact path and preview for a run id
- `ultracode_prune_runs`: remove selected run artifact directories, with explicit opt-in for matching sibling run worktrees
- `ultracode_status`: stage progress, current stage, session ids, failed gates; accepts `outputDir` or `cwd` plus `runId`
- `ultracode_tail`: recent `trace.jsonl` events; accepts `outputDir` or `cwd` plus `runId`
- `ultracode_report`: final summary and final artifact preview; accepts `outputDir` or `cwd` plus `runId`

Use the CLI when MCP is not available or when running from a terminal or CI. The CLI automatically prepares the run worktree:

```bash
node "$SKILL_DIR/../../scripts/run-ultracode.mjs" help
node "$SKILL_DIR/../../scripts/run-ultracode.mjs" "<task intent>"
node "$SKILL_DIR/../../scripts/run-ultracode.mjs" "<workflow-name>" "<task intent>" --params '<json object>'
node "$SKILL_DIR/../../scripts/run-ultracode.mjs" run-dynamic --plan-file "<reviewed-plan-file>" --approved true
node "$SKILL_DIR/../../scripts/run-ultracode.mjs" restart-stage "<runId-or-outputDir>" "<stage-name>"
node "$SKILL_DIR/../../scripts/run-ultracode.mjs" rework-stage "<runId-or-outputDir>" "<stage-name>" --feedback '<json object>'
node "$SKILL_DIR/../../scripts/run-ultracode.mjs" rework-stage "<runId-or-outputDir>" "<stage-name>" --feedback '<json object>' --cascade true
node "$SKILL_DIR/../../scripts/run-ultracode.mjs" list-runs
node "$SKILL_DIR/../../scripts/run-ultracode.mjs" artifact "<run-id>"
node "$SKILL_DIR/../../scripts/run-ultracode.mjs" prune-runs "<run-id>[,<run-id>]"
node "$SKILL_DIR/../../scripts/run-ultracode.mjs" run "<workflow.json>" "<param.json>"
```

Add `--outputDir "<path>"` when the user requests a specific artifact directory. Add `--worktreeDir "<path>"` or `--worktree-dir "<path>"` only when the user wants a specific worktree location.

The installed package also exposes this binary name:

```bash
ultracode help
ultracode "<task intent>"
ultracode "<workflow-name>" "<task intent>" --params '<json object>'
ultracode run-dynamic --plan-file "<reviewed-plan-file>" --approved true
ultracode restart-stage "<runId-or-outputDir>" "<stage-name>"
ultracode rework-stage "<runId-or-outputDir>" "<stage-name>" --feedback '<json object>'
ultracode rework-stage "<runId-or-outputDir>" "<stage-name>" --feedback '<json object>' --cascade true
ultracode list-runs
ultracode artifact "<run-id>"
ultracode prune-runs "<run-id>[,<run-id>]"
ultracode run "<workflow.json>" "<param.json>"
```

Use these CLI inspection commands for terminal display:

```bash
ultracode help
ultracode list-workflows
ultracode describe-workflow "<workflow-name>"
ultracode "<task intent>"
ultracode plan-dynamic --intent "<task intent>"
ultracode run-dynamic --plan-file "<reviewed-plan-file>" --approved true
ultracode restart-stage "<runId-or-outputDir>" "<stage-name>"
ultracode rework-stage "<runId-or-outputDir>" "<stage-name>" --feedback '<json object>'
ultracode rework-stage "<runId-or-outputDir>" "<stage-name>" --feedback '<json object>' --cascade true
ultracode list-runs
ultracode artifact "<run-id>"
ultracode prune-runs "<run-id>[,<run-id>]"
ultracode status "<runId-or-outputDir>"
ultracode tail "<runId-or-outputDir>" --limit 20
ultracode report "<runId-or-outputDir>"
ultracode watch "<runId-or-outputDir>"
```

## Rules

- Prefer `ultracode_dispatch` for Codex-internal triggering of open-ended Ultracode requests.
- Prefer CLI `ultracode "<task intent>"` when MCP is unavailable but the user still wants intent-first terminal execution. It mirrors `ultracode_dispatch`: read-only named workflows may run immediately; write-capable named workflows and dynamic workflows require confirmation. In `--json` output, read-only named auto-runs return one parseable payload with `dispatch.action: "ran_named"`; direct named executions through `run-name` or `ultracode <workflow-name> "<task intent>" --json` return the same run payload without the dispatch envelope. Use `inspection` and `followUp` from these payloads for report/status/tail commands. For approval-gated previews, prefer `executionAfterApproval.nextCommand` and honor `executionAfterApproval.confirmationGate`; top-level `nextCommand` is kept as a compatibility shortcut. For dynamic previews, use the approval command because it preserves explicit `--params`, `--run-id`, `--outputDir`, and `--worktree-dir`.
- For write-capable named workflow confirmations in CLI, use the returned `ultracode <workflow-name> "<task intent>" --approved true` next command instead of reconstructing `run-name --intent` manually. Direct CLI execution of write-capable named workflows without `--approved true` is rejected.
- Prefer CLI `ultracode "<workflow-name>" "<task intent>"` when the workflow name is already known and MCP is unavailable.
- Prefer `ultracode_run_named` only when the workflow name is already known and the user is clearly asking for that registered workflow.
- Use `ultracode_run` for explicit workflow/param JSON files; use CLI as fallback or for local/CI execution.
- Use `ultracode_plan_dynamic` before any dynamic workflow design. Treat `review_dynamic` as a preview requiring confirmation.
- CLI `plan-dynamic --intent "<task intent>"` writes a reusable plan artifact by default for `review_dynamic` previews, prints/returns explicit `Approval required: yes`, and prints/returns the exact `run-dynamic --plan-file ... --approved true` approval command. For `run_named` recommendations, it prints/returns the workflow stage plan, write stages, output files, and explicit `Approval required: yes/no` without creating a plan file; in `--json` output, use `preview.template`, `preview.summary`, `preview.stagePlan`, `preview.writeStages`, `preview.outputFiles`, and `preview.risks` for display. Read-only named workflows return `execution.nextCommand` with `approvalRequired: false`; top-level `nextCommand` is kept as a compatibility shortcut. Approval-gated named or dynamic previews return `requiresConfirmation: true` and put the command under `executionAfterApproval.nextCommand` with `executionAfterApproval.confirmationGate`. Pass `--output-plan` only when a deterministic artifact path is required. If explicit `--params`, `--run-id`, `--outputDir`, or `--worktree-dir` are passed, use the returned approval command because it preserves them.
- When `ultracode_dispatch` returns `dispatch.action: "needs_confirmation"`, do not execute until the user approves the preview. Use `executionAfterApproval.tool` and `executionAfterApproval.arguments` after approval; this can be either `ultracode_run_named` for write-capable named workflows or `ultracode_run_dynamic` for dynamic workflows. For write-capable named workflows, these arguments include `approved: true`; for dynamic workflows, these arguments preserve the original `params` and any explicit advanced execution controls.
- When write-capable named execution is approved, use `approvedNamedWorkflowFile`, `inspection.approvedNamedWorkflowFile`, or `<outputDir>/approved-named-workflow.json` as the audit record of the approved named workflow and generated params.
- Pass `cwd` to `ultracode_plan_dynamic` whenever possible. Use `execution.arguments` directly for read-only `run_named`; use `executionAfterApproval.arguments` after approval for write-capable `run_named` and confirmed `review_dynamic`; if neither field is present on a named or dynamic preview, re-plan with `cwd` before running. Use the returned `planFile` only for confirmed `review_dynamic` execution. Use `outputPlan` only when a deterministic plan artifact path is required; relative `outputPlan` requires `cwd`.
- When `ultracode_plan_dynamic` returns `execution`, use its `arguments` for the recommended named workflow instead of reconstructing tool inputs manually.
- When `ultracode_plan_dynamic` returns `executionAfterApproval`, use its `arguments` only after the user has confirmed the preview.
- When presenting a dynamic preview, summarize `preview.template`, `preview.summary`, and `preview.stagePlan` first, and show the full workflow JSON second. Do not ask the user to approve raw JSON without the preview template, summary, and stage plan.
- MCP dynamic execution must use `ultracode_run_dynamic` with the reviewed `planFile`; do not pass `intent` or raw workflow JSON directly to `ultracode_run_dynamic`.
- For CLI dynamic execution, always use `run-dynamic --plan-file "<reviewed-plan-file>" --approved true`; add `--json` for scripted/Codex fallback execution so stdout is one run payload with `workflow`, `worktree`, `inspection`, `result`, `followUp`, and `approvedPlanFile`. Do not use intent-only dynamic execution because it would replan at execution time.
- For explicit CLI workflow/param execution, use `ultracode run <workflow.json> <param.json> --json` when another tool needs structured output; stdout is one run payload with `workflow`, `worktree`, `inspection`, `result`, and `followUp`.
- When dynamic execution uses `planFile`, use `approvedPlanFile` or `<outputDir>/approved-plan.json` as the audit record of the user-approved plan. The audit record preserves the effective `params` and execution context actually used by this run. `run-dynamic` uses plan-file `params` as the base and deep-merges explicit params over it; `runId`, `outputDir`, and `worktreeDir` fall back to plan-file values when no explicit replacements are provided.
- After any MCP run or stage-action execution, use `inspection` from the tool result to call status, tail, report, artifact, restart-stage, or rework-stage tools. Do not infer these arguments manually when `inspection` is present.
- When showing a specific stage output or deciding which stage to rework, prefer `inspection.stages[].artifact.outputFile` and related metadata (`resultFile`, `attemptDir`, `stageDir`, `sessionId`) over reading `workflow-result.json` manually.
- After any CLI run execution or non-JSON CLI restart/rework execution, prefer the `workflow.next_actions` event for follow-up terminal commands. It uses the run id and avoids copying `outputDir`.
- Use `ultracode_run_dynamic` only after confirmation. It requires `approved: true`, requires `planFile`, and validates the workflow before execution.
- Dynamic workflows must not include gate commands, unsupported stage types, invalid agent modes, unknown dependencies, cyclic dependencies, absolute output paths, or `..` output paths.
- Dynamic debug/fix and code-change workflows may include exactly scoped write-mode stages generated by the planner preview. Do not run them until the user has reviewed and confirmed the workflow.
- Workflow stages run in `dependsOn` dependency order. Forward dependencies are valid when the dependency graph is complete and acyclic.
- Use `ultracode_restart_stage` when a stage should be retried with the exact same input, such as transient agent failure or interrupted output. Prefer `cwd` plus `runId` when the run id is known.
- Use `ultracode_rework_stage` when there is concrete reviewer/user feedback. Put feedback in a JSON object with concise comments or fields. Prefer `cwd` plus `runId` when the run id is known.
- Restart/rework reruns only the selected stage by default and refreshes workflow status.
- Set `cascade: true` only when the user wants downstream stages regenerated from the new upstream output. Cascade rerenders transitive downstream stage inputs from `workflow.json` and replaces their latest results.
- Use `ultracode_list_runs` when the user refers to a recent run but does not provide `outputDir`.
- Use `ultracode_artifact` when the user asks for the final output, artifact, file path, or preview for a run id.
- For MCP inspection, prefer `inspection.status.arguments`, `inspection.tail.arguments`, `inspection.report.arguments`, `inspection.artifact.arguments`, and per-stage `inspection.stages[].restartStage.arguments` / `inspection.stages[].reworkStage.arguments` when available. If only a run id is known, call `ultracode_status`, `ultracode_tail`, `ultracode_report`, `ultracode_restart_stage`, or `ultracode_rework_stage` with `cwd` and `runId`.
- In CLI fallback, prefer `ultracode report "<run-id>"`, `ultracode status "<run-id>"`, `ultracode tail "<run-id>"`, `ultracode restart-stage "<run-id>" "<stage-name>"`, and `ultracode rework-stage "<run-id>" "<stage-name>" --feedback '<json object>'`; these commands accept either run id or output directory.
- For scripted CLI restart/rework handling, pass `--json`; stdout is a single JSON payload with the final action result and `followUp.commands`, while stage events stay in the run's `trace.jsonl`.
- Use `ultracode_prune_runs` only when the user explicitly asks to remove run artifacts. By default it removes `.ultracode/runs/<run-id>` directories only. Pass MCP `removeWorktrees: true` or CLI `--worktrees true` only when the user explicitly asks to also remove matching sibling run worktrees. Linked Git worktrees are removed through `git worktree remove --force`; do not delete linked worktree directories manually. Non-JSON CLI prune output lists removed worktree roots when worktree cleanup is enabled.
- Prefer `ultracode_status`, `ultracode_tail`, and `ultracode_report` for Codex-internal display instead of streaming raw runner stdout through MCP.
- CLI named shortcuts, `ultracode run-name`, and `ultracode run` create a sibling linked git worktree when invoked from the primary checkout, and reuse the current directory when invoked from an existing linked worktree.
- Do not run workflows from non-git directories or git submodules.
- Prefer `read-only` unless the user explicitly asks to modify code.
- Always write artifacts under `.ultracode/runs/`.
- Registered workflows live under `skills/ultracode/workflows/<name>/` and include `workflow.json`, `param.template.json`, and optional `README.md`.
- Add concise `keywords` to registered `workflow.json` files. `ultracode_plan_dynamic` uses workflow name, description, and keywords to recommend named workflows before generating a dynamic workflow.
- Treat every stage as an isolated context window. Pass data between stages only through `input.json`, artifact files, structured stage results, and explicit rework feedback.
- Store stage runtime files under `stages/<stage>/attempts/<attempt>/` with `stage.json`, `input.json`, `prompt.md`, `codex-events.jsonl`, `codex-stdout.log`, `codex-stderr.log`, `session.json`, agent output, optional `gate-result.json`, and `result.json`.
- Preserve each stage's Codex session id in `session.json` and `result.json` when Codex emits one.
- Use `status.json` for live stage display. It should show `pending`, `running`, `passed`, and `failed` without exposing hidden reasoning.
- Use gates as runner-owned checks after a stage completes. Do not rely on an agent's self-reported success when a command gate is available.
- Model restart as the same stage with the same input. Model rework as a new attempt that includes structured feedback from a failed gate or review stage.
- Return the final report path, summary, risks, and recommended next action.
- Do not expose internal runner implementation unless the user asks.
