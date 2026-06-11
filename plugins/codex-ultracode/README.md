# Codex Ultracode

[中文说明](./README.zh-CN.md)

Codex Ultracode is a local Codex plugin and workflow runner for JSON-defined, multi-stage Codex workflows. It can run each stage in an isolated git worktree, persist stage artifacts, and expose run status through both CLI and MCP tools.

## What It Does

- Runs registered workflows by name with `ultracode <workflow-name> "<task intent>"`.
- Still supports explicit workflow JSON files with `ultracode run <workflow.json> <param.json>`.
- Starts each `type=codex` stage as a separate `codex exec --json` call.
- Stores every stage attempt under `.ultracode/runs/<run-id>/stages/...`.
- Captures prompts, inputs, outputs, Codex events, stdout/stderr logs, session metadata, gate results, and final workflow status.
- Provides MCP tools for Codex-internal triggering and inspection.
- Keeps runtime semantics in the local `ultracode` binary; the Skill is only a thin adapter.

## Entrypoints

### CLI

From the repository root:

```bash
node scripts/run-ultracode.mjs travel-guide \
  "Create a relaxed 3-day Kyoto guide for two first-time adult visitors, including rainy-day alternatives." \
  --params '{"trip":{"destination":"Kyoto, Japan","durationDays":3,"season":"spring","travelers":"two adults visiting for the first time"}}'
```

Inspect a completed or running workflow:

```bash
node scripts/run-ultracode.mjs help
node scripts/run-ultracode.mjs list-workflows
node scripts/run-ultracode.mjs describe-workflow travel-guide
node scripts/run-ultracode.mjs "Review the current implementation plan and produce a risk report"
node scripts/run-ultracode.mjs plan-dynamic --intent "Create a Kyoto travel guide"
node scripts/run-ultracode.mjs run-dynamic --plan-file .ultracode/plans/<reviewed-plan>.plan.json --approved true
node scripts/run-ultracode.mjs restart-stage <runId-or-outputDir> <stageName>
node scripts/run-ultracode.mjs rework-stage <runId-or-outputDir> <stageName> --feedback '{"comments":["Add rollout risks"]}'
node scripts/run-ultracode.mjs rework-stage <runId-or-outputDir> <stageName> --feedback '{"comments":["Add rollout risks"]}' --cascade true
node scripts/run-ultracode.mjs list-runs
node scripts/run-ultracode.mjs artifact <runId>
node scripts/run-ultracode.mjs prune-runs <runId>
node scripts/run-ultracode.mjs status <runId-or-outputDir>
node scripts/run-ultracode.mjs tail <runId-or-outputDir> --limit 20
node scripts/run-ultracode.mjs report <runId-or-outputDir>
node scripts/run-ultracode.mjs watch <runId-or-outputDir>
```

When installed as a package, the equivalent binary is:

```bash
ultracode help
ultracode <workflow-name> "<task intent>" --params '<json object>'
ultracode "<task intent>"
ultracode plan-dynamic --intent "<task intent>"
ultracode run-dynamic --plan-file <reviewed-plan-file> --approved true
ultracode restart-stage <runId-or-outputDir> <stageName>
ultracode rework-stage <runId-or-outputDir> <stageName> --feedback '<json object>'
ultracode list-runs
ultracode artifact <runId>
ultracode prune-runs <runId>[,<runId>]
ultracode run <workflow.json> <param.json>
```

`ultracode help` and `ultracode --help` print the same task-first command summary. Advanced controls such as `runId`, `outputDir`, and `worktreeDir` are optional and normally unnecessary.

### MCP

The plugin declares an MCP server in [`.mcp.json`](./.mcp.json):

```json
{
  "mcpServers": {
    "ultracode": {
      "command": "node",
      "args": ["./scripts/run-mcp.mjs"],
      "cwd": "."
    }
  }
}
```

Available tools:

