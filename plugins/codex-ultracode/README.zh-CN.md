# Codex Ultracode

[English README](./README.md)

Codex Ultracode 是一个本地 Codex 插件和 workflow runner，用来运行 JSON 定义的多阶段 Codex workflow。它会在隔离的 git worktree 中执行每个 stage，保存完整运行产物，并通过 CLI 和 MCP 工具暴露运行状态。

## 它做什么

- 通过 `ultracode <workflow-name> "<task intent>"` 按名称运行已注册 workflow。
- 仍支持 `ultracode run <workflow.json> <param.json>` 显式运行 workflow JSON。
- 每个 `type=codex` stage 都会作为独立的 `codex exec --json` 调用启动。
- 每次 stage attempt 都保存在 `.ultracode/runs/<run-id>/stages/...` 下。
- 保存 prompt、input、output、Codex events、stdout/stderr、session metadata、gate 结果和最终 workflow 状态。
- 提供 MCP 工具，供 Codex 内部结构化触发和查询。
- runtime 语义归本地 `ultracode` binary 所有；Skill 只是薄 adapter。

## 入口

### CLI

在仓库根目录运行：

```bash
node scripts/run-ultracode.mjs travel-guide \
  "给第一次去京都的两位成人做 3 天春季旅游攻略，节奏不要太赶，包含雨天替代方案。" \
  --params '{"trip":{"destination":"Kyoto, Japan","durationDays":3,"season":"spring","travelers":"two adults visiting for the first time"}}'
```

查询已完成或运行中的 workflow：

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

如果作为 package 安装，也可以使用等价 binary：

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

`ultracode help` 和 `ultracode --help` 会输出同一份 task-first 命令摘要。`runId`、`outputDir`、`worktreeDir` 都是高级可选控制，通常不需要用户关心。

### MCP

插件在 [`.mcp.json`](./.mcp.json) 中声明 MCP server：

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

可用工具：

- `ultracode_run`：根据 workflow/param JSON 文件运行 workflow。
- `ultracode_run_named`：根据已注册 workflow 名称、自然语言意图和可选结构化参数运行 workflow。write-capable named workflow 要求 `approved: true`；read-only named workflow 不需要。
- `ultracode_list_workflows`：列出已注册的 named workflows。
- `ultracode_describe_workflow`：描述一个已注册 workflow，并在存在时包含 README。
- `ultracode_dispatch`：用一个入口处理开放式任务意图。命中 read-only named workflow 时会直接运行；命中包含 write stage 的 named workflow 时返回确认预览；未命中时返回需要用户确认的动态 workflow preview。
- `ultracode_plan_dynamic`：根据任务意图规划处理方式；能匹配 named workflow 时给出推荐，否则返回受约束且贴近任务类型的动态 workflow 草案。传入 `cwd` 后，named workflow 推荐会返回 workflow/preview 细节和可直接调用的执行参数，dynamic preview 会自动保存可复用 plan artifact 并返回批准后的执行参数。若 named 或 dynamic 推荐时省略了 `cwd`，preview 只用于展示，应带上 `cwd` 重新规划后再执行；只有需要强制指定 plan 路径时才传 `outputPlan`，相对 `outputPlan` 必须同时传 `cwd`。动态 fallback 模板包括 debug/fix、code-change、research、旅游攻略/发布说明等内容交付物，以及通用 scoped task flow。动态 preview 会包含 `preview.template`，方便 Codex 解释和审计 planner 选择了哪种模板。
- `ultracode_run_dynamic`：从已审阅的 `planFile` 运行用户确认后的动态 workflow。它要求 `approved: true` 和 `planFile`，并拒绝 gate、未知 stage 类型、非法 agent mode、未知依赖、循环依赖、不安全输出路径等高风险动态内容。
- `ultracode_restart_stage`：用 latest attempt 的相同 input 为指定 stage 创建下一次 attempt；接受产物目录或 `cwd + runId`。
- `ultracode_rework_stage`：把结构化反馈写入 `input.rework`，并为指定 stage 创建下一次 attempt；接受产物目录或 `cwd + runId`。
- `ultracode_list_runs`：列出当前 checkout 和 sibling run worktrees 中的最近 runs。
- `ultracode_artifact`：根据 run id 返回最终产物路径和预览。
- `ultracode_prune_runs`：删除指定 run 的产物目录，并可在明确选择时同步删除匹配的 sibling run worktree。
- `ultracode_status`：从产物目录或 `cwd + runId` 读取 stage 状态。
- `ultracode_tail`：从产物目录或 `cwd + runId` 读取最近的 trace 事件。
- `ultracode_report`：从产物目录或 `cwd + runId` 读取最终摘要和最终产物预览。

