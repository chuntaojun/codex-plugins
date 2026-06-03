# Harness CLI Workflow Runner 任务计划

## 目标

保留最终态的 binary-first workflow runner：`harness-cli run <workflow.json> <param.json>`。Skill 仅作为可选 adapter 文档，不承担 runtime 语义。

## 实施清单

- [x] 移除 hardcoded workflow 源码、旧示例和旧测试
- [x] 收敛 CLI 到 `run <workflow.json> <param.json>` 单一路径
- [x] 收敛核心类型，删除内置 workflow 枚举和旧 action 参数模型
- [x] 保留 JSON runner、stage attempt、command gate、restart/rework primitive、Codex event/session 捕获
- [x] 更新 package bin，仅暴露 `harness-cli`
- [x] 更新 Skill 文档，明确它只是 adapter
- [x] 更新示例 workflow/param 文件
- [x] 运行测试、类型检查、JSON 校验、Skill 校验、Plugin 校验
- [x] 补充 Review

## 最终结构

- `scripts/src/cli.ts`：二进制 CLI 入口，只解析 `harness-cli run <workflow.json> <param.json>`。
- `scripts/src/json-runner.ts`：读取 workflow/param JSON，顺序执行 `type=codex` stage。
- `scripts/src/core/stage.ts`：stage attempt 目录、input/prompt/output、gate、restart/rework primitive。
- `scripts/src/core/codex.ts`：`codex exec --json` 调用、JSONL event stream、stdout/stderr、session metadata 捕获。
- `scripts/examples/doc-flow.workflow.json` 和 `scripts/examples/doc-flow.param.json`：最终态示例。
- `skills/ts-workflow/SKILL.md`：可选 adapter 文档。

## Review

- 清理后源码只保留 binary-first 主路径：`harness-cli run <workflow.json> <param.json>`。
- 已删除 hardcoded workflow 源码、旧示例、旧测试和 stale `dist/workflows/*` 产物。
- `cli.ts` 已移除旧参数入口，非 `run` 命令会返回用法错误。
- `schema.ts` / `workflow.ts` 已收敛为 JSON runner 所需的最小上下文类型。
- `package.json` / `package-lock.json` 只暴露 `harness-cli` bin。
- Plugin/Skill 文案已更新为 Harness CLI adapter，不再描述旧 workflow runtime。
- 验证通过：`npm test`、`npm run typecheck`、两个示例 JSON 校验、Skill 校验、Plugin 校验。

## Git Worktree 自动执行隔离计划

### 目标

`harness-cli run <workflow.json> <param.json>` 必须在独立 git worktree 目录中执行。若从主 checkout 启动，CLI 自动创建 sibling worktree 后在其中运行 flow；若已经在 linked worktree 中启动，则复用当前目录。非 git 目录和 submodule 仍应在执行 workflow 前失败，避免 Codex stage 修改污染主工作区。

### 实施清单

- [x] 先写 git worktree 检测测试，覆盖 linked worktree、主 checkout、submodule、非 git 目录
- [x] 实现 `core/git-worktree.ts`，用 `git rev-parse --git-dir` / `--git-common-dir` / `--show-superproject-working-tree` 判断隔离状态
- [x] 增加 `prepareRunWorktree()`，主 checkout 自动执行 `git worktree add -b codex/harness-<run-id> <repo>.worktrees/<run-id>`
- [x] 在 `harness-cli run` 主入口中先准备 worktree，再以 worktree 作为 `repoRoot` 执行 JSON flow
- [x] 保留 `--worktreeDir` / `--worktree-dir` 显式指定运行 worktree 目录
- [x] 更新 Skill 文档和 lessons，明确 CLI 会自动创建或复用独立 worktree
- [x] 运行测试、类型检查、Skill 校验、Plugin 校验
- [x] 补充 Review

### Review

- 新增 `scripts/src/core/git-worktree.ts`，通过 Git 自身的 `rev-parse --git-dir`、`--git-common-dir`、`--show-superproject-working-tree` 判断当前目录是否为 linked worktree。
- `harness-cli run` 会先调用 `prepareRunWorktree()`：linked worktree 直接复用；主 checkout 自动创建 sibling worktree；非 git 目录和 submodule 会失败。
- 自动创建路径默认是 `<repo-parent>/<repo-name>.worktrees/<run-id>`，分支名默认是 `codex/harness-<run-id>`；用户可通过 `--worktreeDir` 或 `--worktree-dir` 指定目录。
- workflow/param 文件按原调用目录解析，stage 的 Codex `cwd`、gate 和输出目录都在准备好的 worktree 内执行。
- 底层 `runJsonWorkflow()` 保持纯 runner 能力，不强制检测，便于单元测试和未来被其他受控入口复用。
- Skill adapter 文档已明确 CLI 会自动准备运行 worktree。
- 验证通过：`npm test`、`npm run typecheck`、示例 JSON 校验、Skill 校验、Plugin 校验。