- `ultracode_run`: run a workflow from workflow/param JSON files.
- `ultracode_run_named`: run a registered workflow by name with natural-language intent and optional structured params. Write-capable named workflows require `approved: true`; read-only named workflows do not.
- `ultracode_list_workflows`: list registered named workflows.
- `ultracode_describe_workflow`: describe one registered workflow and include its README when present.
- `ultracode_dispatch`: handle an open-ended task intent in one call. It runs a matching read-only named workflow immediately, returns a confirmation preview for a write-capable named workflow, or returns a dynamic workflow preview when no registered workflow fits.
- `ultracode_plan_dynamic`: plan how to handle a task intent; recommends a named workflow when possible or returns a constrained task-aware dynamic workflow preview. Pass `cwd` so named workflow recommendations can return workflow/preview details plus ready-to-call execution arguments, and dynamic previews can save reusable plan artifacts plus approved execution arguments. If `cwd` is omitted for a named or dynamic recommendation, the preview is informational only and you should plan again with `cwd` before running it. Pass `outputPlan` only to force a specific plan artifact path; relative `outputPlan` values require `cwd`. Dynamic fallback templates include debug/fix, code-change, research, content deliverables such as guides or release notes, and a generic scoped task flow. Dynamic previews include `preview.template` so Codex can explain and audit which template was selected.
- `ultracode_run_dynamic`: run an approved dynamic workflow from a reviewed `planFile`. It requires `approved: true` and `planFile`, and rejects unsafe dynamic features such as gates, unsupported stage types, invalid agent modes, unknown dependencies, dependency cycles, and unsafe output paths.
- `ultracode_restart_stage`: create the next attempt for a stage using the same input as the latest attempt; accepts an artifact directory or `cwd + runId`.
- `ultracode_rework_stage`: create the next attempt for a stage with structured feedback added to `input.rework`; accepts an artifact directory or `cwd + runId`.
- `ultracode_list_runs`: list recent runs from the current checkout and sibling run worktrees.
- `ultracode_artifact`: return the final artifact path and preview for a run id.
- `ultracode_prune_runs`: remove selected run artifact directories, with an explicit opt-in for matching sibling run worktrees.
- `ultracode_status`: read stage status from an artifact directory or `cwd + runId`.
- `ultracode_tail`: read recent trace events from an artifact directory or `cwd + runId`.
- `ultracode_report`: read a final summary and artifact preview from an artifact directory or `cwd + runId`.

All MCP run tools return `inspection` with ready-to-call arguments for `ultracode_status`, `ultracode_tail`, `ultracode_report`, and `ultracode_artifact`. MCP restart/rework calls also return `inspection` when invoked with `cwd + runId`. They include generic `inspection.restartStage` / `inspection.reworkStage` templates and, when stage results are available, concrete per-stage templates in `inspection.stages[]`. Each stage entry can include `artifact` metadata for the latest attempt, including `outputFile`, `resultFile`, `attemptDir`, `stageDir`, and `sessionId`, so Codex can display or rework a stage without reconstructing artifact paths. Status, tail, report, and stage-action arguments use `cwd + runId` by default; `inspection.outputDir` is kept for audit/debug context. Dynamic runs from a plan file include `approvedPlanFile` and `inspection.approvedPlanFile`. Approved write-capable named runs include `approvedNamedWorkflowFile` and `inspection.approvedNamedWorkflowFile`, which point to `<outputDir>/approved-named-workflow.json`.

## Codex Installation

Preferred install path: use the `codex-plugins` marketplace:

```bash
codex plugin marketplace add chuntaojun/codex-plugins --ref main
```

Restart Codex, then use the plugin with Codex's plugin mention syntax:

```text
$ultracode list available workflows
```

If your Codex build requires explicit plugin installation after adding the marketplace:

```bash
codex plugin add codex-ultracode@codex-plugins
```

### Standalone Local Development

For standalone local development outside the marketplace suite, register the plugin in a local marketplace:

```bash
ln -s /path/to/codex-ultracode /Users/chuntao.liao/plugins/codex-ultracode
codex plugin add codex-ultracode@local
codex plugin list --marketplace local
```

During local development, refresh the plugin cachebuster before reinstalling:

```bash
python3 /Users/chuntao.liao/.codex/skills/.system/plugin-creator/scripts/update_plugin_cachebuster.py \
  /path/to/codex-ultracode

codex plugin add codex-ultracode@local
```

Start a new Codex thread after reinstalling so Codex picks up updated skills and MCP tools.

## Built-in Named Workflows

Packaged workflows live under [`skills/ultracode/workflows/`](./skills/ultracode/workflows/). They can be triggered by name or through `ultracode "<task intent>"` dispatch:

| Workflow | Mode | Use it for |
| --- | --- | --- |
| `deep-research` | read-only | Multi-stage research: scope the question, map evidence, synthesize a report, and review uncertainty. |
| `code-review` | read-only | Repository or diff review with findings first, ordered by severity and residual risk. |
| `debug-fix` | approval-gated write | Reproduce a failure, diagnose root cause, implement a scoped fix, and verify it. |
| `travel-guide` | read-only | Practical travel guide generation with feasibility and pacing review. |

Examples:

```bash
ultracode deep-research "Research collaboration patterns for AI coding assistants in large codebases"
ultracode code-review "Review the current branch against main"
ultracode debug-fix "Fix the failing npm test case"
```

`debug-fix` contains a write stage, so dispatch and direct named execution require explicit approval before it runs.

## Example: Named Travel Guide Workflow

The installed named workflow lives in:

- [`skills/ultracode/workflows/travel-guide/workflow.json`](./skills/ultracode/workflows/travel-guide/workflow.json)
- [`skills/ultracode/workflows/travel-guide/param.template.json`](./skills/ultracode/workflows/travel-guide/param.template.json)

Run it from the repository root:

```bash
node scripts/run-ultracode.mjs travel-guide \
  "Create a 3-day spring Kyoto guide for two adults visiting for the first time. Keep the pace balanced and include rainy-day alternatives." \
  --params '{"trip":{"destination":"Kyoto, Japan","durationDays":3,"season":"spring","travelers":"two adults visiting for the first time","pace":"balanced, not rushed","constraints":["include rainy-day alternatives","avoid claiming live opening hours or ticket prices"]}}' \
  --run-id travel-guide-demo
```

The legacy file-based example is still available for CI and low-level tests:

- [`scripts/examples/travel-guide.workflow.json`](./scripts/examples/travel-guide.workflow.json)
- [`scripts/examples/travel-guide.param.json`](./scripts/examples/travel-guide.param.json)

It has three stages:

1. `plan-brief`: create a travel planning brief.
2. `draft-itinerary`: write the travel guide from the brief.
3. `review-itinerary`: review feasibility, safety, pacing, and missing assumptions.

Run the explicit JSON version from the repository root:

```bash
node scripts/run-ultracode.mjs run \
  scripts/examples/travel-guide.workflow.json \
  scripts/examples/travel-guide.param.json \
  --run-id travel-guide-demo
```

When this command starts from the primary checkout, the artifact directory is in the sibling run worktree, but normal follow-up commands can use the run id:

```bash
RUN_ID="travel-guide-demo"
```

Inspect the run:

```bash
node scripts/run-ultracode.mjs status "$RUN_ID"
node scripts/run-ultracode.mjs report "$RUN_ID"
```

CLI runs print a `workflow.next_actions` event after `workflow.completed`; non-JSON restart/rework commands print the same follow-up event after the stage action result. Use those run-id commands instead of copying `outputDir`.

## Friendly Prompt For Codex

After the plugin is installed and a new Codex thread is started, use an intent-first prompt:

```text
Please use Ultracode travel-guide to create a 3-day spring Kyoto travel guide for two adults visiting for the first time. Keep the pace balanced, include temples and shrines, traditional streets, local food, easy photo spots, and rainy-day alternatives.

Use the named workflow. Infer cwd, run id, and output directory. After the workflow finishes, summarize the status and give me the final travel guide and review file paths.
```

Codex should call `ultracode_run_named` for this path. Use `ultracode_run` only when the user explicitly provides workflow and param JSON files.

For open-ended requests, Codex should first call `ultracode_dispatch` with the current workspace root as `cwd` and may include extracted structured `params`. If `dispatch.action` is `ran_named`, a matching read-only named workflow has already run; use the returned `inspection` to show status, tail, report, artifacts, or to prepare restart/rework stage actions. If `dispatch.action` is `needs_confirmation`, show `preview.template`, `preview.summary`, `preview.stagePlan`, `preview.writeStages`, `preview.outputFiles`, and `preview.risks` before asking for confirmation. After the user confirms, call the tool named by `executionAfterApproval.tool` with `executionAfterApproval.arguments`: write-capable named workflow previews call `ultracode_run_named`, while dynamic workflow previews call `ultracode_run_dynamic` with the reviewed `planFile`. These arguments preserve any user-provided `params` and explicit advanced controls such as `runId`, `outputDir`, and `worktreeDir`. Do not pass raw workflow JSON directly to `ultracode_run_dynamic`. For dynamic previews, also show the returned `planFile` and full workflow JSON. For approved write-capable named runs, use `approvedNamedWorkflowFile` or `inspection.approvedNamedWorkflowFile` as the audit record of the approved workflow, generated params, and execution context. Use `ultracode_plan_dynamic` only when you explicitly want planning without auto-running matching read-only named workflows; when it returns `run_named`, show the returned `workflow` and `preview`. A read-only named preview points to direct `execution.arguments`; a write-capable named preview returns `requiresConfirmation: true` and points to `executionAfterApproval`. If a named or dynamic preview lacks `execution` / `executionAfterApproval` because `cwd` was omitted, re-run `ultracode_plan_dynamic` with `cwd` before execution. When no named workflow matches, the dynamic planner chooses a task-specific template: debug/fix, code-change, research, content-deliverable, or generic scoped execution. The selected template is stored in `preview.template` and the `reason` explains why that template was chosen. Content-deliverable previews use `deliverable-brief -> draft-deliverable -> review-deliverable`, which keeps tasks such as travel guides, release notes, proposals, docs, emails, and announcements artifact-oriented without requiring write-mode repository edits. Explicit content deliverables win over generic `changes` wording, so release notes or changelogs from repository changes remain read-only unless the user asks to edit files.