所有 MCP run 工具都会返回 `inspection`，里面包含可直接调用 `ultracode_status`、`ultracode_tail`、`ultracode_report`、`ultracode_artifact` 的 arguments；通过 `cwd + runId` 调用的 MCP restart/rework 也会返回 `inspection`。这些 inspection 包含通用的 `inspection.restartStage` / `inspection.reworkStage` 模板；当已有 stage 结果时，还会在 `inspection.stages[]` 里给出每个具体 stage 的 restart/rework 参数。每个 stage entry 还可以包含 latest attempt 的 `artifact` 元数据，包括 `outputFile`、`resultFile`、`attemptDir`、`stageDir` 和 `sessionId`，Codex 展示或返工某个 stage 时不需要重建产物路径。status、tail、report 和 stage action 的 arguments 默认使用 `cwd + runId`；`inspection.outputDir` 只作为审计和调试上下文保留。来自 plan file 的动态 run 会包含 `approvedPlanFile` 和 `inspection.approvedPlanFile`。已批准的 write-capable named run 会包含 `approvedNamedWorkflowFile` 和 `inspection.approvedNamedWorkflowFile`，指向 `<outputDir>/approved-named-workflow.json`。

## 安装到 Codex

推荐安装方式：通过 `codex-plugins` marketplace 安装整套插件：

```bash
codex plugin marketplace add chuntaojun/codex-plugins --ref main
```

重启 Codex 后，用插件 mention 方式调用：

```text
$ultracode list available workflows
```

如果你的 Codex 版本在添加 marketplace 后仍要求显式安装插件：

```bash
codex plugin add codex-ultracode@codex-plugins
```

### 独立本地开发

如果脱离 marketplace 套件独立开发，可把插件注册到本地 marketplace：

```bash
ln -s /path/to/codex-ultracode /Users/chuntao.liao/plugins/codex-ultracode
codex plugin add codex-ultracode@local
codex plugin list --marketplace local
```

本地开发时，重新安装前先刷新 plugin cachebuster：

```bash
python3 /Users/chuntao.liao/.codex/skills/.system/plugin-creator/scripts/update_plugin_cachebuster.py \
  /path/to/codex-ultracode

codex plugin add codex-ultracode@local
```

重新安装后，需要新开一个 Codex 线程，Codex 才会加载更新后的 Skill 和 MCP tools。

## 内置 Named Workflows

打包内置 workflow 位于 [`skills/ultracode/workflows/`](./skills/ultracode/workflows/)。可以直接按名称触发，也可以通过 `ultracode "<task intent>"` 让 dispatch 自动匹配：

| Workflow | 模式 | 适用场景 |
| --- | --- | --- |
| `deep-research` | read-only | 多阶段深度调研：界定问题、整理证据、综合报告、复核不确定性。 |
| `code-review` | read-only | 仓库或 diff 审阅，按严重程度优先输出 findings 和剩余风险。 |
| `debug-fix` | 需确认的 write | 复现失败、诊断根因、实施最小修复并验证。 |
| `travel-guide` | read-only | 生成实用旅游攻略，并审阅可行性与节奏。 |

示例：

```bash
ultracode deep-research "调研 AI 编程助手在大型代码库中的协作模式"
ultracode code-review "审查当前分支相对 main 的变更"
ultracode debug-fix "修复 npm test 里的失败用例"
```

`debug-fix` 包含 write stage，因此无论通过 dispatch 还是直接 named execution，都需要显式确认后才会运行。

## 示例：Named 旅游攻略 Workflow

已安装的 named workflow 位于：

- [`skills/ultracode/workflows/travel-guide/workflow.json`](./skills/ultracode/workflows/travel-guide/workflow.json)
- [`skills/ultracode/workflows/travel-guide/param.template.json`](./skills/ultracode/workflows/travel-guide/param.template.json)

在仓库根目录运行：

```bash
node scripts/run-ultracode.mjs travel-guide \
  "给第一次去京都的两位成人做 3 天春季旅游攻略，节奏不要太赶，包含雨天替代方案。" \
  --params '{"trip":{"destination":"Kyoto, Japan","durationDays":3,"season":"spring","travelers":"two adults visiting for the first time","pace":"balanced, not rushed","constraints":["include rainy-day alternatives","avoid claiming live opening hours or ticket prices"]}}' \
  --run-id travel-guide-demo
```