## Codex 内部 MCP 触发入口计划

### 目标

保留 `harness-cli` 作为 workflow runtime，同时给 Codex 插件增加一个最薄的 MCP tool 入口：Codex 内部可以结构化调用 `run_workflow`，由工具准备 worktree 并执行现有 JSON runner。MCP 层不重新定义 stage、gate、rework 或 artifact 语义。

### 实施清单

- [x] 先写 MCP tool 输入解析、工具列表、调用响应测试
- [x] 确保 MCP stdio 不被 workflow event 日志污染
- [x] 实现 `scripts/src/mcp.ts` 和 `harness-workflow-mcp` bin
- [x] 增加 `.mcp.json` 并在 plugin manifest 声明 `mcpServers`
- [x] 更新 Skill 文档：优先 MCP tool，CLI 作为本地/CI fallback
- [x] 更新 lessons，记录 CLI runtime + MCP trigger 的边界
- [x] 运行测试、类型检查、示例 JSON 校验、Skill 校验、Plugin 校验
- [x] 补充 Review

### Review

- 新增 `scripts/src/mcp.ts`，提供 newline JSON-RPC MCP server，支持 `initialize`、`ping`、`tools/list`、`tools/call`。
- MCP 暴露单一工具 `run_workflow`，输入为 `cwd`、`workflowFile`、`paramFile`、可选 `outputDir`、`runId`、`worktreeDir`。
- `run_workflow` 会复用现有 `prepareRunWorktree()` 和 `runJsonWorkflow()`，不重新实现 workflow runtime。
- MCP 入口调用 `configureTraceOutput(..., { silent: true })`，workflow event 只进入 trace artifact，不污染 stdio JSON-RPC。
- 新增 `scripts/run-mcp.mjs` 和 `harness-workflow-mcp` bin；插件 manifest 通过 `.mcp.json` 暴露 `harness-workflow` MCP server。
- Skill 文档更新为 Codex 内部优先 MCP tool，CLI 用于 terminal、CI 或 fallback。
- 验证通过：`npm test`、`npm run typecheck`、示例 JSON 校验、Skill 校验、Plugin 校验。

## Workflow 展示查询入口计划

### 目标

让 workflow 每个 stage 的执行过程可以被优雅展示：CLI 给终端用户提供 `status`、`tail`、`report`、`watch`；MCP 给 Codex 内部提供 `workflow_status`、`workflow_tail`、`workflow_report`。展示层只读取 runner 产物，不暴露隐藏 reasoning。

### 实施清单

- [x] 为共享 inspector 写测试，覆盖 stage 状态、trace tail、报告摘要
- [x] 为 CLI 新命令写测试，覆盖 `status`、`tail`、`report`
- [x] 为 MCP 查询工具写测试，覆盖 tools/list 和 tools/call
- [x] 实现 `status.json` 稳定状态文件输出
- [x] 实现共享 `core/inspector.ts`
- [x] 接入 CLI `status`、`tail`、`report`、`watch`
- [x] 接入 MCP `workflow_status`、`workflow_tail`、`workflow_report`
- [x] 更新 Skill 文档和 lessons
- [x] 运行完整验证并补充 Review

### Review

- `runJsonWorkflow()` 会在 run 初始化、stage running、stage completed 和最终完成时写 `status.json`。
- `status.json` 展示 `pending`、`running`、`passed`、`failed`、当前 stage、session id、输出文件和 failed gate。
- 新增 `core/inspector.ts`，统一读取 `status.json`、`workflow-result.json`、`trace.jsonl` 和最终 stage artifact。
- CLI 新增 `status`、`tail`、`report`、`watch`；默认输出给人看，`--json` 输出结构化 JSON。
- MCP 新增 `workflow_status`、`workflow_tail`、`workflow_report`，Codex 内部可结构化查询，不需要污染 MCP stdout。
- 展示层只暴露事件、命令、session-id、gate 和 artifact，不暴露隐藏 reasoning。
- 验证通过：`npm test`、`npm run typecheck`、示例 JSON 校验、MCP `tools/list` smoke test、Skill 校验、Plugin 校验。