CLI users can follow the same guarded flow:

```bash
node scripts/run-ultracode.mjs \
  "Review the current implementation plan and produce a risk report"

node scripts/run-ultracode.mjs run-dynamic \
  --plan-file .ultracode/plans/<generated-plan>.plan.json \
  --approved true
```

`ultracode "<task intent>"` is the terminal shortcut for `ultracode dispatch --intent "<task intent>"`: it automatically runs matching read-only named workflows, shows a confirmation preview for write-capable named workflows, and writes a reusable dynamic plan file when no registered workflow fits. The preview includes the next command to run after approval; for write-capable named workflows that next command uses the `ultracode <workflow-name> "<task intent>" --approved true` shortcut, and direct execution without `--approved true` is rejected. In `--json` output, read-only named auto-runs return one parseable payload with `dispatch.action: "ran_named"`, the selected `workflow`, `worktree`, `inspection`, `result`, and `followUp`; direct named executions through `run-name` or `ultracode <workflow-name> "<task intent>" --json` return the same run payload without the dispatch envelope. Approval-gated previews include `executionAfterApproval.nextCommand` plus a `confirmationGate`; the top-level `nextCommand` remains as a compatibility shortcut. Approved write-capable named runs write `<outputDir>/approved-named-workflow.json`; MCP returns this path as `approvedNamedWorkflowFile` and `inspection.approvedNamedWorkflowFile`. For dynamic previews, the approval command preserves any explicit `--params`, `--run-id`, `--outputDir`, and `--worktree-dir` supplied to dispatch. `plan-dynamic` remains available when you explicitly want planning without the dispatch behavior. Dynamic plan files also store preview-time `params` and execution context when present. When execution uses a plan file, Ultracode writes the approved snapshot to `<outputDir>/approved-plan.json` with the original `sourcePlanFile`, reviewed plan, and the effective params/execution context used by this run; MCP returns this path as `approvedPlanFile` and `inspection.approvedPlanFile`. If `run-dynamic` is called from a plan file, saved plan-file params are used as the base and explicit `--params` deep-merge over them; saved `runId`, `outputDir`, and `worktreeDir` are reused when the command omits those controls, while explicit command arguments still override saved context. With `--json`, `run-dynamic` also prints one clean run payload with `workflow`, `worktree`, `inspection`, `result`, `followUp`, `approvedPlanFile`, and `inspection.approvedPlanFile`; workflow events stay in `trace.jsonl`. The lower-level `ultracode run <workflow.json> <param.json> --json` path returns the same run payload shape without approval fields. `run-dynamic` validates the generated workflow before execution and writes `workflow.dynamic.json` plus `param.dynamic.json` into the run artifact directory. Dynamic write stages are allowed only through the reviewed workflow preview and still run inside the normal Ultracode worktree/artifact boundary.

CLI `plan-dynamic --intent "<task intent>"` writes a reusable plan artifact by default when it returns a dynamic preview, usually under `.ultracode/plans/`, prints/returns an explicit `Approval required: yes` line, and prints/returns the exact `run-dynamic --plan-file ... --approved true` next command. Pass `--output-plan <file>` only when you need a deterministic path. If you pass `--params`, `--run-id`, `--outputDir`, or `--worktree-dir`, `plan-dynamic` preserves them in the returned named or dynamic approval command and stores them in the dynamic plan artifact. If `plan-dynamic` recommends a named workflow instead, it prints/returns the workflow stage plan, write stages, output files, and an explicit `Approval required: yes/no` line without creating an unnecessary plan file. In `--json` output, named recommendations include `preview.template: "named-workflow"` plus the same stage plan, write stages, output files, risks, and confirmation prompt used by MCP. Read-only named workflows return `execution.nextCommand` with `approvalRequired: false`; the top-level `nextCommand` remains as a compatibility shortcut. Approval-gated named or dynamic previews return `requiresConfirmation: true` and put the command under `executionAfterApproval.nextCommand`; write-capable named approval commands include `--approved true`.