旧的 file-based 示例仍保留给 CI 和底层测试：

- [`scripts/examples/travel-guide.workflow.json`](./scripts/examples/travel-guide.workflow.json)
- [`scripts/examples/travel-guide.param.json`](./scripts/examples/travel-guide.param.json)

它包含三个 stage：

1. `plan-brief`：生成旅行规划简报。
2. `draft-itinerary`：根据简报生成旅游攻略。
3. `review-itinerary`：审阅可行性、安全性、节奏和缺失假设。

显式 JSON 版本可这样运行：

```bash
node scripts/run-ultracode.mjs run \
  scripts/examples/travel-guide.workflow.json \
  scripts/examples/travel-guide.param.json \
  --run-id travel-guide-demo
```

如果命令从主 checkout 启动，产物目录会在 sibling run worktree 中；但正常后续命令可以直接使用 run id：

```bash
RUN_ID="travel-guide-demo"
```

查看运行结果：

```bash
node scripts/run-ultracode.mjs status "$RUN_ID"
node scripts/run-ultracode.mjs report "$RUN_ID"
```

CLI run 会在 `workflow.completed` 之后额外打印 `workflow.next_actions` event；非 JSON 的 restart/rework 命令也会在 stage action result 之后打印同样的 follow-up event。优先使用里面基于 run id 的命令，不需要复制 `outputDir`。

## 更友好的 Codex 触发 Prompt

插件安装后，新开 Codex 线程，可以用 intent-first 的 prompt：

```text
请用 Ultracode travel-guide 给第一次去京都的两位成人做一个 3 天春季旅游攻略。节奏不要太赶，偏寺庙神社、传统街区、本地食物、轻松拍照，并包含雨天替代方案。

请使用 named workflow，自动推断 cwd、run id 和输出目录。完成后汇总 workflow 状态，并给我最终攻略文件和 review 文件路径。
```

Codex 应优先调用 `ultracode_run_named`。只有当用户明确提供 workflow/param JSON 文件时，才使用 `ultracode_run`。

对于开放式请求，Codex 应先调用 `ultracode_dispatch`，并传入当前 workspace root 作为 `cwd`，也可以带上从用户请求中抽取出的结构化 `params`。如果 `dispatch.action` 是 `ran_named`，匹配到的 read-only named workflow 已经运行完成；直接使用返回的 `inspection` 展示状态、事件、报告、产物，或准备 restart/rework stage action。如果 `dispatch.action` 是 `needs_confirmation`，先展示 `preview.template`、`preview.summary`、`preview.stagePlan`、`preview.writeStages`、`preview.outputFiles` 和 `preview.risks`，再请用户确认。用户确认后，调用 `executionAfterApproval.tool` 指定的工具，并直接使用 `executionAfterApproval.arguments`：write-capable named workflow preview 调用 `ultracode_run_named`，动态 workflow preview 用已审阅的 `planFile` 调用 `ultracode_run_dynamic`。这些 arguments 会保留用户已提供的 `params`，以及显式高级控制 `runId`、`outputDir`、`worktreeDir`。不要把 raw workflow JSON 直接传给 `ultracode_run_dynamic`。对动态 preview，还要展示返回的 `planFile` 和完整 workflow JSON。对于已批准的 write-capable named run，用 `approvedNamedWorkflowFile` 或 `inspection.approvedNamedWorkflowFile` 作为审计记录；它保存已批准 workflow、生成参数和执行上下文。只有当你明确想“只规划不自动运行 matching read-only named workflow”时，才使用 `ultracode_plan_dynamic`；当它返回 `run_named` 时，先展示返回的 `workflow` 和 `preview`。read-only named preview 会指向可直接执行的 `execution.arguments`；write-capable named preview 会返回 `requiresConfirmation: true` 并指向 `executionAfterApproval`。如果因为省略 `cwd` 导致 named 或 dynamic preview 没有 `execution` / `executionAfterApproval`，应带上 `cwd` 重新调用 `ultracode_plan_dynamic` 后再执行。没有 matching named workflow 时，dynamic planner 会按任务类型选择 debug/fix、code-change、research、content-deliverable 或通用 scoped execution 模板。所选模板会保存在 `preview.template`，`reason` 会解释为什么选择该模板。内容交付物 preview 使用 `deliverable-brief -> draft-deliverable -> review-deliverable`，让旅游攻略、发布说明、方案、文档、邮件、公告等任务保持面向最终产物，而不需要 repository write mode。明确的内容交付物优先级高于泛化的 `changes` / `变更` 词，因此“根据 repository changes 生成 release notes / changelog”仍保持 read-only，除非用户明确要求编辑文件。

CLI 用户可以使用同样的受控流程：

```bash
node scripts/run-ultracode.mjs \
  "Review the current implementation plan and produce a risk report"

node scripts/run-ultracode.mjs run-dynamic \
  --plan-file .ultracode/plans/<generated-plan>.plan.json \
  --approved true
```

`ultracode "<task intent>"` 是 `ultracode dispatch --intent "<task intent>"` 的终端 shortcut：匹配 read-only named workflow 时自动运行；匹配 write-capable named workflow 时展示确认预览；没有匹配 registered workflow 时写出可复用 dynamic plan file。预览会包含用户批准后应该执行的下一条命令；对 write-capable named workflow，这条下一步命令会使用 `ultracode <workflow-name> "<task intent>" --approved true` shortcut，直接执行但缺少 `--approved true` 会被拒绝。`--json` 输出中，read-only named 自动运行会返回一个可直接解析的 payload，包含 `dispatch.action: "ran_named"`、选中的 `workflow`、`worktree`、`inspection`、`result` 和 `followUp`；通过 `run-name` 或 `ultracode <workflow-name> "<task intent>" --json` 直接执行 named workflow 时，会返回同样的 run payload，但不带 dispatch envelope。确认类 preview 会包含 `executionAfterApproval.nextCommand` 和 `confirmationGate`；顶层 `nextCommand` 作为兼容 shortcut 保留。已批准的 write-capable named run 会写入 `<outputDir>/approved-named-workflow.json`；MCP 返回中也会包含 `approvedNamedWorkflowFile` 和 `inspection.approvedNamedWorkflowFile`。对 dynamic preview，批准后命令会保留 dispatch 时显式传入的 `--params`、`--run-id`、`--outputDir`、`--worktree-dir`。`plan-dynamic` 仍保留给“只规划、不走 dispatch 行为”的显式场景。Dynamic plan file 也会在存在时保存 preview 阶段的 `params` 和执行上下文。当执行来自 plan file 时，Ultracode 会把已确认计划快照写入 `<outputDir>/approved-plan.json`，并保留原始 `sourcePlanFile`、已审阅 plan，以及本次 run 实际使用的 effective params / execution context；MCP 返回中也会包含 `approvedPlanFile` 和 `inspection.approvedPlanFile`。如果 `run-dynamic` 从 plan file 执行，会以 plan file 保存的 `params` 为 base，并把显式 `--params` 深合并覆盖上去；未显式传入 `--run-id`、`--outputDir` 或 `--worktree-dir` 时会复用 plan file 里的执行控制，显式命令参数仍然优先。带 `--json` 时，`run-dynamic` 也会输出单个干净 run payload，包含 `workflow`、`worktree`、`inspection`、`result`、`followUp`、`approvedPlanFile` 和 `inspection.approvedPlanFile`；workflow 事件仍写入 `trace.jsonl`。底层 `ultracode run <workflow.json> <param.json> --json` 路径也返回同样的 run payload 结构，但不带 approval 字段。`run-dynamic` 会在执行前校验动态 workflow，并把 `workflow.dynamic.json` 与 `param.dynamic.json` 写入运行产物目录。动态 write stage 只允许来自用户已审阅的 workflow 草案，并且仍运行在 Ultracode 的 worktree 与 artifact 边界内。

CLI `plan-dynamic --intent "<task intent>"` 返回 dynamic preview 时会默认写出可复用 plan artifact，通常位于 `.ultracode/plans/`，打印/返回明确的 `Approval required: yes`，并打印/返回精确的 `run-dynamic --plan-file ... --approved true` 下一步命令。只有需要确定路径时才传 `--output-plan <file>`。如果传入 `--params`、`--run-id`、`--outputDir` 或 `--worktree-dir`，`plan-dynamic` 会在 named 或 dynamic 的批准后命令中保留这些上下文，并把它们保存到 dynamic plan artifact。如果 `plan-dynamic` 推荐 named workflow，则会打印/返回该 workflow 的 stage plan、write stages、output files 和明确的 `Approval required: yes/no`，不额外创建无用 plan file。在 `--json` 输出里，named recommendation 会包含 `preview.template: "named-workflow"`，以及和 MCP 相同的 stage plan、write stages、output files、risks 和 confirmation prompt。read-only named workflow 会返回 `execution.nextCommand` 和 `approvalRequired: false`；顶层 `nextCommand` 作为兼容 shortcut 保留。需要确认的 named 或 dynamic preview 会返回 `requiresConfirmation: true`，并把命令放在 `executionAfterApproval.nextCommand`；write-capable named 的批准后命令会包含 `--approved true`。