## Workflow Dependencies

Stages can declare `dependsOn` by stage name. Ultracode validates duplicate names, unknown dependencies, and dependency cycles before execution. It then runs stages in dependency order, so a stage may safely reference an earlier or later declared dependency through `${stages.<name>.latest.*}` as long as `dependsOn` connects them.

When multiple stages are ready at the same time, declaration order is preserved. This keeps simple linear workflows predictable while allowing dynamic workflows to express fan-out and join structure.

## Restart And Rework

Use restart when the same stage should be retried with identical input:

```bash
node scripts/run-ultracode.mjs restart-stage "$RUN_ID" draft-itinerary
```

Use rework when a reviewer or user has concrete feedback:

```bash
node scripts/run-ultracode.mjs rework-stage "$RUN_ID" draft-itinerary \
  --feedback '{"comments":["Add rainy-day route timing","Clarify budget assumptions"]}'
```

Both commands create the next attempt under the stage's `attempts/` directory and refresh `workflow-result.json` plus `status.json`. By default they rerun only the selected stage. In normal terminal mode they also print `workflow.next_actions` with run-id follow-up commands. With `--json`, restart and rework print one clean JSON payload with the final action result plus `followUp.commands`; stage events are still appended to the run's `trace.jsonl`.

Use cascade when downstream stages should be regenerated from the new upstream output:

```bash
node scripts/run-ultracode.mjs rework-stage "$RUN_ID" draft-itinerary \
  --feedback '{"comments":["Add rainy-day route timing"]}' \
  --cascade true
```

Cascade reruns transitive downstream stages from `workflow.json` with freshly rendered inputs, so only stages that depend on the changed stage point at the new upstream artifact.

## Run History

Use a run id directly for status, tail, report, restart, rework, and final artifact lookup:

```bash
node scripts/run-ultracode.mjs report travel-guide-demo
node scripts/run-ultracode.mjs status travel-guide-demo
node scripts/run-ultracode.mjs tail travel-guide-demo --limit 20
node scripts/run-ultracode.mjs restart-stage travel-guide-demo draft-itinerary
```

Use `list-runs` when you do not remember a run id:

```bash
node scripts/run-ultracode.mjs list-runs
```

Open a run's final artifact path and preview:

```bash
node scripts/run-ultracode.mjs artifact travel-guide-demo
```

Remove old run artifact directories:

```bash
node scripts/run-ultracode.mjs prune-runs old-run-id,another-old-run
node scripts/run-ultracode.mjs prune-runs old-run-id --worktrees true
```

Run discovery scans both the current checkout's `.ultracode/runs/` and sibling `<repo>.worktrees/*/.ultracode/runs/`. Pruning removes only run artifact directories by default. Use CLI `--worktrees true` or MCP `removeWorktrees: true` only when you also want to remove matching sibling run worktrees. Linked Git worktrees are removed through `git worktree remove --force`; plain directories are removed from the filesystem. Non-JSON CLI output lists both removed run artifact directories and removed worktree roots.

## Workflow Shape

A workflow file defines ordered Codex stages:

```json
{
  "name": "travel-guide",
  "description": "Create a practical travel guide.",
  "keywords": ["travel", "trip", "itinerary", "guide", "旅游", "攻略", "行程"],
  "stages": [
    {
      "name": "plan-brief",
      "type": "codex",
      "input": {
        "trip": "${params.trip}"
      },
      "prompt": ["Create a concise travel planning brief."],
      "output": {
        "file": "planning-brief.md"
      }
    }
  ]
}
```

`keywords` is optional but recommended for registered workflows. `ultracode_plan_dynamic` scores workflow `name`, `description`, and `keywords` to recommend a named workflow before falling back to a generated dynamic workflow.

Supported interpolation examples:

- `${params.goal}`
- `${params.trip}`
- `${stages.plan-brief.latest.outputFile}`

## Artifacts

Each stage attempt writes files like:

```text
.ultracode/runs/<run-id>/
  workflow.json
  param.json
  status.json
  workflow-result.json
  trace.jsonl
  stages/
    001-plan-brief/
      latest-result.json
      attempts/
        001/
          stage.json
          input.json
          prompt.md
          planning-brief.md
          codex-events.jsonl
          codex-stdout.log
          codex-stderr.log
          session.json
          result.json
```

## Development

```bash
cd scripts
npm test
npm run typecheck
```

Validate the plugin manifest:

```bash
python3 /Users/chuntao.liao/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py \
  .
```