## Workflow 依赖

stage 可以通过 stage name 声明 `dependsOn`。Ultracode 会在执行前校验重复 stage name、未知依赖和循环依赖，然后按依赖图顺序执行。因此，即使依赖 stage 在 JSON 中声明得更晚，只要通过 `dependsOn` 连接，当前 stage 也可以安全引用 `${stages.<name>.latest.*}`。

当多个 stage 同时可执行时，Ultracode 保留它们的声明顺序。这样简单线性 workflow 仍然可预测，同时动态 workflow 可以表达 fan-out 和 join 结构。

## Restart 与 Rework

当同一个 stage 需要用相同输入重试时，使用 restart：

```bash
node scripts/run-ultracode.mjs restart-stage "$RUN_ID" draft-itinerary
```

当 reviewer 或用户有明确反馈时，使用 rework：

```bash
node scripts/run-ultracode.mjs rework-stage "$RUN_ID" draft-itinerary \
  --feedback '{"comments":["补充雨天路线时间","澄清预算假设"]}'
```

两个命令都会在对应 stage 的 `attempts/` 目录下创建下一次 attempt，并刷新 `workflow-result.json` 和 `status.json`。默认只重跑指定 stage。普通终端模式还会打印带 run-id 后续命令的 `workflow.next_actions`。带 `--json` 时，restart 和 rework 的 stdout 是单个干净 JSON payload，里面包含最终 action result 和 `followUp.commands`；stage 事件仍会追加到该 run 的 `trace.jsonl`。

当下游 stages 也应该基于新的上游产物重新生成时，使用 cascade：

```bash
node scripts/run-ultracode.mjs rework-stage "$RUN_ID" draft-itinerary \
  --feedback '{"comments":["补充雨天路线时间"]}' \
  --cascade true
```

cascade 会从 `workflow.json` 重新渲染传递下游 stage 的输入，因此只有依赖被修改 stage 的下游 stage 会指向新的上游 artifact。

## Run 历史

知道 run id 时，可以直接查看状态、事件、报告、重跑/返工 stage 和最终产物：

```bash
node scripts/run-ultracode.mjs report travel-guide-demo
node scripts/run-ultracode.mjs status travel-guide-demo
node scripts/run-ultracode.mjs tail travel-guide-demo --limit 20
node scripts/run-ultracode.mjs restart-stage travel-guide-demo draft-itinerary
```

忘记 run id 时，再使用 `list-runs`：

```bash
node scripts/run-ultracode.mjs list-runs
```

查看某次 run 的最终产物路径和预览：

```bash
node scripts/run-ultracode.mjs artifact travel-guide-demo
```

删除旧 run 的产物目录：

```bash
node scripts/run-ultracode.mjs prune-runs old-run-id,another-old-run
node scripts/run-ultracode.mjs prune-runs old-run-id --worktrees true
```

run 发现会同时扫描当前 checkout 的 `.ultracode/runs/` 和 sibling `<repo>.worktrees/*/.ultracode/runs/`。prune 默认只删除 run 产物目录。只有明确传 CLI `--worktrees true` 或 MCP `removeWorktrees: true` 时，才会同时删除匹配的 sibling run worktree。linked Git worktree 会通过 `git worktree remove --force` 删除；普通目录才直接从文件系统删除。非 JSON CLI 输出会同时列出已删除的 run 产物目录和已删除的 worktree 根目录。

## Workflow 结构

workflow 文件定义有序的 Codex stages：

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

`keywords` 是可选字段，但推荐 registered workflow 都填写。`ultracode_plan_dynamic` 会根据 workflow 的 `name`、`description` 和 `keywords` 打分，优先推荐匹配的 named workflow；没有合适匹配时才生成动态 workflow preview。

支持的插值示例：

- `${params.goal}`
- `${params.trip}`
- `${stages.plan-brief.latest.outputFile}`

## 运行产物

每个 stage attempt 会写出类似这些文件：

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

## 开发验证

```bash
cd scripts
npm test
npm run typecheck
```

校验 plugin manifest：

```bash
python3 /Users/chuntao.liao/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py \
  .
```
