# Codex Ultracode Workflow Runner 任务计划

## 内置通用 Workflow 计划

### 目标

在 `skills/ultracode/workflows/` 下新增一组开箱即用的 named workflows，让用户可以像 `deep-research` 这类 Claude 风格能力一样直接用 `ultracode` 名称或自然语言触发，而不需要手写 workflow JSON。

### 设计

- `deep-research`：read-only，多阶段调研，产出研究简报、资料地图、综合报告和审校报告。
- `code-review`：read-only，面向仓库/变更审阅，产出范围说明、审阅发现和风险复核。
- `debug-fix`：包含 read-only 复现/诊断、write 修复、read-only 验证；依赖现有 named workflow approval gate。
- 所有 workflow 都放在 registry 目录，不改 runtime 分发逻辑。

### 实施清单

- [x] 为 packaged built-in workflows 增加失败测试
- [x] 新增 `deep-research` workflow、param template 和 README
- [x] 新增 `code-review` workflow、param template 和 README
- [x] 新增 `debug-fix` workflow、param template 和 README
- [x] 更新 README 的内置 workflow 列表和触发示例
- [x] 运行目标测试、完整测试、类型检查和插件校验
- [x] 刷新本地 Codex 插件安装并在 cache 内运行回归
- [x] 补充 Review

### Review

- 新增三个 packaged named workflows：
  - `skills/ultracode/workflows/deep-research/`：read-only，四阶段调研 brief、source map、综合报告、研究复核。
  - `skills/ultracode/workflows/code-review/`：read-only，三阶段审阅范围、代码审查 findings、风险复核。
  - `skills/ultracode/workflows/debug-fix/`：write-capable，复现、诊断、实施修复、验证；依赖既有 approval gate。
- 新增/扩展 `scripts/tests/packaged-workflows.test.mjs`，覆盖内置 workflow 的名称、关键词、输出文件、read-only/write 模式和 README 触发示例。
- 更新 `README.md` 和 `README.zh-CN.md`，增加 Built-in Named Workflows / 内置 Named Workflows 章节和触发示例。
- 新增 `code-review` 后，原先用 “Review implementation risks...” 表达动态 preview 的测试会正确命中 named workflow；已将这些 dynamic preview 测试意图改成不命中内置 workflow 的 stakeholder briefing 场景。
- 源码验证通过：目标测试、`npm test` 128/128、`npm run typecheck`、plugin manifest 校验。
- 本地 Codex 插件已重新安装，版本从 `0.1.0+codex.20260609021359` 更新为 `0.1.0+codex.20260610084106`。
- cache 内回归通过：在 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260610084106/scripts` 中构建并运行 dynamic planner、CLI、MCP、manifest、packaged workflow 测试，84/84 通过。

## Travel Guide Packaged Workflow 收尾计划

### 目标

把已打包的 `travel-guide` workflow 作为用户第一眼会尝试的示例来审计，修正触发 prompt 的中文表达，并增加测试防止示例结构或文案质量回退。

### 实施清单

- [x] 为 packaged `travel-guide` workflow 增加结构与触发 prompt 测试
- [x] 先运行新增测试确认当前 prompt 问题会被捕获
- [x] 修正 `skills/ultracode/workflows/travel-guide/README.md` 的中文触发 prompt
- [x] 运行目标测试、完整测试、类型检查和插件校验
- [x] 刷新本地 Codex 插件安装并在 cache 内运行回归
- [x] 补充 Review

### Review

- 新增 `scripts/tests/packaged-workflows.test.mjs`，覆盖 packaged `travel-guide` workflow 的 public structure、关键词、stage 输出文件、read-only template 约束和用户触发 prompt。
- TDD 红灯确认：新增测试先失败在 `3 天游攻略`，证明它能捕获当前文案问题。
- 修正 `skills/ultracode/workflows/travel-guide/README.md` 的触发 prompt：`3 天游攻略` 改为更自然的 `3 天旅游攻略`。
- 同步测试 fixture 中的旅游攻略 intent 文案，避免用户示例和测试样例口径不一致。
- 源码验证通过：目标测试、`npm test`、`npm run typecheck`、plugin manifest 校验。
- 本地 Codex 插件已重新安装，版本从 `0.1.0+codex.20260609020542` 更新为 `0.1.0+codex.20260609021359`。
- cache 内回归通过：在 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260609021359/scripts` 中构建并运行 dynamic planner、CLI、MCP、manifest、packaged workflow 测试，83/83 通过。

## 双语使用 README 计划

### 目标

补充根目录中英文使用 README，并在两份文件顶部互相跳转，清楚说明当前安装、CLI、MCP、旅游攻略示例和后续 named workflow 方向。

### 实施清单

- [x] 编写英文 `README.md`
- [x] 编写中文 `README.zh-CN.md`
- [x] 确认两份 README 互相跳转且内容与当前已实现能力一致
- [x] 运行文档相关校验和项目基础验证
- [x] 补充 Review

### Review

- 新增根目录英文 README：`README.md`，顶部链接到 `README.zh-CN.md`。
- 新增根目录中文 README：`README.zh-CN.md`，顶部链接回 `README.md`。
- 两份 README 均覆盖：项目用途、CLI 入口、MCP 工具、本地 Codex 安装、旅游攻略 workflow 示例、友好触发 prompt、workflow 结构、产物布局和开发验证。
- README 明确当前实现仍是 file-based workflow 解析，named workflow registry 是下一步方向，避免把未实现能力写成已实现能力。
- 修正示例中的 status/report 产物路径，说明主 checkout 启动时产物位于 sibling run worktree。
- 验证通过：README 双向链接脚本检查、插件 manifest 校验、`npm test`、`npm run typecheck`。

## Codex 安装与旅游攻略 Workflow 示例计划

### 目标

将当前 `codex-ultracode` 插件安装到本机 Codex 的本地 marketplace，并新增、运行一个真实的旅游攻略 workflow 示例，验证 CLI/MCP 插件入口与 runner 产物可用。

### 实施清单

- [x] 确认 Codex plugin marketplace 安装方式和当前本地 marketplace 状态
- [x] 新增 `travel-guide` workflow/param 示例
- [x] 校验插件 manifest、示例 JSON、测试和类型检查
- [x] 将插件加入本地 marketplace 并执行 `codex plugin add`
- [x] 运行旅游攻略 workflow demo，并用 `status`/`report` 验证产物
- [x] 补充 Review

### Review

- Codex 本地 marketplace 名为 `local`，来源为 `/Users/chuntao.liao/.agents/plugins/marketplace.json`，根目录为 `/Users/chuntao.liao`。
- 已通过 `~/plugins/codex-ultracode -> /Users/chuntao.liao/Github/ai-native/codex-ultracode` 链接将当前仓库挂入本地 marketplace。
- 已执行 cachebuster 更新，插件版本变为 `0.1.0+codex.20260603144328`。
- 已执行 `codex plugin add codex-ultracode@local`，`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled。
- 新增旅游攻略示例：`scripts/examples/travel-guide.workflow.json` 和 `scripts/examples/travel-guide.param.json`。
- 旅游示例 workflow 已真实运行，run id 为 `travel-guide-demo-20260603-1444`，运行 worktree 为 `/Users/chuntao.liao/Github/ai-native/codex-ultracode.worktrees/travel-guide-demo-20260603-1444`。
- 运行结果：`plan-brief`、`draft-itinerary`、`review-itinerary` 三个 stage 均 passed；`status` 显示 workflow completed；`report` 指向最终 `travel-guide-review.md`。
- 验证通过：插件校验、`npm test`、`npm run typecheck`、示例 JSON 解析、`codex plugin add`、`ultracode status`、`ultracode report`。

## 当前仓库认知计划

### 目标

梳理当前仓库的真实用途、入口、核心模块、运行产物和验证方式，给出基于实际文件与命令的结论。

### 实施清单

- [x] 检查仓库结构、包信息、插件 manifest 和 MCP 配置
- [x] 阅读核心源码，确认 CLI、MCP、runner、stage、worktree、inspector 的职责
- [x] 阅读示例、测试和 Skill 文档，确认预期使用方式
- [x] 运行低风险验证命令，确认当前代码描述与实际行为一致
- [x] 补充 Review

### Review

- 当前仓库是 `codex-ultracode` Codex 插件：通过 `.codex-plugin/plugin.json` 声明 Skill 与 MCP server，通过 `.mcp.json` 启动 `ultracode` MCP。
- `scripts/package.json` 暴露两个本地入口：`ultracode` CLI 和 `ultracode-mcp` MCP server。
- 核心能力是读取 JSON workflow 和 param，在隔离 git worktree 中顺序执行 `type=codex` stages。
- 每个 stage 会写入独立 attempt 产物，包括 `stage.json`、`input.json`、`prompt.md`、Codex event/stdout/stderr/session 文件、agent 输出、可选 gate 结果和 `result.json`。
- CLI 支持 `run` 启动 workflow，并支持 `status`、`tail`、`report`、`watch` 读取已有 run 产物。
- MCP 暴露 `ultracode_run`、`ultracode_status`、`ultracode_tail`、`ultracode_report`，作为 Codex 内部结构化触发与展示入口。
- Skill `skills/ultracode/SKILL.md` 只是薄 adapter 文档，不承载 runtime 语义。
- 验证通过：`npm test`、`npm run typecheck`、MCP `tools/list` smoke test、插件/示例 JSON 解析。

## 目标

保留最终态的 binary-first workflow runner：`ultracode run <workflow.json> <param.json>`。Skill 仅作为可选 adapter 文档，不承担 runtime 语义。

## 实施清单

- [x] 移除 hardcoded workflow 源码、旧示例和旧测试
- [x] 收敛 CLI 到 `run <workflow.json> <param.json>` 单一路径
- [x] 收敛核心类型，删除内置 workflow 枚举和旧 action 参数模型
- [x] 保留 JSON runner、stage attempt、command gate、restart/rework primitive、Codex event/session 捕获
- [x] 更新 package bin，仅暴露 `ultracode`
- [x] 更新 Skill 文档，明确它只是 adapter
- [x] 更新示例 workflow/param 文件
- [x] 运行测试、类型检查、JSON 校验、Skill 校验、Plugin 校验
- [x] 补充 Review

## 最终结构

- `scripts/src/cli.ts`：二进制 CLI 入口，只解析 `ultracode run <workflow.json> <param.json>`。
- `scripts/src/json-runner.ts`：读取 workflow/param JSON，顺序执行 `type=codex` stage。
- `scripts/src/core/stage.ts`：stage attempt 目录、input/prompt/output、gate、restart/rework primitive。
- `scripts/src/core/codex.ts`：`codex exec --json` 调用、JSONL event stream、stdout/stderr、session metadata 捕获。
- `scripts/examples/doc-flow.workflow.json` 和 `scripts/examples/doc-flow.param.json`：最终态示例。
- `skills/ultracode/SKILL.md`：可选 adapter 文档。

## Review

- 清理后源码只保留 binary-first 主路径：`ultracode run <workflow.json> <param.json>`。
- 已删除 hardcoded workflow 源码、旧示例、旧测试和 stale `dist/workflows/*` 产物。
- `cli.ts` 已移除旧参数入口，非 `run` 命令会返回用法错误。
- `schema.ts` / `workflow.ts` 已收敛为 JSON runner 所需的最小上下文类型。
- `package.json` / `package-lock.json` 只暴露 `ultracode` bin。
- Plugin/Skill 文案已更新为 Codex Ultracode adapter，不再描述旧 workflow runtime。
- 验证通过：`npm test`、`npm run typecheck`、两个示例 JSON 校验、Skill 校验、Plugin 校验。

## Git Worktree 自动执行隔离计划

### 目标

`ultracode run <workflow.json> <param.json>` 必须在独立 git worktree 目录中执行。若从主 checkout 启动，CLI 自动创建 sibling worktree 后在其中运行 flow；若已经在 linked worktree 中启动，则复用当前目录。非 git 目录和 submodule 仍应在执行 workflow 前失败，避免 Codex stage 修改污染主工作区。

### 实施清单

- [x] 先写 git worktree 检测测试，覆盖 linked worktree、主 checkout、submodule、非 git 目录
- [x] 实现 `core/git-worktree.ts`，用 `git rev-parse --git-dir` / `--git-common-dir` / `--show-superproject-working-tree` 判断隔离状态
- [x] 增加 `prepareRunWorktree()`，主 checkout 自动执行 `git worktree add -b codex/ultracode-<run-id> <repo>.worktrees/<run-id>`
- [x] 在 `ultracode run` 主入口中先准备 worktree，再以 worktree 作为 `repoRoot` 执行 JSON flow
- [x] 保留 `--worktreeDir` / `--worktree-dir` 显式指定运行 worktree 目录
- [x] 更新 Skill 文档和 lessons，明确 CLI 会自动创建或复用独立 worktree
- [x] 运行测试、类型检查、Skill 校验、Plugin 校验
- [x] 补充 Review

### Review

- 新增 `scripts/src/core/git-worktree.ts`，通过 Git 自身的 `rev-parse --git-dir`、`--git-common-dir`、`--show-superproject-working-tree` 判断当前目录是否为 linked worktree。
- `ultracode run` 会先调用 `prepareRunWorktree()`：linked worktree 直接复用；主 checkout 自动创建 sibling worktree；非 git 目录和 submodule 会失败。
- 自动创建路径默认是 `<repo-parent>/<repo-name>.worktrees/<run-id>`，分支名默认是 `codex/ultracode-<run-id>`；用户可通过 `--worktreeDir` 或 `--worktree-dir` 指定目录。
- workflow/param 文件按原调用目录解析，stage 的 Codex `cwd`、gate 和输出目录都在准备好的 worktree 内执行。
- 底层 `runJsonWorkflow()` 保持纯 runner 能力，不强制检测，便于单元测试和未来被其他受控入口复用。
- Skill adapter 文档已明确 CLI 会自动准备运行 worktree。
- 验证通过：`npm test`、`npm run typecheck`、示例 JSON 校验、Skill 校验、Plugin 校验。

## Codex 内部 MCP 触发入口计划

### 目标

保留 `ultracode` 作为 workflow runtime，同时给 Codex 插件增加一个最薄的 MCP tool 入口：Codex 内部可以结构化调用 `ultracode_run`，由工具准备 worktree 并执行现有 JSON runner。MCP 层不重新定义 stage、gate、rework 或 artifact 语义。

### 实施清单

- [x] 先写 MCP tool 输入解析、工具列表、调用响应测试
- [x] 确保 MCP stdio 不被 workflow event 日志污染
- [x] 实现 `scripts/src/mcp.ts` 和 `ultracode-mcp` bin
- [x] 增加 `.mcp.json` 并在 plugin manifest 声明 `mcpServers`
- [x] 更新 Skill 文档：优先 MCP tool，CLI 作为本地/CI fallback
- [x] 更新 lessons，记录 CLI runtime + MCP trigger 的边界
- [x] 运行测试、类型检查、示例 JSON 校验、Skill 校验、Plugin 校验
- [x] 补充 Review

### Review

- 新增 `scripts/src/mcp.ts`，提供 newline JSON-RPC MCP server，支持 `initialize`、`ping`、`tools/list`、`tools/call`。
- MCP 暴露单一工具 `ultracode_run`，输入为 `cwd`、`workflowFile`、`paramFile`、可选 `outputDir`、`runId`、`worktreeDir`。
- `ultracode_run` 会复用现有 `prepareRunWorktree()` 和 `runJsonWorkflow()`，不重新实现 workflow runtime。
- MCP 入口调用 `configureTraceOutput(..., { silent: true })`，workflow event 只进入 trace artifact，不污染 stdio JSON-RPC。
- 新增 `scripts/run-mcp.mjs` 和 `ultracode-mcp` bin；插件 manifest 通过 `.mcp.json` 暴露 `ultracode` MCP server。
- Skill 文档更新为 Codex 内部优先 MCP tool，CLI 用于 terminal、CI 或 fallback。
- 验证通过：`npm test`、`npm run typecheck`、示例 JSON 校验、Skill 校验、Plugin 校验。

## Workflow 展示查询入口计划

### 目标

让 workflow 每个 stage 的执行过程可以被优雅展示：CLI 给终端用户提供 `status`、`tail`、`report`、`watch`；MCP 给 Codex 内部提供 `ultracode_status`、`ultracode_tail`、`ultracode_report`。展示层只读取 runner 产物，不暴露隐藏 reasoning。

### 实施清单

- [x] 为共享 inspector 写测试，覆盖 stage 状态、trace tail、报告摘要
- [x] 为 CLI 新命令写测试，覆盖 `status`、`tail`、`report`
- [x] 为 MCP 查询工具写测试，覆盖 tools/list 和 tools/call
- [x] 实现 `status.json` 稳定状态文件输出
- [x] 实现共享 `core/inspector.ts`
- [x] 接入 CLI `status`、`tail`、`report`、`watch`
- [x] 接入 MCP `ultracode_status`、`ultracode_tail`、`ultracode_report`
- [x] 更新 Skill 文档和 lessons
- [x] 运行完整验证并补充 Review

### Review

- `runJsonWorkflow()` 会在 run 初始化、stage running、stage completed 和最终完成时写 `status.json`。
- `status.json` 展示 `pending`、`running`、`passed`、`failed`、当前 stage、session id、输出文件和 failed gate。
- 新增 `core/inspector.ts`，统一读取 `status.json`、`workflow-result.json`、`trace.jsonl` 和最终 stage artifact。
- CLI 新增 `status`、`tail`、`report`、`watch`；默认输出给人看，`--json` 输出结构化 JSON。
- MCP 新增 `ultracode_status`、`ultracode_tail`、`ultracode_report`，Codex 内部可结构化查询，不需要污染 MCP stdout。
- 展示层只暴露事件、命令、session-id、gate 和 artifact，不暴露隐藏 reasoning。
- 验证通过：`npm test`、`npm run typecheck`、示例 JSON 校验、MCP `tools/list` smoke test、Skill 校验、Plugin 校验。

## 项目迁移与 Ultracode 命名计划

### 目标

将项目迁移到 `/Users/chuntao.liao/Github/ai-native/codex-ultracode`，并把所有外部触发关键字统一为 `ultracode`。

### 实施清单

- [x] 将 git 仓库、插件代码和 docs 迁移到 `ai-native/codex-ultracode`
- [x] 将插件根目录提升为项目根目录，移除旧包装目录
- [x] 将 plugin manifest 名称改为 `codex-ultracode`
- [x] 将 npm package 名称改为 `codex-ultracode`
- [x] 将 CLI bin 改为 `ultracode`
- [x] 将 MCP server/bin 改为 `ultracode` / `ultracode-mcp`
- [x] 将 Skill 名称和目录改为 `ultracode`
- [x] 将 MCP 触发工具改为 `ultracode_run`、`ultracode_status`、`ultracode_tail`、`ultracode_report`
- [x] 将默认运行产物目录改为 `.ultracode/runs/`
- [x] 清理旧外部触发关键字
- [x] 运行完整验证

### Review

- 目标目录现在是 git 仓库根目录，也是 Codex plugin 根目录。
- 旧源目录已不含代码，只剩 `.DS_Store`、旧运行产物和 `.npm-cache`。
- 外部触发面已统一为 `ultracode`：CLI、MCP server、MCP tools、Skill name、默认 artifact 目录和 git worktree branch prefix。
- 保留内部领域词 `Workflow`，因为它描述功能模型而不是触发关键字。
- 验证通过：`npm test`、`npm run typecheck`、示例 JSON 校验、MCP `tools/list` smoke test、Skill 校验、Plugin 校验。

## Ultracode 京都春季 3 天游攻略计划

### 目标

使用 Ultracode 的 `travel-guide` workflow，为第一次去京都的两位成人生成 3 天春季旅游攻略。攻略节奏不要太赶，包含雨天替代方案，并给出攻略与 review 文件路径。

### 实施清单

- [x] 确认 `travel-guide.workflow.json` 与参数样例满足京都、3 天、春季、两位成人、首次访问、节奏均衡、雨天替代方案
- [x] 运行 Ultracode `travel-guide` workflow
- [x] 检查最终攻略是否包含每日行程、交通、餐饮、雨天替代、预算与打包提醒
- [x] 检查 review 是否覆盖可行性、安全性、节奏与遗漏假设
- [x] 在本节补充 Review，并向用户返回攻略与 review 文件路径

### Review

- 本次使用 `travel-guide` workflow 和专用参数文件 `.ultracode/inputs/kyoto-spring-3day.param.json`，目标为首次京都、两位成人、春季 3 天、节奏轻松到均衡、公共交通/步行为主、含每日雨天替代。
- 首次 MCP run `kyoto-spring-3day-20260604` 因外层工具 120 秒超时停留在 stale running；随后 CLI fallback 暴露本机 Codex CLI optional binary 缺失，已通过重新安装 `@openai/codex@latest` 恢复 `codex-cli 0.136.0`。
- 成功 run id：`kyoto-spring-3day-20260604-fixed`；运行 worktree：`/Users/chuntao.liao/Github/ai-native/codex-ultracode.worktrees/kyoto-spring-3day-20260604-fixed`。
- Ultracode status/report 验证：workflow `travel-guide` completed；`plan-brief`、`draft-itinerary`、`review-itinerary` 三个 stage 均 passed，无 failed gates。
- 攻略文件 213 行，覆盖第 1 天东山、第 2 天岚山/西北部二选一、第 3 天伏见稻荷/市中心；包含交通、餐饮、雨天替代、预算区间、打包提醒和出发前确认清单。
- Review 文件 15 行，结论为 `PASS（小修后可用）`，指出第 2 天跨区加点、雨天一致性、雨天安全、关键假设和预算表达等改进点。

## Ultracode 与 Claude 委托模式对比分析计划

### 目标

对照本机 `claude-plugin-codex` 的实际委托模式，判断当前 `codex-ultracode` 从“可运行 workflow runtime”到“用户友好的 Ultracode 模式”还缺哪些能力，并按优先级给出改进建议。

### 实施清单

- [x] 阅读 Claude 插件 README、task command 和 MCP server，确认其用户入口、参数模型与权限模型
- [x] 阅读 Ultracode Skill、MCP server、CLI 和 JSON runner，确认当前触发面与运行时能力
- [x] 对比两者差异，区分“必须补齐的用户体验层”和“增量编排能力”
- [x] 在本节补充 Review，并向用户返回结论

### Review

- Claude 插件的核心体验是 `$claude task ...`：用户只表达任务意图，`cwd`、CLI 调用、默认权限、模型和 effort 等由桥接层处理或作为少量可选项暴露。
- 当前 Ultracode 已具备 workflow 执行、git worktree 隔离、stage artifact、status/tail/report/watch 和 MCP 查询工具，但 `run` 入口仍要求显式 `workflowFile` 与 `paramFile`。
- 当前 README 已把 `skills/ultracode/workflows/` named workflow registry 标为下一步，但代码里还没有 `run-name`、`ultracode_run_named`、workflow catalog 或 param template resolver。
- 当时 `dependsOn` 已出现在 workflow schema 类型里，但 runner 尚未具备拓扑依赖执行；后续已补齐拓扑依赖执行和基于依赖图的 cascade。
- `restartStage()` 和 `reworkStage()` 已在 stage 层存在，但还没有 CLI/MCP 用户入口，失败后重跑/带反馈返工仍不能作为一等操作使用。

## 动态 Ultracode 体验第一阶段实现计划

### 目标

把 Ultracode 从 file-based runner 推进到用户只关心 workflow name 和任务意图的体验：优先支持 named workflow registry、参数模板解析、CLI `run-name`、MCP `ultracode_run_named`，并为后续动态 workflow planner 留出受约束入口。

### 实施清单

- [x] 先写失败测试，覆盖 named workflow 发现、参数模板合并、CLI `run-name` 解析和 MCP `ultracode_run_named`
- [x] 实现 `skills/ultracode/workflows/travel-guide/` 注册表样例
- [x] 实现 workflow registry / param resolver 模块
- [x] 接入 CLI `run-name <workflow-name>`，自动生成临时 param 文件和默认 run id/outputDir
- [x] 接入 MCP `ultracode_run_named`，让 Codex 内部只传 `cwd`、`workflowName`、`intent` 和可选 `params`
- [x] 补齐 CLI/MCP workflow 发现入口：`list-workflows`、`describe-workflow`、`ultracode_list_workflows`、`ultracode_describe_workflow`
- [x] 接入安全的动态 workflow plan preview：`plan-dynamic` 和 `ultracode_plan_dynamic`
- [x] 更新 Skill 与 README，使用户-facing prompt 不再暴露 `cwd`、`runId`、`outputDir`
- [x] 运行完整验证并补充 Review

### Review

- 新增 `scripts/src/named-workflows.ts`，默认从 `skills/ultracode/workflows/` 发现 named workflows，要求每个 workflow 目录包含 `workflow.json` 和 `param.template.json`，可选 `README.md`。
- 新增内置 named workflow：`skills/ultracode/workflows/travel-guide/`，包含 workflow、param template 和使用说明。
- `createParamFileFromTemplate()` 会深合并对象参数，数组按用户输入覆盖，并把自然语言 `intent` 写入 `goal` 和 `intent`。
- CLI 新增 `run-name`、`list-workflows`、`describe-workflow`、`plan-dynamic`；file-based `run` 保留给 CI、底层测试和显式 JSON 场景。
- MCP 新增 `ultracode_run_named`、`ultracode_list_workflows`、`ultracode_describe_workflow`、`ultracode_plan_dynamic`。
- 动态 planner 当前是安全预览模式：匹配旅游攻略类 intent 时推荐 `travel-guide`；否则生成受约束的三阶段 workflow 草案并标记 `requiresConfirmation: true`，不直接执行动态 JSON。
- README / README.zh-CN / Skill 已更新为 named-first 体验，并明确开放式请求先 plan、再确认。
- 验证通过：RED 测试确认缺口，随后 `npm test` 40 项通过、`npm run typecheck` 通过；实际 CLI `list-workflows`、`describe-workflow travel-guide`、`plan-dynamic` 两种路径均可运行。

## 动态 Ultracode 确认执行计划

### 目标

在动态 workflow 预览能力之上，补齐“用户确认后可执行”的受控路径：执行前强制 `approved`、校验动态 workflow 安全边界、生成临时 workflow/param 文件，并继续复用现有 worktree 和 JSON runner。

### 实施清单

- [x] 先写失败测试，覆盖动态 workflow 校验、临时文件生成、CLI `run-dynamic` 和 MCP `ultracode_run_dynamic`
- [x] 实现 `scripts/src/dynamic-runner.ts`，校验动态 workflow 的 stage 类型、依赖、gate 和输出路径
- [x] 接入 CLI `run-dynamic --intent ... --approved true`
- [x] 接入 MCP `ultracode_run_dynamic`，要求传入确认后的 workflow 和 `approved: true`
- [x] 更新 README / README.zh-CN / Skill 的动态执行说明
- [x] 运行完整验证并补充 Review

### Review

- 新增 `validateDynamicWorkflow()`：只允许 `type=codex` stage，禁止动态 workflow 带 gate，要求 `dependsOn` 只能引用已出现的 stage，要求输出文件是安全相对路径。
- 新增 `createDynamicWorkflowFiles()`：执行前把确认后的 workflow 写入 `workflow.dynamic.json`，把 `mode=read-only`、`goal`、`intent` 和结构化参数写入 `param.dynamic.json`。
- CLI 新增 `run-dynamic`：要求 `--approved true`；未确认时真实 smoke test 会直接返回 `workflow.failed`，不会执行 workflow。
- MCP 新增 `ultracode_run_dynamic`：要求 `approved: true`，否则返回 `isError: true`；确认后生成动态文件并交给现有 `runJsonWorkflow()`。
- 动态执行仍复用 git worktree 隔离、trace、status/report 和现有 stage artifact 结构。
- 验证通过：`npm test` 46 项通过、`npm run typecheck` 通过、未确认 `run-dynamic --approved false` 负向 smoke 按预期失败。

## Workflow Stage Restart/Rework 入口计划

### 目标

把已有底层 `restartStage()` / `reworkStage()` primitive 提升为用户可直接使用的 workflow-level 能力：用户只需要提供 `outputDir` 和 `stageName`，就能重跑指定 stage 或带反馈返工，并自动刷新 workflow 状态。

### 实施清单

- [x] 先写失败测试，覆盖 workflow-level restart/rework、CLI 参数解析和 MCP tool 调用
- [x] 实现 `scripts/src/workflow-actions.ts`，从 `workflow-result.json` 定位 stage、读取 `stage.json` 并创建下一次 attempt
- [x] 接入 CLI `restart-stage <outputDir> <stageName>`
- [x] 接入 CLI `rework-stage <outputDir> <stageName> --feedback <json>`
- [x] 接入 MCP `ultracode_restart_stage` 与 `ultracode_rework_stage`
- [x] 更新 README / README.zh-CN / Skill
- [x] 运行完整验证并补充 Review

### Review

- 新增 `restartWorkflowStage()`：读取 latest attempt 的 input，创建下一次 attempt，并更新 `workflow-result.json` 和 `status.json`。
- 新增 `reworkWorkflowStage()`：把结构化 feedback 写入下一次 attempt 的 `input.rework`，并保留 previous attempt 的 output/result 引用。
- CLI 新增 `restart-stage` 和 `rework-stage`，终端用户无需手动进入 stage attempt 目录。
- MCP 新增 `ultracode_restart_stage` 和 `ultracode_rework_stage`，Codex 可在 gate 失败、输出中断或 review 反馈后直接触发下一次 attempt。
- 初版 restart/rework 只重跑指定 stage；后续已补齐显式 `cascade: true` / `--cascade true` 下游级联能力。
- 验证通过：`npm test` 50 项通过、`npm run typecheck` 通过。

## Run 历史与产物体验计划

### 目标

让用户不需要记住 `outputDir` 也能继续操作 Ultracode：可以列出最近 runs、根据 run id 查看最终产物路径和预览、清理旧 run 产物目录。

### 实施清单

- [x] 先写失败测试，覆盖 run 扫描、artifact 查询、prune 删除、CLI 解析和 MCP tool 调用
- [x] 实现 `scripts/src/run-registry.ts`
- [x] 接入 CLI `list-runs`、`artifact <runId>`、`prune-runs <runId>[,<runId>]`
- [x] 接入 MCP `ultracode_list_runs`、`ultracode_artifact`、`ultracode_prune_runs`
- [x] 更新 README / README.zh-CN / Skill
- [x] 运行完整验证并补充 Review

### Review

- `listRuns()` 会扫描当前 checkout 的 `.ultracode/runs/` 和 sibling `<repo>.worktrees/*/.ultracode/runs/`，并按目录更新时间倒序返回。
- 当多个 run 的更新时间相同时，`listRuns()` 会按 `runId` 和 `outputDir` 做确定性排序，避免文件系统时间戳精度导致列表顺序漂移。
- `getRunArtifact()` 复用 `inspectWorkflowReport()` 获取最终产物路径和 4000 字符预览。
- `pruneRuns()` 只删除 `.ultracode/runs/<runId>` 产物目录，不删除 git worktree。
- CLI 新增 `list-runs`、`artifact`、`prune-runs`；MCP 新增 `ultracode_list_runs`、`ultracode_artifact`、`ultracode_prune_runs`。
- 验证通过：`npm test` 55 项通过、`npm run typecheck` 通过。

## Downstream Cascade Rework 计划

### 目标

当用户对中间 stage 做 restart/rework 后，可以显式选择级联重跑下游 stages，避免后续 stage 继续引用旧 attempt 的 artifact。

### 实施清单

- [x] 先写失败测试，覆盖两阶段 workflow 的 cascade rework、CLI `--cascade true` 和 MCP `cascade: true`
- [x] 在 `workflow-actions.ts` 中根据运行目录里的 `workflow.json` / `param.json` 重新渲染下游 stage 输入
- [x] 接入 CLI `restart-stage` / `rework-stage` 的 `--cascade true`
- [x] 接入 MCP `ultracode_restart_stage` / `ultracode_rework_stage` 的 `cascade`
- [x] 更新 README / README.zh-CN / Skill
- [x] 运行完整验证并补充 Review

### Review

- cascade 默认关闭；restart/rework 仍然只重跑指定 stage，除非显式传 `cascade: true` 或 `--cascade true`。
- cascade 会读取运行产物中的 `workflow.json` 与 `param.json`，按 JSON runner 的插值规则重新渲染下游 stage 的 input 和 prompt。
- 下游 stages 会创建下一次 attempt，并在 `workflow-result.json` 中替换 latest stage result；`status.json` 会随之刷新。
- 测试覆盖了 rework 第一个 stage 后，下游 stage 的输入指向新的上游 outputFile。
- 验证通过：`npm test` 56 项通过、`npm run typecheck` 通过。

## Workflow 依赖图执行计划

### 目标

让 `dependsOn` 成为真实执行语义，而不只是 schema 字段：JSON runner 应按依赖图拓扑执行 stage，动态 workflow 校验应允许前向依赖但拒绝未知依赖和循环依赖，restart/rework cascade 应按依赖图找下游 stage。

### 实施清单

- [x] 先写失败测试，覆盖乱序声明但有 `dependsOn` 的 workflow 能正确执行
- [x] 覆盖未知依赖、重复 stage name、循环依赖的错误信息
- [x] 覆盖动态 workflow 校验允许前向依赖并拒绝循环依赖
- [x] 抽出共享依赖解析模块，统一 runner、dynamic validator 和 cascade 的依赖语义
- [x] 更新 README / README.zh-CN / Skill，说明 `dependsOn` 的真实行为
- [x] 运行完整验证并补充 Review

### Review

- 新增 `scripts/src/workflow-deps.ts`，集中处理 stage name 去重、未知依赖、循环依赖、拓扑排序和传递下游查找。
- `runJsonWorkflow()` 现在会先校验依赖图，再按拓扑顺序执行 stage；同一批可执行 stage 保留声明顺序。
- 动态 workflow 校验现在允许前向依赖，但会拒绝未知依赖和循环依赖。
- `restartWorkflowStage()` / `reworkWorkflowStage()` 的 cascade 现在只重跑传递下游依赖，不再简单重跑数组位置后面的所有 stage；独立 stage 会保持原 attempt。
- README / README.zh-CN / Skill 已补充 `dependsOn` 的真实执行语义和 cascade 的传递下游语义。
- 验证通过：`npm test` 60 项通过、`npm run typecheck` 通过、插件 manifest 校验通过。

## 动态 Planner 模板升级计划

### 目标

让 `ultracode_plan_dynamic` 不再只生成单一通用三段模板，而是根据任务意图选择更贴近场景的受控 workflow 模板。代码修改类任务应显式包含一个 `agent.mode=write` 的实现 stage，但仍必须经过 preview 和 `approved: true` 才能执行。

### 实施清单

- [x] 先写失败测试，覆盖代码修改意图生成 write-capable workflow
- [x] 覆盖研究/资料整理意图生成 research workflow，而不是 generic execute-task
- [x] 覆盖动态 workflow 校验接受合法 `agent.mode` 并拒绝非法 mode
- [x] 实现确定性 intent 分类和模板生成，保持 named workflow 优先
- [x] 更新 README / README.zh-CN / Skill，说明动态 write stage 的确认边界
- [x] 运行完整验证并补充 Review

### Review

- `planDynamicWorkflow()` 仍保持 named workflow 优先；只有没有匹配 registered workflow 时才进入动态模板分类。
- 新增 code-change 模板：`change-brief` -> `implement-change` -> `review-change`，其中 `implement-change` 显式设置 `agent.mode: "write"`。
- 新增 research 模板：`research-scope` -> `collect-findings` -> `synthesize-report`，全程 read-only，最终产物为 `research-report.md`。
- 保留 generic fallback：`scope-brief` -> `execute-task` -> `review-result`。
- 动态 workflow validator 现在会接受 `agent.mode` 为 `read-only` / `write`，并拒绝其他 mode。
- README / README.zh-CN / Skill 已说明动态 write stage 必须先展示 preview，并且只有用户确认后才能通过 `approved: true` 执行。
- 验证通过：`npm test` 63 项通过、`npm run typecheck` 通过、插件 manifest 校验通过；CLI smoke 覆盖 code-change 与 research 两类 plan-dynamic 输出。

## Dynamic Plan Preview 体验计划

### 目标

让用户确认动态 workflow 前不必阅读整段 JSON：`ultracode_plan_dynamic` 应返回结构化 preview，CLI 应优先展示摘要、stage 数量、write stage、预计产物和风险提示，然后再附完整 workflow JSON。

### 实施清单

- [x] 先写失败测试，覆盖 code-change preview 包含 write stage 和风险提示
- [x] 覆盖 research preview 标记为 read-only 且列出最终产物
- [x] 覆盖 CLI `formatDynamicWorkflowPlan()` 的人类可读展示
- [x] 实现 `DynamicWorkflowPreview` 并接入 planner 输出
- [x] 更新 README / README.zh-CN / Skill，说明确认前应展示 preview 摘要
- [x] 运行完整验证并补充 Review

### Review

- 新增 `DynamicWorkflowPreview`：包含 `summary`、`stageCount`、`writeStages`、`outputFiles`、`risks` 和 `confirmationPrompt`。
- `planDynamicWorkflow()` 的 `review_dynamic` 结果现在会同时返回完整 workflow JSON 和结构化 preview；MCP 结构化结果会自然带上该 preview。
- CLI `formatDynamicWorkflowPlan()` 现在先输出 preview，再输出完整 workflow JSON，避免用户只能面对整段 JSON 做确认。
- code-change preview 会明确列出 `implement-change` write stage，并提示 write-mode 风险。
- research/generic preview 会明确没有 write stage，并提示 read-only 语义。
- README / README.zh-CN / Skill 已要求 Codex 在请求用户确认前展示 preview 摘要、write stages、产物和风险，再展示完整 JSON。
- 验证通过：`npm test` 64 项通过、`npm run typecheck` 通过、插件 manifest 校验通过；真实 CLI smoke 显示 `Preview:`、`Write stages:`、`Output files:` 和风险提示。

## Dynamic Plan Artifact 计划

### 目标

让动态 workflow 的确认链路有可复用的 plan artifact：`plan-dynamic --output-plan <file>` 写出 `{ intent, plan, createdAt }`，`run-dynamic --plan-file <file> --approved true` 直接执行该文件中的 workflow，不再要求用户或 agent 手动复制 JSON，也避免确认后重新规划出不同 workflow。

### 实施清单

- [x] 先写失败测试，覆盖 plan 文件写出与读取
- [x] 覆盖 CLI `plan-dynamic --output-plan` 和 `run-dynamic --plan-file`
- [x] 覆盖 MCP `ultracode_run_dynamic` 可通过 `planFile` 执行
- [x] 实现 plan artifact 读写模块并接入 CLI/MCP
- [x] 更新 README / README.zh-CN / Skill 的 plan-file 确认流程
- [x] 运行完整验证并补充 Review

### Review

- 新增 `scripts/src/dynamic-plan-file.ts`，支持写入和读取 `{ intent, createdAt, plan }` dynamic plan artifact。
- CLI `plan-dynamic` 新增 `--output-plan` / `--outputPlan`，会把当前 preview 和 workflow 写入可复用 plan 文件。
- CLI `run-dynamic` 新增 `--plan-file` / `--planFile`，可直接从已审阅 plan 文件读取 intent 和 workflow；旧的 `--intent` 路径仍保留。
- MCP `ultracode_run_dynamic` 新增 `planFile` 输入；传入后会从 plan artifact 读取 workflow，避免手动复制 JSON。
- `run-dynamic` 仍强制 `approved=true`，即使传入 plan file 也不能绕过确认门禁。
- README / README.zh-CN / Skill 已推荐 plan-file 确认流程。
- 验证通过：`npm test` 66 项通过、`npm run typecheck` 通过、插件 manifest 校验通过；CLI smoke 验证 plan 文件生成成功且 `--approved false` 会失败。

## Approved Plan Artifact 计划

### 目标

当 `run-dynamic --plan-file` 或 MCP `ultracode_run_dynamic` 通过 `planFile` 执行时，在 run 产物目录写入 `approved-plan.json`，保存被批准的 plan、原始 plan 文件路径和创建时间，便于后续审计和排查。

### 实施清单

- [x] 先写失败测试，覆盖 approved plan artifact 写入
- [x] 覆盖 MCP 通过 `planFile` 执行时返回 `approvedPlanFile`
- [x] 接入 CLI/MCP `run-dynamic` 的 plan-file 路径
- [x] 更新 README / README.zh-CN / Skill，说明 run 产物里会保留 `approved-plan.json`
- [x] 运行完整验证并补充 Review

### Review

- 新增 `copyApprovedDynamicPlanFile()`，当动态执行来自 plan file 时，把已确认计划复制为 run 产物目录下的 `approved-plan.json`。
- `approved-plan.json` 保留 `sourcePlanFile`、`intent`、`createdAt` 和完整 `plan`，用于审计“实际执行的是哪个已确认动态 workflow”。
- CLI `run-dynamic --plan-file <file> --approved true` 已接入 approved plan artifact 写入，不改变原有确认 gate。
- MCP `ultracode_run_dynamic` 通过 `planFile` 执行时会返回 `structuredContent.plan.approvedPlanFile`。
- README、README.zh-CN 和 Ultracode Skill 已说明 plan-file 执行会生成 `approved-plan.json`，并说明 MCP 返回 `approvedPlanFile`。
- 验证通过：`npm test` 66 项通过、`npm run typecheck` 通过、插件 manifest 校验通过；CLI smoke 验证 plan 文件生成成功且 `--approved false` 会失败。

## MCP Dynamic Plan Artifact 计划

### 目标

让 Codex 内部通过 MCP 规划动态 workflow 时，也能直接保存可复用 plan artifact：`ultracode_plan_dynamic` 接收可选 `cwd` 和 `outputPlan`，返回 `planFile`，后续用户确认后可把同一个 `planFile` 交给 `ultracode_run_dynamic` 执行。

### 实施清单

- [x] 先写失败测试，覆盖 MCP `ultracode_plan_dynamic` 返回 `planFile`
- [x] 接入 MCP `outputPlan` / `cwd` 参数和 plan 文件写入
- [x] 更新 README / README.zh-CN / Skill，说明 Codex 内部优先使用 `planFile`
- [x] 运行完整验证并补充 Review

### Review

- MCP `ultracode_plan_dynamic` 新增可选 `cwd` 和 `outputPlan` 输入；相对 `outputPlan` 会优先按 `cwd` 解析。
- 规划阶段现在可直接写出 `{ intent, createdAt, plan }` plan artifact，并在结构化返回中包含 `planFile` 和 `createdAt`。
- Codex 内部开放式任务流程更新为：规划时保存 `planFile`，展示 preview 和 `planFile`，用户确认后用同一个 `planFile` 调用 `ultracode_run_dynamic`。
- README、README.zh-CN 和 Ultracode Skill 已说明 MCP planning 的 `cwd` / `outputPlan` 用法，以及确认后优先执行 `planFile`。
- 验证通过：先观察到 MCP 测试因 `writtenPlan` 未写入而失败；实现后 `tests/mcp.test.mjs` 12 项通过；`npm test` 66 项通过、`npm run typecheck` 通过、插件 manifest 校验通过。
- MCP smoke 验证 `ultracode_plan_dynamic` 可写出 `.ultracode/plans/mcp-smoke.plan.json`，返回绝对 `planFile`，文件包含 `intent`、`createdAt` 和 `plan`；smoke 文件已清理。

## MCP 自动 Dynamic Plan 路径计划

### 目标

进一步减少 Codex 和用户需要感知的参数：`ultracode_plan_dynamic` 只要收到 `cwd`，即使没有显式 `outputPlan`，也会自动生成 `.ultracode/plans/<intent-slug>-<timestamp>.plan.json` 并返回 `planFile`。

### 实施清单

- [x] 先写失败测试，覆盖 MCP `ultracode_plan_dynamic` 仅传 `cwd` 时自动写出 `planFile`
- [x] 实现安全 slug 和默认 plan 文件路径
- [x] 更新 README / README.zh-CN / Skill，说明 `outputPlan` 只用于覆盖默认路径
- [x] 运行完整验证并补充 Review

### Review

- `ultracode_plan_dynamic` 现在只要收到 `cwd` 且未显式传 `outputPlan`，就会自动写出 `.ultracode/plans/<intent-slug>-<timestamp>.plan.json`。
- 默认文件名会把 intent 转成安全小写 slug，非字母数字字符折叠为 `-`，并截断到 80 字符；空 slug 回退为 `dynamic-workflow`。
- `outputPlan` 仍保留为覆盖默认路径的高级选项；不传 `cwd` 时仍只返回 preview，不写本地文件。
- README、README.zh-CN 和 Ultracode Skill 已更新为：Codex 内部规划开放式任务时传 `cwd` 即可，`outputPlan` 只在需要确定性路径时使用。
- 验证通过：先观察到新增 MCP 测试因 `writtenPlan` 未写入而失败；实现后 `tests/mcp.test.mjs` 13 项通过；`npm test` 67 项通过、`npm run typecheck` 通过、插件 manifest 校验通过。
- MCP smoke 验证仅传 `cwd` 和 `intent` 可真实写出默认 plan 文件，文件包含 `intent`、`createdAt` 和 `plan.workflow`；smoke 文件已清理。

## Debug/Fix 动态 Workflow 模板计划

### 目标

让动态 planner 对测试失败、CI 失败、报错和 bug 修复类任务生成更贴近实际排障流程的 workflow：先复现失败，再诊断根因，再修复，最后验证并总结，而不是直接使用通用代码修改三阶段模板。

### 实施清单

- [x] 先写失败测试，覆盖 failure/debug/CI 类 intent 生成 debug/fix workflow
- [x] 实现 debug/fix intent 分类和四阶段模板
- [x] 更新 README / README.zh-CN / Skill，说明动态 planner 的 debug/fix 场景
- [x] 运行完整验证并补充 Review

### Review

- 动态 planner 新增 debug/fix intent 分类，匹配 `debug`、`failing`、`failed`、`ci`、`error`、`exception`、`root cause`、`测试失败`、`报错`、`根因` 等失败诊断类请求。
- 新增 debug/fix workflow 模板：`reproduce-failure` -> `diagnose-root-cause` -> `implement-fix` -> `verify-fix`。
- 只有 `implement-fix` 是 `agent.mode: "write"`；复现、诊断和验证阶段均为 read-only，方便用户确认时判断写操作边界。
- preview 会显示 4 个 stages、write stage 为 `implement-fix`，输出文件为 `failure-reproduction.md`、`root-cause-analysis.md`、`fix-summary.md`、`verification-report.md`。
- README、README.zh-CN 和 Ultracode Skill 已更新动态模板说明：debug/fix、code-change、research、generic 四类场景。
- 验证通过：先观察到 debug/fix 测试落入旧 code-change 模板而失败；实现后 planner 测试通过；`npm test` 68 项通过、`npm run typecheck` 通过、插件 manifest 校验通过。
- CLI smoke 验证 failing CI intent 生成四阶段 debug/fix preview，并写出包含同样阶段和 `implement-fix` write stage 的 plan 文件；smoke 文件已清理。

## 结构化动态确认预览计划

### 目标

让动态 workflow 的确认信息更像审批单：除了摘要、write stage、产物和风险，还要返回逐阶段 `stagePlan`，列出每个 stage 的名称、agent mode、依赖和输出文件，方便 Codex 直接用自然语言展示给用户。

### 实施清单

- [x] 先写失败测试，覆盖 `preview.stagePlan` 结构
- [x] 覆盖 CLI `formatDynamicWorkflowPlan()` 展示 Stage plan 区块
- [x] 实现 `stagePlan` 生成和 CLI 格式化
- [x] 更新 README / README.zh-CN / Skill，要求确认前展示 `stagePlan`
- [x] 运行完整验证并补充 Review

### Review

- `DynamicWorkflowPreview` 新增 `stagePlan`，每个条目包含 `name`、`mode`、`outputFile` 和 `dependsOn`。
- `createPreview()` 会从 workflow stages 自动生成 `stagePlan`；未显式声明 `agent.mode` 的 stage 默认显示为 `read-only`。
- CLI `formatDynamicWorkflowPlan()` 新增 `Stage plan:` 区块，逐行展示 stage 名称、agent mode、输出文件和依赖关系。
- Codex-facing README、README.zh-CN 和 Ultracode Skill 已更新，要求确认动态 workflow 前展示 `preview.stagePlan`，避免用户只面对完整 JSON。
- 验证通过：先观察到 planner 测试因 `preview.stagePlan` 为 `undefined` 失败、CLI 测试因缺少 `Stage plan:` 失败；实现后相关测试通过。
- 完整验证通过：`npm test` 68 项通过、`npm run typecheck` 通过、插件 manifest 校验通过。
- CLI smoke 验证 debug/fix intent 的 preview 实际输出 `Stage plan:`，并逐行显示 read-only/write 模式、输出文件和依赖关系。

## Dynamic Run 后续查询指引计划

### 目标

让 `ultracode_run_dynamic` 的 MCP 返回结果直接告诉 Codex 下一步如何展示和查询运行结果：返回 `runId`、`outputDir`、`approvedPlanFile`、以及可直接传给 `ultracode_status`、`ultracode_tail`、`ultracode_report`、`ultracode_artifact` 的 structured arguments。

### 实施清单

- [x] 先写失败测试，覆盖 dynamic run 返回 `inspection` 指引
- [x] 实现 `inspection` / `nextActions` 结构化返回
- [x] 更新 README / README.zh-CN / Skill，说明动态执行后优先使用返回的 `inspection`
- [x] 运行完整验证并补充 Review

### Review

- MCP `ultracode_run_dynamic` 的 structuredContent 新增 `inspection`，包含 `runId`、`outputDir`、可选 `approvedPlanFile`。
- `inspection.status`、`inspection.tail`、`inspection.report`、`inspection.artifact` 分别包含对应 MCP tool 名称和 ready-to-call `arguments`，Codex 无需自行推断 `outputDir` 或 `runId`。
- `inspection.nextActions` 给出执行后推荐动作：先查 status，完成后查 report，并把 `approvedPlanFile` 作为动态 plan 审计记录。
- README、README.zh-CN 和 Ultracode Skill 已说明 dynamic run 后优先使用 `structuredContent.inspection` 进行后续展示和查询。
- 验证通过：先观察到 MCP plan-file dynamic run 测试因 `inspection` 为 `undefined` 失败；实现后 `tests/mcp.test.mjs` 13 项通过。
- 完整验证通过：`npm test` 68 项通过、`npm run typecheck` 通过、插件 manifest 校验通过。

## 统一 MCP Run 后续查询指引计划

### 目标

让所有 MCP run 工具都返回统一 `inspection`：`ultracode_run`、`ultracode_run_named`、`ultracode_run_dynamic` 执行完成后都能给 Codex ready-to-call 的 status/tail/report/artifact 参数，避免不同入口后续展示逻辑不一致。

### 实施清单

- [x] 先写失败测试，覆盖 `ultracode_run` 返回 `inspection`
- [x] 先写失败测试，覆盖 `ultracode_run_named` 返回 `inspection`
- [x] 实现 run / run_named 的 `inspection` 返回，并让 `nextActions` 根据是否有 `approvedPlanFile` 调整
- [x] 更新 README / README.zh-CN / Skill，说明所有 MCP run 工具都返回统一 `inspection`
- [x] 运行完整验证并补充 Review

### Review

- MCP `ultracode_run` 和 `ultracode_run_named` 现在也返回统一 `inspection`，与 `ultracode_run_dynamic` 的后续查询结构一致。
- `inspection` 包含 `runId`、`outputDir`、status/tail/report/artifact 的 ready-to-call arguments 和 `nextActions`。
- `createWorkflowInspectionLinks()` 现在只在存在 approved plan 时返回 `approvedPlanFile`，普通 run / named run 不再带 `approvedPlanFile: undefined`。
- README、README.zh-CN 和 Ultracode Skill 已更新：所有 MCP run 工具都返回 `inspection`；dynamic plan-file run 额外带 `inspection.approvedPlanFile`。
- 验证通过：先观察到 `ultracode_run` / `ultracode_run_named` 测试因 `inspection` 为 `undefined` 失败；实现后 `tests/mcp.test.mjs` 13 项通过。
- 完整验证通过：`npm test` 68 项通过、`npm run typecheck` 通过、插件 manifest 校验通过。

## Dynamic Plan 确认后执行指引计划

### 目标

让 `ultracode_plan_dynamic` 在返回 `planFile` 时，同时返回 `executionAfterApproval`：一个确认后可直接传给 `ultracode_run_dynamic` 的 tool/arguments 结构，并明确只有用户确认后才能执行。

### 实施清单

- [x] 先写失败测试，覆盖 plan_dynamic 返回 `executionAfterApproval`
- [x] 实现确认后执行指引，包含 `tool`、`arguments` 和 confirmation gate 文案
- [x] 更新 README / README.zh-CN / Skill，说明确认后使用 `executionAfterApproval.arguments`
- [x] 运行完整验证并补充 Review

### Review

- MCP `ultracode_plan_dynamic` 在写出 `planFile` 且返回 `review_dynamic` 时，现在会同时返回 `executionAfterApproval`。
- `executionAfterApproval` 包含 `tool: ultracode_run_dynamic`、确认后可直接使用的 `arguments`：`cwd`、`approved: true`、`planFile`。
- 返回里包含 `confirmationGate`，明确该执行指引只能在用户批准动态 workflow preview 后使用，不能绕过确认步骤。
- README、README.zh-CN 和 Ultracode Skill 已更新：Codex 应先展示 preview / stagePlan / risks / planFile / workflow JSON，用户确认后优先使用 `executionAfterApproval.arguments` 执行。
- 验证通过：先观察到 MCP 回归测试因 `executionAfterApproval` 为 `undefined` 失败；实现后 `npm test` 68 项通过、`npm run typecheck` 通过、插件 manifest 校验通过。
- MCP smoke 验证 `ultracode_plan_dynamic` 真实返回 `executionAfterApproval`，其中 `planFile` 位于当前仓库 `.ultracode/plans/`；smoke 临时 plan 文件已清理，保留既有 `.ultracode/inputs/kyoto-spring-3day.param.json`。

## Named Workflow 推荐执行指引计划

### 目标

让 `ultracode_plan_dynamic` 在推荐已有 named workflow 时，也返回可直接调用的 `execution` 指引。这样 Codex 只需要表达用户意图和可选结构化参数，不需要自己拼 `ultracode_run_named` 的参数。

### 实施清单

- [x] 先写失败测试，覆盖 `run_named` planning 返回 `execution`
- [x] 让 `ultracode_plan_dynamic` 接收可选 `params` 并透传到 `execution.arguments`
- [x] 实现 named workflow 推荐的 ready-to-call `tool` / `arguments`
- [x] 更新 README / README.zh-CN / Skill，说明推荐 named workflow 时优先使用 `execution.arguments`
- [x] 运行完整验证并补充 Review

### Review

- MCP `ultracode_plan_dynamic` 现在接受可选结构化 `params`；当 planner 推荐 `run_named` 且传入 `cwd` 时，会返回 `execution`。
- `execution` 包含 `tool: ultracode_run_named` 和 ready-to-call `arguments`：`cwd`、`workflowName`、`intent`、可选 `params`、可选 `registryDir`。
- `execution.approvalRequired` 为 `false`，用于区分 named workflow 推荐路径和动态 workflow 的确认后执行路径。
- README、README.zh-CN 和 Ultracode Skill 已更新：推荐 named workflow 时优先使用 `execution.arguments`，动态 workflow 仍需用户确认后使用 `executionAfterApproval.arguments`。
- 验证通过：先观察到新增 MCP 测试因 `execution` 为 `undefined` 失败；实现后 `tests/mcp.test.mjs` 14 项通过，完整 `npm test` 69 项通过，`npm run typecheck` 通过，插件 manifest 校验通过。
- MCP smoke 验证当前真实 registry 下，旅游攻略 intent 会推荐 `travel-guide` 并返回可直接调用的 `ultracode_run_named` 参数；smoke 临时 plan 文件已清理。

## Registry-Driven Named Workflow 匹配计划

### 目标

让 `ultracode_plan_dynamic` 不再硬编码 `travel-guide`。新增 workflow 只要放在 `skills/ultracode/workflows/<name>/` 并在 `workflow.json` 中声明描述和可选 `keywords`，planner 就能根据用户意图自动推荐最匹配的 named workflow。

### 实施清单

- [x] 先写失败测试，覆盖非 `travel-guide` workflow 也能被 planner 推荐
- [x] 扩展 named workflow summary，读取 `workflow.json` 中的可选 `keywords`
- [x] 实现通用 named workflow 匹配评分，基于 name、description 和 keywords
- [x] 给 `travel-guide` workflow 增加 keywords，并更新 README / README.zh-CN / Skill 说明
- [x] 运行完整验证并补充 Review

### Review

- `NamedWorkflowSummary` 新增可选 `keywords`，`listNamedWorkflows()` 会从 registered workflow 的 `workflow.json` 读取该字段。
- `planDynamicWorkflow()` 已移除硬编码 `travel-guide` 匹配，改为对所有 registered workflows 按 `name`、`description`、`keywords` 评分，选择最佳匹配。
- 新增测试覆盖 `release-notes` 这类非 `travel-guide` workflow 可通过 keyword `发布说明` 被推荐。
- `travel-guide/workflow.json` 已增加中英文 keywords，中文“京都 / 攻略 / 行程”等 intent 仍会推荐 `travel-guide`。
- README、README.zh-CN 和 Ultracode Skill 已说明 registered workflow 推荐填写 `keywords`，planner 会先尝试匹配 named workflow，再回退到动态 workflow preview。
- 验证通过：先观察到新增 planner 测试因返回 `review_dynamic` 失败；实现后 targeted tests 8 项通过，完整 `npm test` 70 项通过，`npm run typecheck` 通过，插件 manifest 校验通过。
- MCP smoke 验证真实中文京都攻略 intent 通过 registry keywords 推荐 `travel-guide` 并返回 `ultracode_run_named` 的 ready-to-call `execution`。

## 中文 Dynamic Plan 文件名计划

### 目标

修复中文 intent 自动保存 plan artifact 时 slug 信息丢失的问题。默认 `.ultracode/plans/<intent-slug>-<timestamp>.plan.json` 应保留中文关键词，而不是退化成类似 `3-<timestamp>.plan.json`。

### 实施清单

- [x] 先写失败测试，覆盖中文 intent 自动生成可读 plan 文件名
- [x] 修复 MCP 默认 plan slug 逻辑，保留中文字符并继续过滤不安全字符
- [x] 运行完整验证并补充 Review

### Review

- MCP 默认 plan slug 现在保留中文字符，仍会把非安全字符折叠为 `-` 并限制长度。
- 新增 MCP 测试覆盖中文 intent：旧行为会生成 `.ultracode/plans/3-<timestamp>.plan.json`，新行为生成包含中文关键词的文件名。
- 验证通过：先观察到新增测试因 planFile 为 `/repo/project/.ultracode/plans/3-...plan.json` 失败；实现后 `tests/mcp.test.mjs` 15 项通过，完整 `npm test` 71 项通过，`npm run typecheck` 通过，插件 manifest 校验通过。
- MCP smoke 验证中文开放任务真实写出 `.ultracode/plans/为当前实现做风险复盘并输出改进建议-<timestamp>.plan.json`；smoke 临时 plan 文件已清理。

## Codex 安装缓存刷新计划

### 目标

当前仓库已实现新的动态 workflow 体验，但 Codex 已安装插件缓存仍可能停留在旧版本。需要按本地插件开发流程更新 cachebuster、重新安装 `codex-ultracode@local`，并验证 Codex cache 中的 Skill/MCP 已同步最新源码。

### 实施清单

- [x] 使用 plugin-creator helper 更新 `.codex-plugin/plugin.json` 的 Codex cachebuster
- [x] 运行插件 manifest 校验
- [x] 执行 `codex plugin add codex-ultracode@local` 重新安装
- [x] 验证 `codex plugin list --marketplace local` 显示新版本
- [x] 验证 Codex cache 中的 Skill/MCP 包含最新 dynamic workflow 指令
- [x] 补充 Review

### Review

- 使用 plugin-creator helper 更新 cachebuster：`0.1.0+codex.20260603144328 -> 0.1.0+codex.20260606074637`。
- 默认个人 marketplace 名称确认为 `local`，来源仍是 `/Users/chuntao.liao/.agents/plugins/marketplace.json`。
- 插件 manifest 校验通过：`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode`。
- 已执行 `codex plugin add codex-ultracode@local`，安装缓存根目录为 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260606074637`。
- `codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260606074637`。
- 缓存中的 `skills/ultracode/SKILL.md` 已包含 `execution.arguments`、`executionAfterApproval.arguments`、registry keywords 等最新指令。
- 缓存中的 `README.zh-CN.md` 和 `travel-guide/workflow.json` 已包含 `keywords`，缓存 MCP 源码包含最新 dynamic planning 入口。
- 直接从缓存 `scripts/dist/mcp.js` 做 MCP smoke：中文京都攻略 intent 返回 `recommendedAction=run_named`、`workflowName=travel-guide`、`tool=ultracode_run_named`。
- MCP smoke 临时 `.ultracode/plans` 已清理，保留既有 `.ultracode/inputs/kyoto-spring-3day.param.json`。

## Named Workflow Plan Artifact 精简计划

### 目标

`ultracode_plan_dynamic` 推荐 named workflow 时，默认不再写 `.ultracode/plans`。named workflow 路径应直接返回 `execution` 供 Codex 调用；plan artifact 默认只用于需要用户审批的 `review_dynamic` 路径，避免简单推荐也产生临时文件。

### 实施清单

- [x] 先写失败测试，覆盖 `run_named` 推荐默认不调用 `writeDynamicPlanFile`
- [x] 实现 plan artifact 默认只为 `review_dynamic` 自动保存；显式 `outputPlan` 仍可强制写出
- [x] 更新 README / README.zh-CN / Skill 的 planFile 说明
- [x] 运行完整验证，刷新 Codex 安装缓存，并补充 Review

### Review

- MCP `ultracode_plan_dynamic` 现在会先构造 `execution`，再决定是否写 plan artifact。
- 当 planner 推荐 `run_named` 且没有显式 `outputPlan` 时，返回 `execution` 和 `workflowName`，但不写 `.ultracode/plans`，也不返回 `planFile` / `createdAt`。
- 当 planner 返回 `review_dynamic` 且传入 `cwd` 时，仍会默认写 `.ultracode/plans/<intent-slug>-<timestamp>.plan.json`，并返回 `executionAfterApproval.arguments`。
- 显式 `outputPlan` 仍保留为强制写出 plan artifact 的高级选项。
- README、README.zh-CN、Skill 和 MCP schema 已更新，说明 named workflow 推荐默认不创建 plan artifact，动态 preview 才会保存审批 plan。
- 验证通过：先观察到新增 MCP 测试因 `writeDynamicPlanFile` 被调用而失败；实现后 `tests/mcp.test.mjs` 15 项通过，完整 `npm test` 71 项通过，`npm run typecheck` 通过，插件 manifest 校验通过。
- MCP smoke 验证中文京都攻略 intent 返回 `run_named`、`travel-guide`，且 `.ultracode/plans` 未创建。
- MCP smoke 验证中文风险复盘 intent 返回 `review_dynamic`，仍会写出中文可读 planFile 和 `executionAfterApproval`；smoke 临时 plan 文件已清理。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260606074637 -> 0.1.0+codex.20260608142017`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608142017`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608142017/scripts/dist/mcp.js` 做 smoke：named 推荐不写 plan，dynamic preview 仍写 plan。

## 单入口 Intent Dispatch 计划

### 目标

新增 Codex 友好的 `ultracode_dispatch` MCP 工具：Codex 只传当前 workspace、用户自然语言 intent 和可选结构化 params。若 intent 匹配 registered named workflow，工具直接运行该 workflow 并返回统一 `inspection`；若没有匹配，则返回 `review_dynamic` preview、`planFile` 和 `executionAfterApproval`，等待用户确认后再执行。

### 实施清单

- [x] 先写失败测试，覆盖 `ultracode_dispatch` 命中 named workflow 时直接运行并返回 `inspection`
- [x] 先写失败测试，覆盖 `ultracode_dispatch` 未命中时返回 dynamic preview 且不执行 workflow
- [x] 实现 `ultracode_dispatch` MCP tool，复用现有 planning / run_named / dynamic preview 逻辑
- [x] 更新 README / README.zh-CN / Skill，推荐 Codex 对开放式请求优先使用 dispatch
- [x] 运行完整验证，刷新 Codex 安装缓存，并补充 Review

### Review

- 新增 MCP tool `ultracode_dispatch`：输入 `cwd`、自然语言 `intent`、可选 `params`、`runId`、`outputDir`、`worktreeDir`、`registryDir`、`outputPlan`。
- `ultracode_dispatch` 会先调用 dynamic planner。若推荐 `run_named`，它会直接复用 `ultracode_run_named` 路径运行 workflow，并返回 `dispatch.action: ran_named`、`plan`、运行结果和统一 `inspection`。
- 若 planner 返回 `review_dynamic`，`ultracode_dispatch` 不执行 workflow，只返回 `dispatch.action: needs_confirmation`、preview、`planFile` 和 `executionAfterApproval`。
- README、README.zh-CN 和 Skill 已更新：Codex 处理开放式 Ultracode 请求时优先使用 `ultracode_dispatch`；`ultracode_plan_dynamic` 仅用于明确只规划、不自动运行 matching named workflow 的场景。
- 验证通过：先观察到 `tools/list` 中缺少 `ultracode_dispatch`、dispatch 调用无 `dispatch.action` 的红灯；实现后 `tests/mcp.test.mjs` 17 项通过，完整 `npm test` 73 项通过，`npm run typecheck` 通过，插件 manifest 校验通过。
- MCP smoke 验证 dispatch named 分支返回 `ran_named` 和 `inspection.runId`；dynamic 分支返回 `needs_confirmation` 和 `review_dynamic`，且未调用 runner。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608142017 -> 0.1.0+codex.20260608143459`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608143459`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608143459/scripts/dist/mcp.js` 做 dispatch smoke：named 分支返回 `ran_named`，dynamic 分支返回 `needs_confirmation`。

## Write-Capable Named Workflow 确认计划

### 目标

`ultracode_dispatch` 可以自动运行 read-only named workflow，但不能自动运行包含 write-mode stage 的 named workflow。对 write-capable named workflow，dispatch 应返回确认预览和确认后可调用的 `ultracode_run_named` 参数，等待用户批准后再执行。

### 实施清单

- [x] 先写失败测试，覆盖 named workflow registry 读取 `writeStages` / `stagePlan`
- [x] 先写失败测试，覆盖 dispatch 匹配 write-capable named workflow 时不调用 runner
- [x] 实现 named workflow stage preview 和 write stage 检测
- [x] 实现 dispatch 对 write-capable named workflow 的确认门禁
- [x] 更新 README / README.zh-CN / Skill
- [x] 运行完整验证，刷新 Codex 安装缓存，并补充 Review

### Review

- `NamedWorkflowSummary` 现在包含 `stagePlan`、`writeStages` 和 `outputFiles`，由 registered workflow 的 `stages` 自动生成；未声明 `agent.mode` 的 stage 默认视为 `read-only`。
- `ultracode_dispatch` 命中 read-only named workflow 时仍自动运行；命中包含 write stage 的 named workflow 时返回 `dispatch.action: needs_confirmation`、确认预览和 `executionAfterApproval`，不会调用 runner。
- `executionAfterApproval` 对 write-capable named workflow 返回 `tool: ultracode_run_named` 和 ready-to-call arguments，只透传用户实际提供的 `runId`、`outputDir`、`worktreeDir`、`registryDir` 等可选字段。
- README、README.zh-CN、Ultracode Skill 和 MCP tool 描述已同步：open-ended 请求优先 dispatch；read-only named workflow 可自动运行；write-capable named workflow 和 dynamic workflow 都需要用户确认。
- 验证通过：先观察到 targeted 测试因 `writeStages` 缺失和 dispatch 误调用 runner 失败；实现后 targeted 测试 20 项通过。
- 完整验证通过：`npm test` 74 项通过、`npm run typecheck` 通过、插件 manifest 校验通过。
- MCP smoke 验证本仓库 dist 和安装缓存 dist 都会对 write-capable named workflow 返回 `needs_confirmation` / `ultracode_run_named`，且 `runJsonWorkflow` 未被调用。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608143459 -> 0.1.0+codex.20260608144937`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608144937`。

## CLI Intent Dispatch 计划

### 目标

把 MCP 的单入口 `ultracode_dispatch` 体验同步到终端：CLI 用户只输入 `ultracode dispatch --intent "<task>"`，不必先判断该用 `run-name`、`plan-dynamic` 还是 `run-dynamic`。CLI dispatch 应自动运行 read-only named workflow；对 write-capable named workflow 和 dynamic workflow 只展示确认预览与后续命令。

### 实施清单

- [x] 先写失败测试，覆盖 `dispatch --intent` 解析、结构化参数和确认预览格式
- [x] 实现 CLI dispatch：复用 registry matching 和 dynamic planner
- [x] 对 read-only named workflow 自动运行，复用 `run-name` 执行路径
- [x] 对 write-capable named workflow 返回确认预览和 `run-name` 后续命令，不执行 runner
- [x] 对 unmatched intent 自动写出 dynamic plan artifact，返回 `run-dynamic --plan-file ... --approved true` 后续命令
- [x] 更新 README / README.zh-CN / Skill
- [x] 运行完整验证，刷新 Codex 安装缓存，并补充 Review

### Review

- CLI 新增 `dispatch --intent "<task>"`，支持 `--params`、`--output-plan`、`--outputDir`、`--run-id`、`--worktree-dir`、`--registry-dir` 和 `--json`。
- `dispatch` 会复用当前 registry matching 和 dynamic planner：匹配 read-only named workflow 时自动复用 `run-name` 执行路径。
- 当匹配 write-capable named workflow 时，CLI 只输出确认预览和 `ultracode run-name ...` 后续命令，不调用 runner。
- 当没有 matching named workflow 时，CLI 自动写出 `.ultracode/plans/<intent-slug>-<timestamp>.plan.json`，输出 dynamic preview 和 `ultracode run-dynamic --plan-file ... --approved true` 后续命令。
- 新增 CLI 格式化函数：`formatNamedWorkflowConfirmation()` 和 `formatDynamicDispatchConfirmation()`，统一展示 stage plan、write stages、output files、plan file 和 next command。
- README、README.zh-CN 和 Ultracode Skill 已同步：MCP 不可用或终端/CI 场景优先使用 `ultracode dispatch --intent "<task intent>"`。
- 验证通过：先观察到 CLI targeted tests 因 `dispatch` 不存在和格式化函数缺失而失败；实现后 `tests/cli.test.mjs` 15 项通过。
- 完整验证通过：`npm test` 77 项通过、`npm run typecheck` 通过、插件 manifest 校验通过。
- CLI smoke 验证 dynamic 分支会写出 planFile 和 next command；write-capable named 分支只输出确认预览和 `run-name` 后续命令。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608144937 -> 0.1.0+codex.20260608150144`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608150144`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608150144/scripts/run-ultracode.mjs` 做 CLI dispatch smoke，返回 `needs_confirmation`、`planFile` 和 `nextCommand`。
- smoke 临时 `.ultracode/plans` 已清理，保留既有 `.ultracode/inputs/kyoto-spring-3day.param.json`。

## Review/Risk Intent 分类修复计划

### 目标

修复动态 planner 对审阅、风险分析、报告类任务的误判。像 `Review implementation risks` 或 “Review the current implementation plan and produce a risk report” 这类 intent 只要求分析与报告，不应因为包含 `implementation`、`plan`、`risk` 等词就生成包含 write stage 的 code-change workflow。

### 实施清单

- [x] 先写失败测试，覆盖 review/risk/analysis intent 生成 read-only research workflow
- [x] 实现非修改审阅类 intent 优先走 research workflow，避免误触发 code-change
- [x] 保留明确 implement/fix/update/modify 类请求的 write-capable code-change/debug-fix 行为
- [x] 运行 targeted 与完整验证，刷新 Codex 安装缓存
- [x] 补充 Review 并清理临时产物

### Review

- 新增 planner 回归测试，覆盖 `Review implementation risks`、`Review the current implementation plan and produce a risk report`、`分析当前实现方案的风险并输出改进建议`。
- 修复前这些 intent 会因为包含 `implementation` 等词命中 code-change，生成 `change-brief -> implement-change -> review-change` 且包含 write stage。
- `dynamic-planner.ts` 新增 `isReviewOnlyIntent()`，识别 review/risk/report/audit/assess/analyze/summary/investigate 及中文“风险/报告/审阅/分析/总结/调研”等只读分析意图。
- 分类顺序调整为 named workflow -> debug/fix -> review-only/research -> code-change -> research -> generic。明确失败修复仍保留 debug/fix，明确 implement/update/modify 且无 review-only 语义时仍保留 write-capable code-change。
- Targeted 验证通过：先观察到新增测试落入 code-change 而失败；实现后 `tests/dynamic-planner.test.mjs` 7 项通过。
- 完整验证通过：`npm test` 78 项通过、`npm run typecheck` 通过、插件 manifest 校验通过。
- CLI smoke 验证 `dispatch --intent "Review implementation risks"` 现在返回 `Dynamic research workflow`，`preview.writeStages` 为空，三个 stage 均为 read-only。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608150144 -> 0.1.0+codex.20260608150849`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608150849`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608150849/scripts/run-ultracode.mjs` 做同一 CLI dispatch smoke，确认缓存版本也返回 read-only research workflow。
- smoke 临时 `.ultracode/plans` 已清理，保留既有 `.ultracode/inputs/kyoto-spring-3day.param.json`。

## CLI Dynamic 执行 PlanFile 强制计划

### 目标

收紧 CLI 动态执行确认链路：`run-dynamic` 不应再接受 `--intent ... --approved true` 这种会在执行时重新规划的路径。CLI 动态 workflow 执行必须来自用户已审阅的 `--plan-file`，确保执行内容和确认预览一致。

### 实施清单

- [x] 先写失败测试，覆盖 `run-dynamic --intent ... --approved true` 被拒绝
- [x] 收紧 CLI `run-dynamic` 解析，只接受 `--plan-file` / `--planFile`
- [x] 移除 CLI 执行阶段的 intent-only replanning 路径
- [x] 更新 README / README.zh-CN / Skill，示例统一改成 dispatch/plan-file
- [x] 运行完整验证，刷新 Codex 安装缓存，并补充 Review

### Review

- CLI `run-dynamic` 现在要求 `--plan-file` / `--planFile`，不再接受 `--intent ... --approved true`。
- `resolveDynamicPlanForRun()` 只从 plan artifact 读取 `{ intent, plan }`，执行阶段不会再根据 intent 重新规划，避免确认后执行内容漂移。
- 保留 `dispatch` 和 `plan-dynamic --output-plan` 作为生成可审阅 plan artifact 的入口；`run-dynamic --plan-file ... --approved true` 作为唯一 CLI 动态执行入口。
- README、README.zh-CN 和 Ultracode Skill 已移除 intent-only dynamic run 示例，统一改成 plan-file 执行，并在 Skill 规则里明确禁止 CLI intent-only dynamic execution。
- 验证通过：先观察到新增 CLI 测试因 intent-only 路径未抛错而失败；实现后 `tests/cli.test.mjs` 15 项通过。
- 负向 CLI smoke 验证 `node scripts/run-ultracode.mjs run-dynamic --intent "Review the plan" --approved true` 返回 `workflow.failed`，错误为 `run-dynamic requires --plan-file...`。
- 完整验证通过：`npm test` 78 项通过、`npm run typecheck` 通过、插件 manifest 校验通过。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608150849 -> 0.1.0+codex.20260608152108`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608152108`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608152108/scripts/run-ultracode.mjs` 做同一负向 smoke，确认缓存版本也拒绝 intent-only dynamic execution。

## MCP Dynamic 执行 PlanFile 强制计划

### 目标

把 MCP 的 `ultracode_run_dynamic` 也收紧到同一确认链路：动态执行必须来自已审阅的 `planFile`。不再允许直接传 `workflow + approved=true`，避免 Codex 内部路径绕过 plan artifact 审计。

### 实施清单

- [x] 先写失败测试，覆盖 MCP `workflow + approved=true` 被拒绝且不调用 runner
- [x] 收紧 MCP tool schema，移除 direct `intent` / `workflow` 执行入口
- [x] 收紧 input parser 和 resolver，只允许 `planFile`
- [x] 更新 README / README.zh-CN / Skill 说明
- [x] 运行验证、刷新 Codex 安装缓存，并补充 Review

### Review

- MCP `ultracode_run_dynamic` 现在要求 `planFile`，tool schema 已移除 direct `intent` / `workflow` 执行入口。
- `buildRunDynamicWorkflowInput()` 会在缺少 `planFile` 时返回错误：`ultracode_run_dynamic requires planFile...`，并且不会调用 runner。
- `resolveDynamicPlanForMcpRun()` 只从 reviewed plan artifact 读取 intent 和 workflow；执行阶段不再接受直接传入的 raw workflow JSON。
- 保留 `approved: true` gate；即使有 `planFile`，未确认也会返回 unapproved 错误。
- README、README.zh-CN 和 Ultracode Skill 已同步：动态 MCP 执行必须使用 `executionAfterApproval.arguments` 中的 reviewed `planFile`，不要直接传 raw workflow JSON。
- 验证通过：先观察到新增 MCP 测试会进入旧 direct workflow 执行路径；实现后 `tests/mcp.test.mjs` 18 项通过。
- 负向 MCP smoke 验证 direct `workflow + approved=true` 返回 `isError: true`，错误为 `requires planFile`，且 `runJsonWorkflow` 未被调用。
- 完整验证通过：`npm test` 78 项通过、`npm run typecheck` 通过、插件 manifest 校验通过。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608152108 -> 0.1.0+codex.20260608153349`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608153349`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608153349/scripts/dist/mcp.js` 做同一负向 smoke，确认缓存版本也拒绝 direct workflow execution。
- smoke 未生成 `.ultracode/plans`；当前 `.ultracode` 下只保留既有 `.ultracode/inputs/`。

## Friendly CLI 触发入口计划

### 目标

进一步降低终端触发门槛：用户不必记住 `dispatch --intent` 或 `run-name <workflow> --intent`。CLI 应支持 `ultracode "<task intent>"` 作为开放式 dispatch，也支持 `ultracode <workflow-name> "<task intent>"` 作为 named workflow shortcut，让用户只关心 Ultracode 和 workflow name。

### 实施清单

- [x] 先写失败测试，覆盖 `ultracode "<intent>"` 解析为 dispatch
- [x] 先写失败测试，覆盖 `ultracode travel-guide "<intent>"` 解析为 named workflow run
- [x] 实现 friendly positional CLI 解析，保留现有显式命令不变
- [x] 更新 README / README.zh-CN / Skill 的推荐触发方式
- [x] 运行验证、刷新 Codex 安装缓存，并补充 Review

### Review

- CLI 新增 friendly positional shortcut：`ultracode "<task intent>"` 会解析为 `dispatch`，复用现有 intent-first 分发路径。
- CLI 新增 named workflow shortcut：`ultracode <workflow-name> "<task intent>"` 会解析为 `run-named`，仍支持 `--params`、`--run-id`、`--outputDir`、`--worktree-dir`、`--registry-dir`。
- 保留现有显式命令：`dispatch --intent`、`run-name <workflow> --intent`、`run`、`plan-dynamic`、`run-dynamic --plan-file` 等都没有改变。
- README、README.zh-CN 和 Ultracode Skill 已把推荐终端触发方式改成 shortcut；显式命令保留为高级/兼容入口。
- 验证通过：先观察到新增 CLI 测试因旧 usage 拒绝 shortcut 失败；实现后 `tests/cli.test.mjs` 17 项通过。
- 完整验证通过：`npm test` 80 项通过、`npm run typecheck` 通过、插件 manifest 校验通过。
- 真实 CLI smoke 验证 `node scripts/run-ultracode.mjs "Review implementation risks" --json` 返回 `needs_confirmation`、`review_dynamic`、read-only `stagePlan` 和 `run-dynamic --plan-file` 下一步命令。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608153349 -> 0.1.0+codex.20260608154256`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608154256`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608154256/scripts/run-ultracode.mjs` 做同一 shortcut smoke，确认安装缓存也支持无 `dispatch --intent` 的入口。
- smoke 临时 `.ultracode/plans` 已清理，当前 `.ultracode` 下只保留既有 `.ultracode/inputs/`。

## Friendly Next Command 计划

### 目标

让终端确认链路也统一使用 friendly shortcut。`ultracode "<task intent>"` 遇到 write-capable named workflow 时，确认预览里的下一条命令不应再回退到 `ultracode run-name <workflow> --intent ...`，而应提示 `ultracode <workflow-name> "<task intent>"`，避免用户重新学习旧命令。

### 实施清单

- [x] 先写失败测试，覆盖 named workflow confirmation 的 next command 使用 shortcut
- [x] 修改 next command 生成逻辑，保留参数、run id、output/worktree/registry 透传
- [x] 更新 README / README.zh-CN / Skill 中关于显式 `run-name` 的措辞
- [x] 运行验证、刷新 Codex 安装缓存，并补充 Review

### Review

- CLI write-capable named workflow confirmation 的 `nextCommand` 已从 `ultracode run-name <workflow> --intent ...` 改为 `ultracode <workflow-name> "<task intent>"` shortcut。
- `buildRunNameCommand()` 仍保留 `--params`、`--outputDir`、`--run-id`、`--worktree-dir`、`--registry-dir` 透传，确认后执行不会丢失高级参数。
- 新增真实 CLI 子进程测试：临时注册 write-capable `repo-change` workflow，运行 `run-ultracode.mjs "Modify repository configuration" --registry-dir ... --json`，断言返回 `needs_confirmation` 且 `nextCommand` 使用 friendly shortcut。
- README、README.zh-CN 和 Ultracode Skill 已说明 write-capable named workflow 的下一步命令也使用 `ultracode <workflow-name> "<task intent>"` shortcut。
- 验证通过：先观察到新增测试返回旧 `ultracode run-name ... --intent ...` 而失败；实现后 `tests/cli.test.mjs` 18 项通过。
- 完整验证通过：`npm test` 81 项通过、`npm run typecheck` 通过、插件 manifest 校验通过。
- 真实 CLI smoke 验证临时 write-capable registry 返回 `dispatch.action: needs_confirmation`、`tool: ultracode_run_named`，且 `nextCommand` 为 `ultracode repo-change 'Modify repository configuration' --run-id repo-change --registry-dir ...`。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608154256 -> 0.1.0+codex.20260608155059`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608155059`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608155059/scripts/run-ultracode.mjs` 做同一 write-capable named confirmation smoke，确认缓存版本也输出 friendly next command。

## Run ID Inspection 计划

### 目标

进一步减少用户对 `outputDir` 的感知：CLI 的 `status`、`tail`、`report`、`watch` 应接受 run id 或 output directory。用户看到 `runId` 后可以直接执行 `ultracode report <runId>`，不必先 `list-runs` 再复制长路径。

### 实施清单

- [x] 先写失败测试，覆盖 `report <runId>` 自动解析 run outputDir
- [x] 实现 run target 解析：优先把现有路径当 outputDir，否则按 run id 查找最近 runs
- [x] 接入 CLI `status`、`tail`、`report`、`watch`
- [x] 更新 README / README.zh-CN / Skill 的检查命令说明
- [x] 运行验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 新增 `resolveRunOutputDir()`：CLI inspection target 优先按现有 outputDir/status 目录解析；若不是目录，则按 run id 扫描当前 checkout 和 sibling worktrees 的 runs。
- CLI `status`、`tail`、`report`、`watch` 现在都接受 `<runId-or-outputDir>`。
- 新增真实 CLI 子进程测试：在临时 repo 创建 `.ultracode/runs/run-one`，直接执行 `report run-one --json` 和 `tail run-one --json`，确认能解析到 run outputDir 并返回 final artifact / trace event。
- README、README.zh-CN 和 Ultracode Skill 已把 inspection 命令改为 `<runId-or-outputDir>`，并说明知道 run id 时可直接 `report/status/tail <runId>`。
- 验证通过：先观察到新增测试把 `run-one` 当成相对路径并读取 `run-one/workflow-result.json` 失败；实现后 `tests/cli.test.mjs` 19 项通过。
- 完整验证通过：`npm test` 82 项通过、`npm run typecheck` 通过、插件 manifest 校验通过。
- 真实 CLI smoke 验证临时 repo 中 `report run-one --json` 返回 `finalArtifact.text: final body`，`tail run-one --json` 返回 `workflow.completed` event。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608155059 -> 0.1.0+codex.20260608155928`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608155928`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608155928/scripts/run-ultracode.mjs` 做同一 run id inspection smoke，确认缓存版本也支持 `report <runId>` 和 `tail <runId>`。

## MCP Run ID Inspection 计划

### 目标

把 CLI 的 run id inspection 体验同步到 MCP：`ultracode_status`、`ultracode_tail`、`ultracode_report` 除了继续接受 `outputDir`，也应接受 `cwd + runId`。Codex 内部知道 run id 时不需要先调用 `list_runs` 或要求用户提供 outputDir。

### 实施清单

- [x] 先写失败测试，覆盖 MCP `ultracode_status` / `tail` / `report` 通过 `cwd + runId` 解析 outputDir
- [x] 更新 MCP inspect tool schemas，说明支持 `outputDir` 或 `cwd + runId`
- [x] 实现 MCP inspect target 解析并保留现有 `outputDir` 兼容路径
- [x] 更新 README / README.zh-CN / Skill 的 MCP inspection 说明
- [x] 运行验证、刷新 Codex 安装缓存，并补充 Review

### Review

- MCP `ultracode_status`、`ultracode_tail`、`ultracode_report` 现在继续支持 `outputDir`，同时支持 `cwd + runId`。
- 新增 `resolveInspectOutputDir()`：优先解析显式 `outputDir`；否则要求 `cwd` 和 `runId`，再通过 `resolveRunOutputDir()` 扫描当前 checkout 和 sibling worktrees 的 runs。
- MCP tool schemas 已增加 `cwd`、`runId` 输入说明，并将描述从 artifact-directory-only 改为 artifact directory or run id。
- 新增 MCP 回归测试：`ultracode_status` / `ultracode_tail` / `ultracode_report` 通过 `cwd + runId` 解析到同一个 outputDir，并分别返回 status、trace event 和 report。
- README、README.zh-CN 和 Ultracode Skill 已同步：当 Codex 只有 run id 时，MCP inspection 工具可直接传 `cwd + runId`。
- 验证通过：先观察到新增 MCP 测试无法解析 outputDir；实现后 `tests/mcp.test.mjs` 19 项通过。
- 完整验证通过：`npm test` 83 项通过、`npm run typecheck` 通过、插件 manifest 校验通过。
- 真实 MCP smoke 验证临时 repo 中通过 `cwd + runId` 调用 status/report/tail，返回 `completed`、`final body` 和 `workflow.completed` event。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608155928 -> 0.1.0+codex.20260608160739`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608160739`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608160739/scripts/dist/mcp.js` 做同一 MCP smoke，确认缓存版本也支持 `cwd + runId` inspection。

## MCP Inspection Arguments RunId 化计划

### 目标

让 MCP run 工具返回的 follow-up arguments 也不再依赖长 `outputDir`：`inspection.status.arguments`、`inspection.tail.arguments`、`inspection.report.arguments` 默认使用 `cwd + runId`。`inspection.outputDir` 继续保留为审计和调试信息，但 Codex 后续检查可直接复用 run id。

### 实施清单

- [x] 先写失败测试，覆盖 run / named run / dynamic run 的 inspection arguments 使用 `cwd + runId`
- [x] 修改 MCP inspection 构造逻辑，并保持 `inspection.outputDir` 兼容展示
- [x] 更新 README / README.zh-CN / Skill 中关于 MCP run 返回 inspection 的说明
- [x] 运行验证、刷新 Codex 安装缓存，并补充 Review

### Review

- MCP run 工具返回的 `inspection.status.arguments`、`inspection.tail.arguments`、`inspection.report.arguments` 已改为默认使用 `cwd + runId`。
- `inspection.outputDir` 继续保留在顶层，用于审计、调试和需要绝对产物目录的高级场景。
- README、README.zh-CN 和 Ultracode Skill 已同步：follow-up arguments 默认是 run id 形式，Codex 不需要重建 `outputDir`。
- 验证通过：先观察到 `tests/mcp.test.mjs` 中 4 个 run inspection 测试失败，失败原因是旧实现仍返回 `outputDir` arguments；实现后 `tests/mcp.test.mjs` 19 项通过。
- 完整验证通过：`npm test` 83 项通过、`npm run typecheck` 通过、plugin-creator 的 `validate_plugin.py` 校验通过。
- 当前 Codex CLI 没有 `codex plugin validate` 子命令；已改用 plugin-creator skill 自带校验脚本作为 manifest 校验入口。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608160739 -> 0.1.0+codex.20260608161506`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608161506`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608161506/scripts/dist/mcp.js` 做 MCP smoke，确认 `statusArgs`、`tailArgs`、`reportArgs` 均使用 `cwd + runId`，且 `outputDir` 仍在 inspection 顶层。

## MCP Stage Action RunId 化计划

### 目标

继续消除 MCP 交互里对长 `outputDir` 的依赖：`ultracode_restart_stage` 和 `ultracode_rework_stage` 除了兼容显式 `outputDir`，也要支持 `cwd + runId`。Codex 在拿到 run id 后，应能直接重跑或返工某个 stage。

### 实施清单

- [x] 先写失败测试，覆盖 MCP restart/rework 通过 `cwd + runId` 解析 outputDir
- [x] 更新 MCP restart/rework tool schemas，说明支持 `outputDir` 或 `cwd + runId`
- [x] 实现 stage action target 解析，并保留现有 `outputDir` 兼容路径
- [x] 更新 README / README.zh-CN / Skill 的 MCP stage action 说明
- [x] 运行验证、刷新 Codex 安装缓存，并补充 Review

### Review

- MCP `ultracode_restart_stage` 和 `ultracode_rework_stage` 现在继续支持显式 `outputDir`，同时支持 `cwd + runId`。
- 两个 tool schema 已增加 `cwd`、`runId` 输入说明，并把 `outputDir` 从必填项改为二选一兼容路径。
- Handler 已复用 run outputDir resolver：优先解析显式 `outputDir`；否则通过 `cwd + runId` 扫描当前 checkout 和 sibling worktrees。
- 新增 MCP 回归测试：`ultracode_restart_stage` / `ultracode_rework_stage` 通过 `cwd + runId` 解析到同一个 outputDir，并把解析后的目录传给 stage action primitive。
- README、README.zh-CN 和 Ultracode Skill 已同步：MCP stage action 接受产物目录或 `cwd + runId`；当已知 run id 时优先用 `cwd + runId`。
- 验证通过：先观察到新增 MCP 测试无法通过 run id 取得 outputDir；实现后 `tests/mcp.test.mjs` 20 项通过。
- 完整验证通过：`npm test` 84 项通过、`npm run typecheck` 通过、plugin-creator 的 `validate_plugin.py` 校验通过。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608161506 -> 0.1.0+codex.20260608162040`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608162040`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608162040/scripts/dist/mcp.js` 做 MCP smoke，确认 restart/rework 都能通过 `cwd + runId` 解析到 `/repo/project/.ultracode/runs/run-one`。

## CLI Stage Action RunId 化计划

### 目标

把 CLI 的 stage action 体验补齐到和 MCP 一致：`restart-stage` 与 `rework-stage` 应接受 `<runId-or-outputDir>`。用户在终端只知道 run id 时，可以直接执行 `ultracode restart-stage <runId> <stageName>` 或 `ultracode rework-stage <runId> <stageName> ...`。

### 实施清单

- [x] 先写失败测试，覆盖 CLI restart/rework 通过 run id 解析 outputDir
- [x] 实现 CLI stage action target 解析，复用 `resolveRunOutputDir()`
- [x] 更新 README / README.zh-CN / Skill 的 CLI stage action 命令说明
- [x] 运行验证、刷新 Codex 安装缓存，并补充 Review

### Review

- CLI `restart-stage` 和 `rework-stage` 现在继续兼容显式 output directory，同时支持 `<runId-or-outputDir>`。
- CLI main 分支已复用 `resolveRunOutputDir()`：当第一个参数不是现有目录时，会按 run id 扫描当前 checkout 和 sibling worktrees。
- Usage 文案已从 `<outputDir>` 更新为 `<runId-or-outputDir>`，避免终端错误引导。
- 新增真实 CLI 子进程回归测试：临时构造 `run-one` 产物和 fake `codex` binary，执行 `restart-stage run-one draft --json` 与 `rework-stage run-one draft --feedback ... --json`，确认解析到同一个 outputDir，并创建 attempt 2/3。
- README、README.zh-CN 和 Ultracode Skill 已同步：CLI stage action 可以直接使用 run id；CLI fallback 也应优先使用 run id。
- 验证通过：先观察到新增测试把 `run-one` 当作 `project/run-one` 并读取 `workflow-result.json` 失败；实现后 `tests/cli.test.mjs` 20 项通过。
- 完整验证通过：`npm test` 85 项通过、`npm run typecheck` 通过、plugin-creator 的 `validate_plugin.py` 校验通过。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608162040 -> 0.1.0+codex.20260608162802`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608162802`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608162802/scripts/tests/cli.test.mjs` 做缓存 CLI 回归，确认 `CLI stage action commands accept run ids` 通过。

## CLI Run Follow-up 提示计划

### 目标

CLI run 完成后不要只暴露包含长 `outputDir` 的 `workflow.completed` event，还应追加一个基于 run id 的 follow-up event，直接给出 `report`、`status`、`tail`、`restart-stage`、`rework-stage` 下一步命令。这样终端用户不需要从 completed payload 里复制产物目录。

### 实施清单

- [x] 先写失败测试，覆盖 run id follow-up event 的命令内容
- [x] 实现统一 follow-up event，并接入 run-json、run-named、run-dynamic 的 CLI 完成路径
- [x] 更新 README / README.zh-CN / Skill 的 run 完成提示说明
- [x] 运行验证、刷新 Codex 安装缓存，并补充 Review

### Review

- CLI run 完成后现在会在 `workflow.completed` 之后追加 `workflow.next_actions` event。
- `workflow.next_actions` 使用 run id 构造后续命令：`report`、`status`、`tail --limit 20`、`restart-stage`、`rework-stage`，避免用户从 completed payload 复制长 `outputDir`。
- follow-up event 已接入 `run-json`、`run-named`、`dispatch` 命中的 named run、以及 `run-dynamic` 的 named/dynamic 两条执行路径。
- README 和 README.zh-CN 的旅游攻略 demo 已从 `RUN_DIR` 改为 `RUN_ID`，并说明优先使用 `workflow.next_actions`。
- Ultracode Skill 已补充：CLI run 后优先使用 `workflow.next_actions` event 里的终端 follow-up 命令。
- 验证通过：先观察到新增测试 `buildRunFollowUpEvent returns run-id next actions` 失败，因为函数尚不存在；实现后 `tests/cli.test.mjs` 21 项通过。
- 完整验证通过：`npm test` 86 项通过、`npm run typecheck` 通过、plugin-creator 的 `validate_plugin.py` 校验通过。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608162802 -> 0.1.0+codex.20260608163547`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608163547`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608163547/scripts/tests/cli.test.mjs` 做缓存 CLI 回归，确认 follow-up event 测试通过。

## MCP Inspection Stage Actions 计划

### 目标

MCP run 返回的 `inspection` 不应只覆盖 status/report/artifact，也应把现在已经支持 `cwd + runId` 的 restart/rework 暴露为明确的 follow-up 模板。Codex 在需要重跑或带反馈返工某个 stage 时，不需要重新推断该调用哪个工具、传哪些基础参数。

### 实施清单

- [x] 先写失败测试，覆盖 `inspection.restartStage` / `inspection.reworkStage` 参数模板
- [x] 实现 MCP inspection stage action links，并扩展 `nextActions`
- [x] 更新 README / README.zh-CN / Skill 的 MCP inspection 说明
- [x] 运行验证、刷新 Codex 安装缓存，并补充 Review

### Review

- MCP run 返回的 `inspection` 现在新增 `restartStage` 和 `reworkStage`，分别指向 `ultracode_restart_stage` / `ultracode_rework_stage`。
- 两个 stage action 模板默认使用 `cwd + runId`，只需要把 `stageName` 和 `feedback` 占位值替换成实际内容。
- `inspection.nextActions` 已从 status/report 扩展为 status、tail、report、artifact、restartStage、reworkStage；动态 plan-file run 仍额外提示 `approvedPlanFile` 审计记录。
- README、README.zh-CN 和 Ultracode Skill 已同步：MCP inspection 现在包含查询工具 arguments 和 stage action 模板；Codex 不需要重建 `outputDir` 或基础 run 参数。
- 验证通过：先观察到 `tests/mcp.test.mjs` 中 3 个 run inspection 测试失败，原因是旧 inspection 缺少 `restartStage` / `reworkStage` 和完整 nextActions；实现后 `tests/mcp.test.mjs` 20 项通过。
- 完整验证通过：`npm test` 86 项通过、`npm run typecheck` 通过、plugin-creator 的 `validate_plugin.py` 校验通过。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608163547 -> 0.1.0+codex.20260608164205`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608164205`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608164205/scripts/dist/mcp.js` 做 MCP smoke，确认 `inspection.restartStage`、`inspection.reworkStage` 和完整 `nextActions` 均存在。

## MCP Per-stage Follow-up 计划

### 目标

在 MCP run 返回的 `inspection` 中增加按 stage 展开的 follow-up 信息：每个 stage 都应带自己的 restart/rework ready-to-call arguments。这样 Codex 需要重跑或返工时，不必从 workflow result 里另行推断 stage 名。

### 实施清单

- [x] 先写失败测试，覆盖 `inspection.stages[].restartStage` / `inspection.stages[].reworkStage`
- [x] 实现 `inspection.stages`，保留顶层通用 stage action 模板
- [x] 更新 README / README.zh-CN / Skill 的 per-stage follow-up 说明
- [x] 运行验证、刷新 Codex 安装缓存，并补充 Review

### Review

- MCP run 返回的 `inspection` 现在会在有 stage result 时包含 `stages` 数组。
- `inspection.stages[]` 每项包含 `stageName`、`status`、`attempt`，以及该 stage 的 `restartStage` / `reworkStage` ready-to-call arguments。
- 顶层通用 `inspection.restartStage` / `inspection.reworkStage` 模板继续保留；当 stage 已列出时，Codex 可优先使用 per-stage 参数，避免推断 stage 名。
- `inspection.nextActions` 会在存在 stage 列表时增加 “Use inspection.stages...” 提示。
- README、README.zh-CN 和 Ultracode Skill 已同步：MCP inspection 有通用 stage action 模板，也有具体 per-stage 模板。
- 验证通过：先观察到 `tests/mcp.test.mjs` 中 `handleMcpRequest runs a workflow in a prepared worktree` 失败，原因是旧 inspection 缺少 `stages` 与 per-stage restart/rework；实现后 `tests/mcp.test.mjs` 20 项通过。
- 完整验证通过：`npm test` 86 项通过、`npm run typecheck` 通过、plugin-creator 的 `validate_plugin.py` 校验通过。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608164205 -> 0.1.0+codex.20260608164844`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608164844`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608164844/scripts/dist/mcp.js` 做 MCP smoke，确认 draft/review 两个 stage 都带具体 restart/rework 参数。

## CLI Stage Action JSON 输出计划

### 目标

`restart-stage --json` 和 `rework-stage --json` 的 stdout 应是可直接 `JSON.parse()` 的单个 JSON payload。stage started/completed 等事件仍应写入 run 的 `trace.jsonl`，但不能污染 `--json` stdout，避免 Codex 或脚本消费时还要手动跳过 JSONL 事件。

### 实施清单

- [x] 先写失败测试，覆盖 CLI restart/rework `--json` stdout 可直接 `JSON.parse()`
- [x] 实现 stage action `--json` 静默事件输出，并继续 append 到 `trace.jsonl`
- [x] 补充验证，确认 trace 仍包含 stage 事件
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs` 失败在 `CLI stage action commands accept run ids`，`JSON.parse(restartStdout)` 报 `Unexpected non-whitespace character after JSON`，确认 `--json` stdout 混入了 stage event JSONL。
- 绿色实现：CLI `restart-stage` / `rework-stage` 在解析到真实 `outputDir` 后配置 `trace.jsonl` append；`--json` 时静默 stdout events，普通终端模式仍保持事件输出。
- 定向验证：`npm run build && node --test tests/cli.test.mjs` 通过 21/21；测试确认 restart/rework stdout 可直接 `JSON.parse()`，且 `trace.jsonl` 仍包含 draft attempt 2/3 的 `stage.started` 与 `stage.completed`。
- 完整验证：`npm test` 通过 86/86；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608164844 -> 0.1.0+codex.20260608165503`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608165503`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608165503/scripts/tests/cli.test.mjs` 做 CLI 回归，确认 21/21 通过。

## MCP Stage Artifact Follow-up 计划

### 目标

继续降低 Codex 使用 Ultracode 时对内部路径的推断：MCP run 返回的 `inspection.stages[]` 除了 restart/rework 参数，也应包含该 stage latest attempt 的 artifact 元数据。Codex 需要展示某个 stage 输出、定位失败 stage 或决定 rework 时，不必再从 `workflow-result.json` 手动推断 `outputFile`、`attemptDir`、`resultFile` 等路径。

### 实施清单

- [x] 先写失败测试，覆盖 `inspection.stages[].artifact` 元数据
- [x] 实现 per-stage artifact 元数据，兼容旧的最小 stage result
- [x] 更新 README / README.zh-CN / Skill 的 MCP inspection 说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/mcp.test.mjs` 失败在 `handleMcpRequest runs a workflow in a prepared worktree`，原因是 `inspection.stages[]` 缺少 expected `artifact` 元数据。
- 绿色实现：`createWorkflowInspectionLinks()` 现在会把 stage result 中已有的 `outputFile`、`resultFile`、`attemptDir`、`stageDir`、`sessionId` 映射为可选 `inspection.stages[].artifact`；旧的最小 stage result 不带这些字段时不会输出空 artifact。
- 定向验证：`npm run build && node --test tests/mcp.test.mjs` 通过 20/20。
- 完整验证：`npm test` 通过 86/86；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- README、README.zh-CN 和 Ultracode Skill 已同步：Codex 展示或返工某个 stage 时优先使用 `inspection.stages[].artifact`，避免手动重建产物路径。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608165503 -> 0.1.0+codex.20260608170139`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608170139`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608170139/scripts/tests/mcp.test.mjs` 做 MCP 回归，确认 20/20 通过。

## MCP Stage Action Inspection 计划

### 目标

补齐 MCP stage action 的后续链路：`ultracode_restart_stage` 和 `ultracode_rework_stage` 通过 `cwd + runId` 调用后，返回值应像 run 工具一样包含 `inspection`。Codex 在重跑或返工后，可以直接用返回的 status、tail、report、artifact 和 per-stage follow-up 参数继续检查结果，不必重新推断 run 信息。

### 实施清单

- [x] 先写失败测试，覆盖 restart/rework 后返回 `inspection`
- [x] 实现 stage action inspection，优先支持 `cwd + runId` 路径并保留 outputDir-only 兼容
- [x] 更新 README / README.zh-CN / Skill 的 MCP stage action 说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/mcp.test.mjs` 失败在 `handleMcpRequest restarts and reworks workflow stages by run id`，原因是 stage action 返回值缺少 `structuredContent.inspection`。
- 绿色实现：新增 `createStageActionPayload()`；当 MCP restart/rework 输入包含 `cwd + runId` 时，返回 action result 的同时附加 `inspection`，其中包含 status、tail、report、artifact、通用 restart/rework 模板，以及当前 stage / cascaded stages 的 per-stage follow-up。outputDir-only 调用仍保持原返回形状。
- 定向验证：`npm run build && node --test tests/mcp.test.mjs` 通过 20/20。
- 完整验证：`npm test` 通过 86/86；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- README、README.zh-CN 和 Ultracode Skill 已同步：MCP restart/rework 通过 `cwd + runId` 调用后也应优先使用返回的 `inspection` 继续查看 status、report、artifact 或后续 rework。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608170139 -> 0.1.0+codex.20260608170740`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608170740`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608170740/scripts/tests/mcp.test.mjs` 做 MCP 回归，确认 20/20 通过。

## CLI Stage Action Follow-up 计划

### 目标

补齐 CLI stage action 的终端后续引导：非 JSON 模式下，`restart-stage` 和 `rework-stage` 完成后应像普通 run 一样输出 `workflow.next_actions` event。用户重跑或返工 stage 后，可以直接复制 run-id 形式的 `report`、`status`、`tail`、`restart-stage`、`rework-stage` 命令，不需要从 stage action 输出里再推断下一步。

### 实施清单

- [x] 先写失败测试，覆盖非 JSON `restart-stage` 输出 `workflow.next_actions`
- [x] 实现非 JSON stage action follow-up event，保持 `--json` stdout 干净
- [x] 更新 README / README.zh-CN / Skill 的 CLI stage action 说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs` 失败在 `CLI stage action commands print run-id follow-up events`，原因是非 JSON `restart-stage run-two draft` 输出里没有 `workflow.next_actions`。
- 绿色实现：CLI `restart-stage` / `rework-stage` 在非 JSON 模式下打印 `formatWorkflowStageAction()` 后追加 `emitRunFollowUp(input.outputDir)`；`--json` 模式仍只输出最终 action JSON，并继续把 stage events 写入 trace。
- 定向验证：`npm run build && node --test tests/cli.test.mjs` 通过 22/22。
- 完整验证：`npm test` 通过 87/87；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- README、README.zh-CN 和 Ultracode Skill 已同步：CLI run 和非 JSON CLI restart/rework 后都应优先使用 `workflow.next_actions` 中的 run-id follow-up 命令。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608170740 -> 0.1.0+codex.20260608171549`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608171549`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608171549/scripts/tests/cli.test.mjs` 做 CLI 回归，确认 22/22 通过。

## CLI Stage Action JSON Follow-up 计划

### 目标

补齐 CLI stage action 的自动化后续引导：`restart-stage --json` 和 `rework-stage --json` 仍然必须保持 stdout 为可直接 `JSON.parse()` 的单个 JSON payload，但 payload 里应包含结构化 `followUp`。脚本或 Codex fallback 解析 action result 后，可以直接读取 run-id 形式的 `report`、`status`、`tail`、`restart-stage`、`rework-stage` 命令，不需要手动构造下一步。

### 实施清单

- [x] 先写失败测试，覆盖 `restart-stage --json` / `rework-stage --json` 返回 `followUp`
- [x] 实现 stage action JSON payload 的 `followUp` 字段，并保持 stdout 干净
- [x] 更新 README / README.zh-CN / Skill 的 CLI stage action JSON 说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs` 失败在 `CLI stage action commands accept run ids`，原因是 `restart.followUp` 不存在，无法读取 `followUp.commands`。
- 绿色实现：新增 `createWorkflowStageActionPayload()`，`restart-stage --json` / `rework-stage --json` 输出 `{ ...actionResult, followUp }`；stdout 仍是单个可解析 JSON，stage events 继续写入 `trace.jsonl`。
- 定向验证：`npm run build && node --test tests/cli.test.mjs` 通过 22/22。
- 完整验证：`npm test` 通过 87/87；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- README、README.zh-CN 和 Ultracode Skill 已同步：脚本化 CLI restart/rework 应使用 `--json` 并读取 `followUp.commands`。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608171549 -> 0.1.0+codex.20260608172031`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608172031`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608172031/scripts/tests/cli.test.mjs` 做 CLI 回归，确认 22/22 通过。

## Prune Worktree 清理计划

### 目标

补齐 run 清理体验：Ultracode 默认会为主 checkout 启动的 run 创建 sibling worktree。现有 `prune-runs` 只删除 `.ultracode/runs/<run-id>` 产物目录，不清理对应 worktree，长期使用会留下 `<repo>.worktrees/<run-id>`。新增显式 `removeWorktrees` / `--worktrees true` 开关，默认继续只删 artifact，只有用户明确要求时才同时清理 sibling worktree。

### 实施清单

- [x] 先写失败测试，覆盖默认不删 worktree、显式才删 worktree
- [x] 实现 run registry 的 worktree root 追踪和可选清理
- [x] 接入 CLI `prune-runs --worktrees true` 与 MCP `removeWorktrees`
- [x] 更新 README / README.zh-CN / Skill 的清理说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/run-registry.test.mjs` 失败，原因是 `pruneRuns()` 结果没有 `removedWorktrees` 且不支持 `removeWorktrees`；随后 CLI/MCP 定向测试也先失败在未解析/未传递显式清理开关。
- 绿色实现：`listRuns()` 现在为 worktree run 记录 `worktreeRoot`；`pruneRuns({ removeWorktrees: true })` 会在删除 run artifact 后显式删除匹配的 sibling `<repo>.worktrees/<run-id>` 目录，并返回 `removedWorktrees`。默认仍只删 artifact。
- CLI 接入：`prune-runs <runIds> --worktrees true` 解析为 `removeWorktrees: true`；默认 false。
- MCP 接入：`ultracode_prune_runs` 新增 `removeWorktrees` boolean schema，并传给 `pruneRuns()`。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明默认只删 run artifact，只有明确传 CLI `--worktrees true` 或 MCP `removeWorktrees: true` 时才清理 sibling run worktree。
- 定向验证：`tests/run-registry.test.mjs` 4/4 通过；`tests/cli.test.mjs` 22/22 通过；`tests/mcp.test.mjs` 20/20 通过。
- 完整验证：`npm test` 通过 88/88；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608172031 -> 0.1.0+codex.20260608172849`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608172849`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608172849/scripts/tests/` 做 run-registry、CLI、MCP 三组回归，分别确认 4/4、22/22、20/20 通过。

## Git Worktree Remove 清理计划

### 目标

完善 `prune-runs --worktrees true` 的真实 Git 行为：当 sibling run worktree 是 linked git worktree 时，不应只用目录删除，否则会留下 Git worktree 元数据。显式清理 worktree 时应优先走 `git worktree remove --force <worktreeRoot>`；只有普通目录或测试模拟目录才使用文件系统删除。

### 实施清单

- [x] 先写失败测试，覆盖显式清理时调用 git worktree remover
- [x] 实现 linked worktree 优先 `git worktree remove --force`，普通目录 fallback 到 fs 删除
- [x] 更新 README / README.zh-CN / Skill 的清理说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/run-registry.test.mjs` 失败在 `pruneRuns removes linked git worktrees through a worktree remover`，原因是显式清理时没有调用 worktree remover，linked git worktree 只会被普通目录删除逻辑处理。
- 绿色实现：`pruneRuns()` 现在会识别 sibling run worktree 根目录下的 `.git`，linked git worktree 通过默认 remover 执行 `git worktree remove --force <worktreeRoot>`；普通目录仍用文件系统删除。测试可注入 `removeWorktree`，便于断言真实调用参数。
- 定向验证：`npm run build && node --test tests/run-registry.test.mjs` 通过 5/5。
- 完整验证：`npm test` 通过 89/89；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明默认只删 run artifact，只有明确传 CLI `--worktrees true` 或 MCP `removeWorktrees: true` 时才清理 sibling run worktree；linked Git worktree 使用 `git worktree remove --force`。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608173552 -> 0.1.0+codex.20260608173815`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608173815`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608173815/scripts/tests/` 做 CLI、MCP、run-registry 三组回归，确认 47/47 通过。缓存目录不包含开发依赖 `tsc`，因此验证使用已发布 `dist` 直接运行测试。

## CLI Help 友好入口计划

### 目标

补齐终端用户第一步体验：`ultracode help` 和 `ultracode --help` 应直接展示 task-first 的友好用法，而不是被当成自然语言 intent、未知 workflow 或错误路径处理。帮助文案要反映当前真实行为：默认只需要自然语言任务或 workflow name；`runId`、`outputDir`、`worktreeDir` 都是高级可选项；`plan-dynamic --output-plan` 不是必填。

### 实施清单

- [x] 先写失败测试，覆盖 `help` / `--help` 友好输出
- [x] 实现 `help` CLI 分支和统一帮助文案
- [x] 更新 README / README.zh-CN / Skill 的帮助入口说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs` 失败 2 项；`help` 被当成自然语言 intent 并生成 dynamic preview / plan artifact，`--help` 走 `workflow.failed` 错误路径。
- 绿色实现：新增 `CliInput.command = "help"`、`formatCliHelp()` 和 `main()` help 分支；`help`、`--help`、`-h` 以及空参数都会打印同一份 task-first 帮助文案，不再进入 dispatch 或错误路径。
- 帮助文案已修正为当前真实行为：`plan-dynamic --output-plan` 是可选项；`runId`、`outputDir`、`worktreeDir` 标记为高级可选控制。
- 定向验证：`npm run build && node --test tests/cli.test.mjs` 通过 24/24。
- 完整验证：`npm test` 通过 91/91；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已加入 `help` / `--help` 入口说明。
- 清理验证：红灯测试临时生成的 `scripts/.ultracode/plans/help-*.plan.json` 已删除；最终 `.ultracode` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608173815 -> 0.1.0+codex.20260608174304`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608174304`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608174304/scripts/` 做 CLI 回归，确认 24/24 通过；并直接运行 `node run-ultracode.mjs help`，确认输出友好帮助摘要。

## CLI Plan Dynamic 默认计划文件计划

### 目标

修复 CLI `plan-dynamic` 的链路断点：帮助、README 和 Skill 都把 `--output-plan` 视为可选，并期望动态 preview 默认生成可复用 `planFile`，但当前 CLI 只有显式传 `--output-plan` 才写 plan artifact。用户执行 `ultracode plan-dynamic --intent "<task>"` 后，应直接拿到 `planFile`，再用 `run-dynamic --plan-file <file> --approved true` 继续执行。

### 实施清单

- [x] 先写失败测试，覆盖 CLI `plan-dynamic --intent ... --json` 默认写出 `planFile`
- [x] 实现 `review_dynamic` 默认写 `.ultracode/plans/<slug>-<timestamp>.plan.json`
- [x] 同步 README / README.zh-CN / Skill 的 plan-dynamic 默认行为说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs` 失败在 `CLI plan-dynamic writes a reusable plan file by default for dynamic previews`，原因是 `payload.planFile` 为 `undefined`。
- 绿色实现：CLI `plan-dynamic` 在 `plan.recommendedAction === "review_dynamic"` 时默认写 `.ultracode/plans/<slug>-<timestamp>.plan.json`；显式 `--output-plan` 仍可覆盖路径；`run_named` 推荐路径不创建无用 plan artifact。
- 定向验证：`npm run build && node --test tests/cli.test.mjs` 通过 25/25。
- 完整验证：`npm test` 通过 92/92；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 CLI `plan-dynamic --intent` 会默认写出可复用 plan artifact，`--output-plan` 只用于指定确定路径。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608174304 -> 0.1.0+codex.20260608174659`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608174659`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608174659/scripts/` 做 CLI 回归，确认 25/25 通过。
- 缓存 smoke：直接运行缓存里的 `run-ultracode.mjs plan-dynamic --intent "Review implementation risks and produce a concise report" --json`，确认返回 `recommendedAction: review_dynamic` 且 `planFile` 真实存在；随后已删除 smoke 产生的临时 `.ultracode/plans/*.plan.json`。

## CLI Prune Worktree 输出计划

### 目标

补齐 `prune-runs --worktrees true` 的终端反馈：底层已经返回 `removedWorktrees`，但非 JSON 输出只展示 run artifact 删除结果，不展示匹配 sibling worktree 的删除结果。用户显式要求清理 worktree 后，应在终端输出中直接看到每个 removed worktree 路径。

### 实施清单

- [x] 先写失败测试，覆盖 `formatPruneRuns()` 输出 removed worktree
- [x] 实现非 JSON prune 输出中的 worktree 删除行
- [x] 同步 README / README.zh-CN / Skill 的 prune 输出说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs` 失败在 `formatPruneRuns renders removed worktrees for terminal users`，原因是非 JSON 输出只有 `Removed <runId>: <outputDir>`，缺少 `removedWorktrees`。
- 绿色实现：`formatPruneRuns()` 现在会为每个 `removedWorktrees[]` 输出 `Removed worktree <runId>: <worktreeRoot>`，终端用户能直接看到显式 worktree 清理结果。
- 定向验证：`npm run build && node --test tests/cli.test.mjs` 通过 26/26。
- 完整验证：`npm test` 通过 93/93；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明非 JSON CLI prune 输出会列出 removed worktree roots。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608174659 -> 0.1.0+codex.20260608175048`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608175048`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608175048/scripts/` 做 CLI 回归，确认 26/26 通过。

## CLI Plan Dynamic Next Command 计划

### 目标

继续补齐 `plan-dynamic` 的终端确认链路：默认写出 `planFile` 后，JSON 和非 JSON 输出都应直接给出下一步可复制的 `ultracode run-dynamic --plan-file <file> --approved true` 命令。用户不需要从 plan file 路径手动拼接执行命令。

### 实施清单

- [x] 先写失败测试，覆盖 JSON `nextCommand` 和非 JSON `Next command after approval`
- [x] 实现 `plan-dynamic` 输出中的 next command
- [x] 同步 README / README.zh-CN / Skill 的 next command 说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs` 失败 2 项；JSON `plan-dynamic` 输出缺少 `nextCommand`，非 JSON 输出缺少 `Next command after approval:`。
- 绿色实现：CLI `plan-dynamic` 在写出 dynamic `planFile` 后复用 `buildRunDynamicPlanCommand()`，JSON payload 增加 `nextCommand`，非 JSON 输出增加 `Next command after approval:` 和完整 `ultracode run-dynamic --plan-file <file> --approved true` 命令。
- 定向验证：`npm run build && node --test tests/cli.test.mjs` 通过 27/27。
- 完整验证：`npm test` 通过 94/94；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 CLI `plan-dynamic --intent` 会打印/返回精确的下一步 `run-dynamic` 命令。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608175048 -> 0.1.0+codex.20260608175421`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608175421`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608175421/scripts/` 做 CLI 回归，确认 27/27 通过。

## CLI Plan Dynamic Named Next Command 计划

### 目标

补齐 `plan-dynamic` 的 named workflow 推荐链路：当 `plan-dynamic` 推荐已有 registered workflow 时，JSON 和非 JSON 输出都应给出可复制的 `ultracode <workflow-name> "<task intent>"` 下一步命令，并保留 `--registry-dir` 等必要上下文。用户不应只看到 workflow 名称后还要手动拼命令。

### 实施清单

- [x] 先写失败测试，覆盖 JSON / 非 JSON named recommendation 的 `nextCommand`
- [x] 实现 `run_named` 分支的 next command 输出
- [x] 同步 README / README.zh-CN / Skill 的 named next command 说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs` 失败 2 项；`plan-dynamic` 的 `run_named` JSON 输出缺少 `nextCommand`，非 JSON 输出缺少 `Next command:`。
- 绿色实现：`plan-dynamic` 在 `plan.recommendedAction === "run_named"` 时构造 friendly named shortcut：`ultracode <workflow-name> "<task intent>"`，并保留 `--registry-dir` 上下文；JSON 输出包含 `nextCommand`，非 JSON 输出打印 `Next command:`。
- 定向验证：`npm run build && node --test tests/cli.test.mjs` 通过 29/29。
- 完整验证：`npm test` 通过 96/96；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 `plan-dynamic` 推荐 named workflow 时会打印/返回 `ultracode <workflow-name> "<task intent>"` 下一步命令，且不创建无用 plan file。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608175421 -> 0.1.0+codex.20260608175832`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608175832`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608175832/scripts/` 做 CLI 回归，确认 29/29 通过。

## CLI Plan Dynamic Named Preview 计划

### 目标

让 `plan-dynamic` 推荐 named workflow 时不仅给出下一步命令，也展示该 workflow 的 stage plan、write stages 和 output files。尤其是 write-capable named workflow，用户在复制命令前必须能看到它会进入 write stage，而不是只看到 workflow 名称和 reason。

### 实施清单

- [x] 先写失败测试，覆盖 JSON workflow summary 和非 JSON stage/write/output 展示
- [x] 实现 `run_named` 分支的 workflow summary / preview 输出
- [x] 同步 README / README.zh-CN / Skill 的 named preview 说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs` 失败 2 项；JSON `plan-dynamic` 的 named recommendation 缺少 `workflow` summary，非 JSON 输出缺少 `Stage plan:` / `Write stages:` / `Output files:`。
- 绿色实现：`plan-dynamic` 在 `run_named` 分支会解析 matched named workflow summary；JSON payload 增加 `workflow`，非 JSON 输出展示 workflow description、stage plan、write stages、output files 和下一步 `ultracode <workflow-name> "<task intent>"` 命令。
- 定向验证：`npm run build && node --test tests/cli.test.mjs` 通过 29/29。
- 完整验证：`npm test` 通过 96/96；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 `plan-dynamic` 推荐 named workflow 时会展示 stage plan、write stages 和 output files。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608175832 -> 0.1.0+codex.20260608180331`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608180331`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608180331/scripts/` 做 CLI 回归，确认 29/29 通过。

## MCP Plan Dynamic Named Preview 计划

### 目标

让 MCP `ultracode_plan_dynamic` 在推荐 named workflow 时也返回 workflow summary 和 confirmation-friendly preview。Codex 内部显式规划时应能直接展示 stage plan、write stages、output files 和 execution 参数，体验与 CLI `plan-dynamic` / MCP `dispatch` 保持一致。

### 实施清单

- [x] 先写失败测试，覆盖 MCP `run_named` 结果中的 `workflow` 和 `preview`
- [x] 实现 `ultracode_plan_dynamic` named recommendation 的 workflow summary / preview 输出
- [x] 同步 README / README.zh-CN / Skill 的 MCP plan_dynamic named preview 说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/mcp.test.mjs` 失败 1 项；`ultracode_plan_dynamic` 的 named recommendation 缺少 `workflow`，因此无法读取 workflow name / stage plan，也没有 `preview`。
- 绿色实现：MCP `handlePlanDynamicWorkflowTool()` 在 `run_named` 分支解析 matched named workflow summary，并在结构化结果中返回 `workflow` 和 `preview`；`preview` 复用 dispatch 的 named workflow preview 格式，包含 stage plan、write stages、output files 和确认提示。
- 定向验证：`npm run build && node --test tests/mcp.test.mjs` 通过 20/20。
- 完整验证：`npm test` 通过 96/96；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 MCP `ultracode_plan_dynamic` 的 named workflow 推荐会返回 workflow/preview 细节和可直接调用的 execution 参数。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608180331 -> 0.1.0+codex.20260608180803`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608180803`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608180803/scripts/` 做 MCP 回归，确认 20/20 通过。

## MCP Plan Dynamic Write-capable Named Gate 计划

### 目标

修复 MCP `ultracode_plan_dynamic` 的 write-capable named workflow 门禁：当推荐的 registered workflow 含 write stage 时，显式 planning 结果也必须要求用户确认，返回 preview 和 `executionAfterApproval`，不能返回 `approvalRequired: false` 的直接 execution。read-only named workflow 仍可返回可直接调用的 `execution.arguments`。

### 实施清单

- [x] 先写失败测试，覆盖 `ultracode_plan_dynamic` 推荐 write-capable named workflow 时需要确认
- [x] 实现 `run_named` 分支基于 `writeStages` 的 confirmation gate
- [x] 同步 README / README.zh-CN / Skill 的 plan_dynamic write-capable named 说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/mcp.test.mjs` 失败 1 项；`ultracode_plan_dynamic` 推荐 write-capable named workflow 时返回 `requiresConfirmation: false`，且会给出免确认 direct `execution`。
- 绿色实现：MCP `handlePlanDynamicWorkflowTool()` 现在根据 matched named workflow 的 `writeStages` 判断门禁；read-only workflow 保留 direct `execution`，含 write stage 的 workflow 返回 `requiresConfirmation: true`、`preview` 和 `executionAfterApproval`，不返回 direct `execution`。
- 定向验证：`npm run build && node --test tests/mcp.test.mjs` 通过 21/21。
- 完整验证：`npm test` 通过 97/97；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 `ultracode_plan_dynamic` 命中 write-capable named workflow 时必须等待用户批准后使用 `executionAfterApproval`。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608180803 -> 0.1.0+codex.20260608181208`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608181208`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608181208/scripts/` 做 MCP 回归，确认 21/21 通过。

## CLI Plan Dynamic Write-capable Named Gate 计划

### 目标

修复 CLI `plan-dynamic` 推荐 write-capable named workflow 时的确认语义：JSON 输出应标记 `requiresConfirmation: true`，并把命令放在批准后执行的字段中；非 JSON 输出应写成 `Next command after approval:`。read-only named workflow 仍可保留普通 `nextCommand`。

### 实施清单

- [x] 先写失败测试，覆盖 CLI JSON / 非 JSON write-capable named workflow 的确认门禁
- [x] 实现 `plan-dynamic` named recommendation 基于 `writeStages` 的 confirmation 输出
- [x] 同步 README / README.zh-CN / Skill 的 CLI plan-dynamic write-capable named 说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs` 失败 2 项；write-capable named workflow 的 CLI `plan-dynamic --json` 返回 `requiresConfirmation: false` 和 direct `nextCommand`，非 JSON 输出仍写 `Next command:`。
- 绿色实现：CLI `plan-dynamic` 在 `run_named` 分支根据 matched workflow 的 `writeStages` 判断门禁；read-only workflow 保留 direct `nextCommand`，含 write stage 的 workflow 返回 `requiresConfirmation: true`、`executionAfterApproval.nextCommand`，非 JSON 输出复用 `formatNamedWorkflowConfirmation()` 并显示 `Next command after approval:`。
- 定向验证：`npm run build && node --test tests/cli.test.mjs` 通过 29/29。
- 完整验证：`npm test` 通过 97/97；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 CLI `plan-dynamic` 命中 write-capable named workflow 时只在 `executionAfterApproval` / `Next command after approval:` 中给出执行命令。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608181208 -> 0.1.0+codex.20260608181620`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608181620`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608181620/scripts/` 做 CLI 回归，确认 29/29 通过。

## MCP Named Preview Read-only Prompt 计划

### 目标

修复 MCP named workflow preview 的 read-only 文案矛盾：read-only named workflow 的 `preview.confirmationPrompt` 不应要求用户批准或引用 `executionAfterApproval`，因为结果已经返回可直接使用的 `execution.arguments` 和 `approvalRequired: false`。write-capable named workflow 仍必须保留批准提示。

### 实施清单

- [x] 先写失败测试，覆盖 read-only named workflow preview 不要求批准
- [x] 实现 named workflow preview 文案按 `writeStages` 区分
- [x] 同步 README / README.zh-CN / Skill 的 preview prompt 说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/mcp.test.mjs` 失败 1 项；read-only named workflow preview 的 `confirmationPrompt` 仍写着需要 approve，并引用 `executionAfterApproval.arguments`，与 `execution.approvalRequired: false` 矛盾。
- 绿色实现：`createNamedWorkflowPreview()` 现在按 `writeStages` 区分提示；read-only named workflow 返回“不需要批准，使用 `execution.arguments`”的 prompt，write-capable named workflow 保留批准后使用 `executionAfterApproval.arguments` 的 prompt。
- 定向验证：`npm run build && node --test tests/mcp.test.mjs` 通过 21/21。
- 完整验证：`npm test` 通过 97/97；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 read-only named preview 指向 direct `execution.arguments`，write-capable named preview 才指向 `executionAfterApproval`。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608181620 -> 0.1.0+codex.20260608182048`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608182048`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608182048/scripts/` 做 MCP 回归，确认 21/21 通过。

## MCP Plan Dynamic Missing CWD Preview Prompt 计划

### 目标

修复 MCP `ultracode_plan_dynamic` 在未传 `cwd` 时的 named workflow preview 提示：如果没有 `cwd`，工具无法返回 ready-to-call `execution.arguments` 或 `executionAfterApproval.arguments`，preview prompt 不应引用缺失字段，而应提示重新传入 `cwd` 获取可直接调用的参数。

### 实施清单

- [x] 先写失败测试，覆盖 read-only named workflow 未传 `cwd` 时 preview 不引用缺失 `execution.arguments`
- [x] 实现 named workflow preview prompt 按实际 follow-up 字段区分
- [x] 同步 README / README.zh-CN / Skill 的 missing-cwd prompt 说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/mcp.test.mjs` 失败 1 项；read-only named workflow 未传 `cwd` 时，preview 仍提示调用不存在的 `execution.arguments`。
- 绿色实现：`createNamedWorkflowPreview()` 现在由调用方传入实际 follow-up 类型；没有 `cwd` 时返回重新带 `cwd` 规划的提示，不再引用缺失字段。
- 绿色验证：`npm run build && node --test tests/mcp.test.mjs` 通过，MCP 回归 22/22。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 named workflow preview 如果因为省略 `cwd` 缺少 `execution` / `executionAfterApproval`，应带 `cwd` 重新规划后再执行。
- 完整验证：`npm test` 通过 98/98；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608182048 -> 0.1.0+codex.20260608182649`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608182649`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608182649/scripts/` 做 MCP 回归，确认 22/22 通过。

## MCP Plan Dynamic Dynamic Missing CWD Execution 计划

### 目标

修复 MCP `ultracode_plan_dynamic` 的 dynamic preview 批准执行参数：即使调用方传了 `outputPlan`，如果没有传 `cwd`，工具也不能把 `executionAfterApproval.arguments.cwd` 默默设成 MCP 进程目录。动态 workflow 执行必须使用真实 workspace `cwd`；缺失时应只返回 preview/planFile，并提示带 `cwd` 重新规划或补齐执行参数。

### 实施清单

- [x] 先写失败测试，覆盖 dynamic preview 未传 `cwd` 但传 `outputPlan` 时不返回进程 cwd
- [x] 实现 dynamic preview follow-up 按是否有 `cwd` 区分
- [x] 同步 README / README.zh-CN / Skill 的 missing-cwd dynamic 说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/mcp.test.mjs` 失败 2 项；dynamic preview 未传 `cwd` 但传绝对 `outputPlan` 时，`executionAfterApproval.arguments.cwd` 被错误设为 MCP 进程目录 `/Users/chuntao.liao/Github/ai-native/codex-ultracode/scripts`；未传 `cwd` 且传相对 `outputPlan` 时，工具先尝试写 plan，而不是在写文件前拒绝。
- 绿色实现：`ultracode_plan_dynamic` 现在只有在调用方传入 `cwd` 时才为 dynamic preview 返回 `executionAfterApproval`；未传 `cwd` 且传绝对 `outputPlan` 时只返回 preview/planFile，并提示带 `cwd` 重新规划；未传 `cwd` 且传相对 `outputPlan` 时在写文件前返回错误。
- 绿色验证：`npm run build && node --test tests/mcp.test.mjs` 通过，MCP 回归 24/24。
- 文档同步：README、README.zh-CN、Ultracode Skill 和 MCP schema 已说明 dynamic preview 只有带 `cwd` 才返回批准后的执行参数，相对 `outputPlan` 必须同时传 `cwd`。
- 完整验证：`npm test` 通过 100/100；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608182649 -> 0.1.0+codex.20260608183336`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608183336`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608183336/scripts/` 做 MCP 回归，确认 24/24 通过。

## MCP Dynamic Execution Params Preservation 计划

### 目标

修复 MCP `ultracode_dispatch` / `ultracode_plan_dynamic` 的 dynamic preview 批准执行参数：用户传入的结构化 `params` 以及显式高级执行控制 `runId`、`outputDir`、`worktreeDir` 不应在 preview -> confirmation -> `ultracode_run_dynamic` 链路中丢失。Codex 确认后应直接使用 `executionAfterApproval.arguments`，且这些 arguments 必须保留用户已经提供的上下文。

### 实施清单

- [x] 先写失败测试，覆盖 dynamic dispatch 的 `executionAfterApproval.arguments` 保留 `params` 和显式执行控制
- [x] 实现 dynamic executionAfterApproval 参数透传
- [x] 同步 README / README.zh-CN / Skill 的 dynamic confirmation 参数说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/mcp.test.mjs` 失败 1 项；dynamic dispatch preview 的 `executionAfterApproval.arguments` 只包含 `cwd`、`approved`、`planFile`，丢失用户传入的 `params`、`outputDir`、`runId`、`worktreeDir`。
- 绿色实现：`createDynamicExecutionAfterApproval()` 现在会保留可选 `params`、`outputDir`、`runId`、`worktreeDir`；`ultracode_dispatch` 进入 dynamic preview 时会把这些用户已提供的上下文字段传入 plan_dynamic follow-up。
- 绿色验证：`npm run build && node --test tests/mcp.test.mjs` 通过，MCP 回归 25/25。
- 文档同步：README、README.zh-CN、Ultracode Skill 和 MCP schema 已说明 dynamic preview 确认后应直接使用 `executionAfterApproval.arguments`，它会保留用户传入的 `params` 和显式高级执行控制。
- 完整验证：`npm test` 通过 101/101；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608183336 -> 0.1.0+codex.20260608183850`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608183850`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608183850/scripts/` 做 MCP 回归，确认 25/25 通过。

## CLI Dynamic Dispatch Next Command Params Preservation 计划

### 目标

修复 CLI `ultracode "<intent>"` / `ultracode dispatch --intent ...` 的 dynamic preview 下一步命令：当用户显式传入 `params`、`runId`、`outputDir`、`worktreeDir` 时，`Next command after approval` 必须把这些上下文带入 `run-dynamic`，否则确认执行会丢失用户已经提供的上下文。

### 实施清单

- [x] 先写失败测试，覆盖 CLI dynamic dispatch `nextCommand` 保留 `params` 和显式执行控制
- [x] 实现 `run-dynamic` next command 参数透传
- [x] 同步 README / README.zh-CN / Skill 的 CLI dynamic confirmation 参数说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs` 失败 1 项；friendly dynamic dispatch 的 `nextCommand` 只有 `ultracode run-dynamic --plan-file ... --approved true`，没有保留用户传入的 `params`、`outputDir`、`runId`、`worktreeDir`。
- 绿色实现：`buildRunDynamicPlanCommand()` 现在支持可选 `params`、`outputDir`、`runId`、`worktreeDir`；CLI dynamic dispatch 的 `nextCommand` 会保留用户已经显式传入的上下文。
- 绿色验证：`npm run build && node --test tests/cli.test.mjs` 通过，CLI 回归 30/30。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 CLI dynamic preview 的下一步命令会保留 dispatch 时显式传入的 `params`、`runId`、`outputDir`、`worktreeDir`。
- 完整验证：`npm test` 通过 102/102；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608183850 -> 0.1.0+codex.20260608184336`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608184336`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608184336/scripts/` 做 CLI 回归，确认 30/30 通过。

## CLI Plan Dynamic Params Preservation 计划

### 目标

补齐 CLI `plan-dynamic` 与 MCP `ultracode_plan_dynamic` 的参数能力一致性：显式 planning 时也应接受并保留 `params`、`runId`、`outputDir`、`worktreeDir`。当推荐 named workflow 或生成 dynamic preview 时，返回的 next command / executionAfterApproval command 必须包含这些已提供上下文，避免确认执行时丢参。

### 实施清单

- [x] 先写失败测试，覆盖 `plan-dynamic` named recommendation 保留 `--params`
- [x] 先写失败测试，覆盖 `plan-dynamic` dynamic preview 保留 `--params` 和显式执行控制
- [x] 实现 CLI `plan-dynamic` 参数解析与 next command 透传
- [x] 同步 README / README.zh-CN / Skill 的 plan-dynamic 参数说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs` 失败 2 项；`plan-dynamic` dynamic preview 的 `nextCommand` 没有保留 `--params`、`--outputDir`、`--run-id`、`--worktree-dir`；named recommendation 的 `executionAfterApproval.nextCommand` 没有保留 `--params`。
- 绿色实现：CLI `plan-dynamic` 现在解析 `--params`、`--outputDir`、`--run-id`、`--worktree-dir`，并在 named / dynamic next command 中保留这些上下文字段。
- 绿色验证：`npm run build && node --test tests/cli.test.mjs` 通过，CLI 回归 32/32。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 `plan-dynamic` 会在返回的 named / dynamic 批准命令中保留显式传入的 `params`、`runId`、`outputDir`、`worktreeDir`。
- 完整验证：`npm test` 通过 104/104；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608184336 -> 0.1.0+codex.20260608184851`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608184851`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608184851/scripts/` 做 CLI 回归，确认 32/32 通过。

## Dynamic Plan Artifact Context Snapshot 计划

### 目标

让 dynamic plan artifact 本身成为可审计、可复现的确认快照：当 preview 阶段已有 `params`、`runId`、`outputDir`、`worktreeDir` 时，`.ultracode/plans/*.plan.json` 和执行后的 `approved-plan.json` 都应记录这些上下文。执行 `run-dynamic` 时如果命令没有重新传 `--params`，应能从 plan artifact 恢复 preview 时的 `params`，避免 artifact 与实际执行上下文脱节。

### 实施清单

- [x] 先写失败测试，覆盖 dynamic plan file / approved-plan 保存 `params` 和执行上下文
- [x] 先写失败测试，覆盖 `run-dynamic` 从 plan file 恢复 `params`
- [x] 实现 plan artifact 上下文保存与执行 fallback
- [x] 同步 README / README.zh-CN / Skill 的 artifact audit 说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/dynamic-plan-file.test.mjs tests/mcp.test.mjs` 失败 2 项；plan artifact / approved-plan 未保存 `params`，MCP `run_dynamic` 未从 plan file 恢复 `params`。
- 绿色实现：dynamic plan file 新增可选 `params` 与 `execution` 字段；CLI `dispatch` / `plan-dynamic` 和 MCP `ultracode_plan_dynamic` 在写 dynamic plan artifact 时保存 preview 上下文；CLI/MCP `run-dynamic` 在没有重新传 `params` 时复用 plan file 参数。
- 针对性验证：`npm run build && node --test tests/dynamic-plan-file.test.mjs tests/mcp.test.mjs tests/cli.test.mjs` 通过，58 项通过。
- 完整验证：`npm test` 通过 104/104；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 dynamic plan artifact / approved-plan 会保存 preview-time `params` 与执行上下文，且 `run-dynamic` 可在未重新传参时复用 plan file `params`。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608184851 -> 0.1.0+codex.20260608185834`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608185834`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608185834/scripts/` 做 CLI/MCP/plan-file 回归，确认 58/58 通过。

## Dynamic Run Execution Context Fallback 计划

### 目标

让 reviewed dynamic plan artifact 不只保存执行上下文，也能在执行阶段真正复用它：当 `run-dynamic` / `ultracode_run_dynamic` 没有显式传 `runId`、`outputDir`、`worktreeDir` 时，从 plan file 的 `execution` 字段恢复 preview 阶段保存的执行控制；显式传入的命令参数仍然优先。这样用户确认执行时只需要关心 reviewed `planFile`，不会因为少复制高级参数导致 run id、产物目录或 worktree 位置漂移。

### 实施清单

- [x] 先写失败测试，覆盖共享执行上下文解析：显式参数优先、plan context fallback、默认值兜底
- [x] 先写失败测试，覆盖 MCP `ultracode_run_dynamic` 从 plan file 恢复 `runId`、`outputDir`、`worktreeDir`
- [x] 实现 CLI/MCP `run-dynamic` 执行上下文 fallback
- [x] 同步 README / README.zh-CN / Skill 的执行上下文 fallback 说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/dynamic-plan-file.test.mjs tests/mcp.test.mjs` 失败 2 项；共享 `resolveDynamicRunExecutionContext` 尚不存在，MCP `ultracode_run_dynamic` 仍生成新的 `dynamic-...` runId，未复用 plan file 的 `execution`。
- 绿色实现：新增 `resolveDynamicRunExecutionContext()`，统一实现显式输入优先、plan file `execution` fallback、默认 runId/outputDir 兜底；CLI `run-dynamic` 将默认值推迟到读取 plan file 后决定；MCP `ultracode_run_dynamic` 使用同一 helper。
- 针对性验证：`npm run build && node --test tests/dynamic-plan-file.test.mjs tests/mcp.test.mjs tests/cli.test.mjs` 通过，60 项通过。
- 完整验证：`npm test` 通过 106/106；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 文档同步：README、README.zh-CN、Ultracode Skill 和 MCP schema 已说明 `run-dynamic` / `ultracode_run_dynamic` 可在未显式传入时复用 plan file 的 `params`、`runId`、`outputDir`、`worktreeDir`，且显式参数优先。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608185834 -> 0.1.0+codex.20260608190554`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608190554`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608190554/scripts/` 做 CLI/MCP/plan-file 回归，确认 60/60 通过。

## Dynamic Run Params Merge Fallback 计划

### 目标

让 dynamic plan 执行的参数语义和 named workflow 参数语义一致：当 reviewed plan file 已保存 `params`，而用户或 Codex 在 `run-dynamic` / `ultracode_run_dynamic` 中只显式传入部分 `params` 时，应以 plan file `params` 为 base 做深合并，显式字段覆盖同名字段，数组和非对象按显式值覆盖。这样用户只修改一个字段不会丢掉 preview 阶段已审阅的其它结构化上下文。

### 实施清单

- [x] 先写失败测试，覆盖 dynamic run params 的 plan base、显式深合并覆盖、默认兜底
- [x] 先写失败测试，覆盖 MCP `ultracode_run_dynamic` partial `params` 不丢失 plan file params
- [x] 实现 CLI/MCP `run-dynamic` 参数深合并 fallback
- [x] 同步 README / README.zh-CN / Skill / MCP schema 的参数合并说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/dynamic-plan-file.test.mjs tests/mcp.test.mjs` 失败 2 项；共享 `resolveDynamicRunParams` 尚不存在，MCP `ultracode_run_dynamic` 收到 partial explicit `params` 时会整体替换 plan file params，丢失 `audience`、`scope.paths`、`scope.details.owner` 等已审阅上下文。
- 绿色实现：新增 `resolveDynamicRunParams()`，以 plan file `params` 为 base，对显式 `params` 做深合并；对象递归合并，数组和非对象按显式值覆盖。CLI/MCP `run-dynamic` 都改用同一 helper。
- 针对性验证：`npm run build && node --test tests/dynamic-plan-file.test.mjs tests/mcp.test.mjs tests/cli.test.mjs` 通过，62 项通过。
- 完整验证：`npm test` 通过 108/108；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 文档同步：README、README.zh-CN、Ultracode Skill 和 MCP schema 已说明 dynamic execution 会以 plan-file `params` 为 base 深合并显式 `params`，且执行控制仍按显式参数优先。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608190554 -> 0.1.0+codex.20260608191132`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608191132`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608191132/scripts/` 做 CLI/MCP/plan-file 回归，确认 62/62 通过。

## Approved Plan Effective Context Audit 计划

### 目标

让 `<outputDir>/approved-plan.json` 真正反映本次 run 实际执行的上下文：当 `run-dynamic` / `ultracode_run_dynamic` 通过 plan file 执行，并且执行阶段对 `params` 做了深合并或对 `runId`、`outputDir`、`worktreeDir` 做了显式覆盖 / fallback 后，approved snapshot 应保存 effective `params` 和 effective `execution`，而不是只复制原始 plan file 里的 preview-time 上下文。这样审计文件、`param.dynamic.json` 和实际 run 目录能保持一致。

### 实施清单

- [x] 先写失败测试，覆盖 `copyApprovedDynamicPlanFile()` 写入 effective `params` / `execution`
- [x] 先写失败测试，覆盖 MCP `ultracode_run_dynamic` 传递 effective context 到 approved snapshot copy
- [x] 实现 CLI/MCP plan-file run 的 approved snapshot effective context 写入
- [x] 同步 README / README.zh-CN / Skill / MCP schema 的 audit 说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/dynamic-plan-file.test.mjs tests/mcp.test.mjs` 失败 2 项；`copyApprovedDynamicPlanFile()` 仍把原 plan file 的旧 `params` / `execution` 写入 `approved-plan.json`，MCP `ultracode_run_dynamic` 调用 copy 时没有传 effective params / execution。
- 绿色实现：`copyApprovedDynamicPlanFile()` 新增可选 `params` 和 `execution`，写入并返回 effective context；CLI/MCP plan-file dynamic run 在复制 approved snapshot 时传入 `effectiveParams` 和 resolved `execution`。
- 针对性验证：`npm run build && node --test tests/dynamic-plan-file.test.mjs tests/mcp.test.mjs tests/cli.test.mjs` 通过，63 项通过。
- 完整验证：`npm test` 通过 109/109；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 文档同步：README、README.zh-CN、Ultracode Skill 和 MCP schema 已说明 `approved-plan.json` 会保存本次 run 的 effective `params` 与 effective `execution`，与 `param.dynamic.json` 和实际 run 目录一致。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608191132 -> 0.1.0+codex.20260608191737`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608191737`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608191737/scripts/` 做 CLI/MCP/plan-file 回归，确认 63/63 通过。

## Dynamic Content Deliverable Workflow 计划

### 目标

让 Codex 在没有命中 registered workflow 时，也能根据实际任务场景生成更贴切的动态 workflow。对于“做旅游攻略、生成发布说明、写方案/文档/邮件”等非代码内容交付，不应退回通用 `scope-brief -> execute-task -> review-result`，而应自动规划为面向交付物的 workflow：先明确受众、范围、格式和事实边界，再起草最终交付物，最后做质量审阅。这样用户只表达任务意图，Ultracode 也能体现“动态设计 workflow”的能力。

### 实施清单

- [x] 先写失败测试，覆盖无 named workflow 命中时的内容交付动态 workflow
- [x] 实现内容交付意图识别和 artifact-oriented workflow 模板
- [x] 同步 README / README.zh-CN / Skill 的动态模板说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/dynamic-planner.test.mjs` 失败 1 项；无 named workflow 命中时，`Create a 3-day Kyoto travel guide with rainy-day alternatives` 仍退回 `scope-brief -> execute-task -> review-result` 通用三段式。
- 绿色实现：新增 content-deliverable 动态模板和意图识别；旅游攻略、行程、发布说明、方案、文档、邮件、公告等内容交付类任务会生成 `deliverable-brief -> draft-deliverable -> review-deliverable`，全部保持 read-only artifact 产出。
- 入口覆盖：新增 CLI `plan-dynamic --json` 回归，使用空 registry 验证 fallback dynamic preview 和写出的 plan artifact 都包含 content-deliverable 三段式；默认 registry 有 `travel-guide` 时仍优先推荐 named workflow。
- 针对性验证：`npm run build && node --test tests/dynamic-planner.test.mjs tests/cli.test.mjs` 通过，41 项通过。
- 完整验证：`npm test` 通过 111/111；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 dynamic fallback 模板包括 debug/fix、code-change、research、content-deliverable 和 generic scoped execution。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608191737 -> 0.1.0+codex.20260608192527`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608192527`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608192527/scripts/` 做 dynamic planner / CLI 回归，确认 41/41 通过。

## Dynamic Planner Template Metadata 计划

### 目标

让动态 workflow preview 不只展示 stage plan，还要明确告诉 Codex 和用户 planner 选择了哪一种任务模板以及为什么选择它。当前 `review_dynamic` 的 `reason` 仍是泛泛的 “No registered workflow clearly matches”，而 `preview` 没有稳定 `template` 字段，Codex 只能从 summary 或 stage name 猜测类型。新增结构化 template metadata 后，CLI/MCP 和 plan artifact 都能稳定表达 `debug-fix`、`code-change`、`research`、`content-deliverable`、`generic`，提升确认预览和审计体验。

### 实施清单

- [x] 先写失败测试，覆盖 dynamic planner 返回 `preview.template` 与模板化 `reason`
- [x] 先写失败测试，覆盖 CLI `plan-dynamic --json` 与 plan artifact 保存 template metadata
- [x] 实现 template metadata 与更具体的动态规划原因
- [x] 同步 README / README.zh-CN / Skill 的 preview metadata 说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/dynamic-planner.test.mjs tests/cli.test.mjs` 失败 4 项；动态 preview 没有 `preview.template`，planner reason 仍无法表达具体选中模板。
- 绿色实现：新增 `DynamicWorkflowTemplate` union，并让 dynamic preview 保存 `template`；`planDynamicWorkflow()` 会为 `debug-fix`、`code-change`、`research`、`content-deliverable`、`generic` 返回具体 reason。
- 入口体验：CLI 文本预览新增 `Template: <template>`；CLI JSON、MCP structuredContent 和 dynamic plan artifact 都会保留 `preview.template`。
- 针对性验证：`npm run build && node --test tests/dynamic-planner.test.mjs tests/cli.test.mjs tests/mcp.test.mjs` 通过，68 项通过。
- 完整验证：`npm test` 通过 111/111；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 dynamic preview 会包含 `preview.template`，并应在请求确认前展示。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608192527 -> 0.1.0+codex.20260608193112`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608193112`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608193112/scripts/` 做 dynamic planner / CLI / MCP 回归，确认 68/68 通过。

## Content Deliverable Classification Priority 计划

### 目标

修复 dynamic fallback classifier 对内容交付任务的误分类：像“Generate release notes from recent repository changes / 根据最近变更生成发布说明”这类任务会包含 `changes` / `变更`，但目标是产出文档，不是修改代码。当前逻辑可能先命中 `code-change`，生成带 write-mode 的实现 stage。应让明确的内容交付物（release notes、changelog、proposal、guide、document、公告等）优先走 `content-deliverable`，保持 read-only artifact workflow。

### 实施清单

- [x] 先写失败测试，覆盖 release-notes/changelog fallback 不应误判为 code-change
- [x] 调整动态模板选择优先级，保留显式代码实现/修复任务走 code-change
- [x] 同步 README / README.zh-CN / Skill 的分类优先级说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/dynamic-planner.test.mjs` 失败 1 项；`Generate release notes from recent repository changes` 在无 named workflow 时被误判为 `code-change`，会生成 write-mode stage。
- 绿色实现：调整 dynamic template 选择优先级；`debug-fix` 和 `research/review` 保持优先，明确内容交付物优先于泛化的 `change/changes/变更` 关键词，显式代码实现/修复仍走 `code-change`。
- 针对性验证：`npm run build && node --test tests/dynamic-planner.test.mjs tests/cli.test.mjs tests/mcp.test.mjs` 通过，69 项通过。
- 完整验证：`npm test` 通过 112/112；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 release notes / changelog 等内容交付物即使提到 repository changes，也保持 read-only，除非用户明确要求编辑文件。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608193112 -> 0.1.0+codex.20260608193558`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608193558`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608193558/scripts/` 做 dynamic planner / CLI / MCP 回归，确认 69/69 通过。

## CLI Approval Envelope Consistency 计划

### 目标

让 CLI JSON 输出和 MCP 输出一样明确表达“批准后动作”。当前 `plan-dynamic --json` / `dispatch --json` 的 dynamic preview 主要依赖顶层 `nextCommand`，write-capable named dispatch 也缺少统一的 `executionAfterApproval` envelope。对 Codex fallback 或脚本消费者来说，这仍需要自行推断批准后该执行什么。新增 `executionAfterApproval` 并保留 `nextCommand` 兼容字段后，CLI JSON、MCP structuredContent 和文档语义更一致。

### 实施清单

- [x] 先写失败测试，覆盖 CLI dynamic preview JSON 返回 `executionAfterApproval`
- [x] 先写失败测试，覆盖 CLI write-capable named dispatch JSON 返回 `executionAfterApproval`
- [x] 实现 CLI approval envelope，保留原有 `nextCommand`
- [x] 同步 README / README.zh-CN / Skill 的 CLI JSON 说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs` 失败 5 项；CLI JSON 的 dynamic preview、dynamic dispatch、write-capable named dispatch / plan-dynamic 缺少统一 `executionAfterApproval` envelope。
- 绿色实现：新增 CLI `createCliExecutionAfterApproval()`，为 approval-gated named / dynamic preview 输出 `executionAfterApproval.nextCommand` 和 `confirmationGate`；保留顶层 `nextCommand` 兼容字段。
- 针对性验证：`npm run build && node --test tests/dynamic-planner.test.mjs tests/cli.test.mjs tests/mcp.test.mjs` 通过，69 项通过。
- 完整验证：`npm test` 通过 112/112；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 CLI JSON 中 `executionAfterApproval.nextCommand` 是 approval-gated preview 的首选结构，顶层 `nextCommand` 只是兼容 shortcut。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608193558 -> 0.1.0+codex.20260608194138`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608194138`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608194138/scripts/` 做 dynamic planner / CLI / MCP 回归，确认 69/69 通过。

## CLI Direct Execution Envelope Consistency 计划

### 目标

让 CLI JSON 对“不需要确认、可直接执行”的 named workflow 也提供结构化 `execution` envelope，而不是只给顶层 `nextCommand`。MCP 在 read-only named workflow 推荐中已有 `execution.tool` / `execution.arguments` / `approvalRequired:false`；CLI fallback 目前仍需要脚本或 Codex 从 `nextCommand` 自行推断。新增 `execution.nextCommand` 和 `approvalRequired:false` 后，CLI JSON 的 direct execution 与 approval-gated execution 都有稳定 envelope，同时保留顶层 `nextCommand` 兼容字段。

### 实施清单

- [x] 先写失败测试，覆盖 read-only named `plan-dynamic --json` 返回 `execution`
- [x] 实现 CLI direct execution envelope，保留原有 `nextCommand`
- [x] 同步 README / README.zh-CN / Skill 的 CLI JSON direct execution 说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs` 先确认 read-only named `plan-dynamic --json` 只有顶层 `nextCommand`，缺少结构化 `execution` envelope。
- 绿色实现：新增 CLI `createCliExecution()`；read-only named `plan-dynamic --json` 现在返回 `execution.nextCommand` 和 `approvalRequired:false`，同时保留顶层 `nextCommand` 作为兼容 shortcut。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 read-only named CLI JSON 首选 `execution.nextCommand`，approval-gated preview 首选 `executionAfterApproval.nextCommand`。
- 针对性验证：`npm run build && node --test tests/dynamic-planner.test.mjs tests/cli.test.mjs tests/mcp.test.mjs` 通过，70 项通过。
- 完整验证：`npm test` 通过 113/113；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608194138 -> 0.1.0+codex.20260608194734`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608194734`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608194734/scripts/` 做 dynamic planner / CLI / MCP 回归，确认 70/70 通过。

## CLI Named Preview Approval Clarity 计划

### 目标

让 `plan-dynamic` 的非 JSON named workflow 预览更明确地区分“可直接运行”和“需要确认后运行”。当前 read-only named 文本只显示 `Recommended action: run named workflow` 和 `Next command`，write-capable named 文本只显示 `Recommended action: confirm named workflow` 和 `Next command after approval`；用户需要从 write stages 或措辞推断是否需要 approval。新增显式 `Approval required: no/yes` 后，终端体验和 JSON envelope 语义一致。

### 实施清单

- [x] 先写失败测试，覆盖 read-only named 文本包含 `Approval required: no`
- [x] 先写失败测试，覆盖 write-capable named 文本包含 `Approval required: yes`
- [x] 实现 named preview approval 状态展示
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs` 失败 2 项；read-only named 与 write-capable named 的非 JSON `plan-dynamic` 文本都缺少明确 `Approval required` 状态。
- 绿色实现：`formatNamedWorkflowRecommendation()` 输出 `Approval required: no`；`formatNamedWorkflowConfirmation()` 输出 `Approval required: yes`。JSON contract 未变，仍使用 `execution` / `executionAfterApproval` envelope。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 `plan-dynamic` 的 named 文本预览会显示 `Approval required: yes/no`。
- 针对性验证：`npm run build && node --test tests/dynamic-planner.test.mjs tests/cli.test.mjs tests/mcp.test.mjs` 通过，71 项通过。
- 完整验证：`npm test` 通过 114/114；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608194734 -> 0.1.0+codex.20260608195224`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608195224`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608195224/scripts/` 做 dynamic planner / CLI / MCP 回归，确认 71/71 通过。

## CLI Dynamic Preview Approval Clarity 计划

### 目标

让 `plan-dynamic` / `dispatch` 的非 JSON dynamic preview 也显式显示 `Approval required: yes`。named workflow 文本预览已经明确区分 `Approval required: no/yes`；dynamic preview 虽然有 `Confirmation:` 和 `Next command after approval:`，但没有同样的稳定状态行。补齐后，终端文本、JSON `requiresConfirmation: true` 和 `executionAfterApproval` envelope 语义一致。

### 实施清单

- [x] 先写失败测试，覆盖 dynamic preview 文本包含 `Approval required: yes`
- [x] 实现 dynamic preview approval 状态展示
- [x] 同步 README / README.zh-CN / Skill 的 dynamic preview 文本说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs` 失败 1 项；`formatDynamicWorkflowPlan()` 的非 JSON dynamic preview 缺少 `Approval required: yes`。
- 绿色实现：`formatDynamicWorkflowPlan()` 在 dynamic preview 的 `Reason` 后输出 `Approval required: yes`，与 named preview 的 approval 状态展示保持一致。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 dynamic preview 文本会显示 `Approval required: yes`。
- 针对性验证：`npm run build && node --test tests/dynamic-planner.test.mjs tests/cli.test.mjs tests/mcp.test.mjs` 通过，71 项通过。
- 完整验证：`npm test` 通过 114/114；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608195224 -> 0.1.0+codex.20260608195543`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608195543`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608195543/scripts/` 做 dynamic planner / CLI / MCP 回归，确认 71/71 通过。

## Write-Capable Named Approval Enforcement 计划

### 目标

让 write-capable named workflow 的“需要确认”不只是 preview 文案，而是执行层真实约束。当前 `plan-dynamic` / `dispatch` 会对包含 write stage 的 named workflow 返回 `requiresConfirmation: true`，但 CLI 直接执行 `ultracode <workflow-name> "<intent>"` 或 MCP 直接调用 `ultracode_run_named` 时没有 `--approved true` / `approved: true` gate。应让 write-capable named workflow 在 CLI 和 MCP 执行入口都必须显式 approved；确认预览返回的执行命令 / arguments 自动携带 approved。read-only named workflow 继续无需 approval。

### 实施清单

- [x] 先写失败测试，覆盖 CLI write-capable named 直接执行缺少 `--approved true` 会失败
- [x] 先写失败测试，覆盖 CLI confirmation nextCommand 自动带 `--approved true`
- [x] 先写失败测试，覆盖 MCP `ultracode_run_named` 对 write-capable workflow 缺少 `approved: true` 会失败，且 `executionAfterApproval.arguments` 自动带 approved
- [x] 实现 CLI/MCP write-capable named approval enforcement
- [x] 同步 README / README.zh-CN / Skill 的 named approval enforcement 说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs tests/mcp.test.mjs` 失败 7 项；write-capable named confirmation command / MCP `executionAfterApproval.arguments` 缺少 approval，CLI/MCP 直接执行缺少 approval 时没有在执行层拒绝。
- 绿色实现：CLI `run-named` / friendly named shortcut 支持 `--approved true`；write-capable named workflow 在 CLI 执行前先 resolve workflow 并要求 `--approved true`，未批准时在 prepare worktree 前失败。MCP `ultracode_run_named` 支持 `approved` 参数，write-capable workflow 缺少 `approved: true` 时在 prepare worktree 前失败。
- 执行入口：CLI write-capable named confirmation nextCommand 自动包含 `--approved true`；MCP `executionAfterApproval.arguments` 自动包含 `approved: true`；read-only named `execution.arguments` 不包含 approval，也不要求 approval。
- Tool schema：`ultracode_run_named` schema 暴露 `approved` boolean，并说明只在运行 write-capable named workflow 时需要。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 write-capable named approval enforcement，直接执行缺少 approval 会被拒绝。
- 针对性验证：`npm run build && node --test tests/dynamic-planner.test.mjs tests/cli.test.mjs tests/mcp.test.mjs` 通过，73 项通过。
- 完整验证：`npm test` 通过 116/116；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`，没有临时 plan artifact。
- 残留清理：红灯阶段曾误触发一个未批准 write-capable named run，已终止残留 `codex exec` 进程，并用 `git worktree remove --force` 清理 generated worktree `repo-change-2026-06-08T19-59-13-181Z`；复查无相关进程和 worktree 残留。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608195543 -> 0.1.0+codex.20260608200725`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260608200725`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260608200725/scripts/` 做 dynamic planner / CLI / MCP 回归，确认 73/73 通过。

## Write-Capable Named Approval Audit 计划

### 目标

让 write-capable named workflow 在批准后执行时留下稳定审计文件。dynamic workflow 已经通过 `<outputDir>/approved-plan.json` 记录用户审阅过的计划、effective params 和 execution context；write-capable named workflow 现在虽然要求 `--approved true` / `approved: true`，但运行产物里没有明确记录这次执行是批准后启动的。新增 `<outputDir>/approved-named-workflow.json` 后，named 与 dynamic 的 approval audit 语义一致，Codex 后续展示和人工排查都能直接引用该文件。

### 实施清单

- [x] 先写失败测试，覆盖 approved named audit helper 写入 `approved-named-workflow.json`
- [x] 先写失败测试，覆盖 MCP approved write-capable named run 返回 `approvedNamedWorkflowFile`
- [x] 实现 CLI/MCP write-capable named approved audit 写入
- [x] 同步 README / README.zh-CN / Skill 的 named approval audit 说明
- [x] 运行完整验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证 1：`npm run build && node --test tests/named-workflows.test.mjs` 先确认 `writeApprovedNamedWorkflowFile` 不存在，approved named audit helper 缺失。
- 红灯验证 2：`npm run build && node --test tests/mcp.test.mjs` 先确认 approved write-capable named run 没有返回 `approvedNamedWorkflowFile` / `inspection.approvedNamedWorkflowFile`。
- 绿色实现：新增 `writeApprovedNamedWorkflowFile()`，写入 `<outputDir>/approved-named-workflow.json`，记录 `workflowName`、`workflowFile`、`paramFile`、`intent`、`createdAt`、effective `params` 和执行上下文。
- MCP 接入：`ultracode_run_named` 在 write-capable workflow 且 `approved: true` 时写审计文件；返回顶层 `approvedNamedWorkflowFile`，并在 `inspection.approvedNamedWorkflowFile` 与 `inspection.nextActions` 中暴露该审计路径。
- CLI 接入：`ultracode <workflow-name> "<intent>" --approved true` / `run-name --approved true` 对 write-capable named workflow 写入同一份 `approved-named-workflow.json`。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 approved write-capable named run 的 audit file、MCP 返回字段，以及 Codex 后续应优先使用 `inspection.approvedNamedWorkflowFile`。
- 针对性验证：`npm run build && node --test tests/named-workflows.test.mjs tests/mcp.test.mjs` 通过，32 项通过。
- 核心验证：`npm run build && node --test tests/dynamic-planner.test.mjs tests/cli.test.mjs tests/mcp.test.mjs` 通过，74 项通过。
- 完整验证：`npm test` 通过 118/118；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`；`pgrep -af 'node --test|run-ultracode|codex exec'` 无残留进程。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260608200725 -> 0.1.0+codex.20260609011328`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260609011328`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260609011328/scripts/` 做 dynamic planner / CLI / MCP 回归，确认 74/74 通过。

## MCP Named Execution Context Preservation 计划

### 目标

让 MCP `ultracode_plan_dynamic` 在推荐 named workflow 时，和 CLI、dispatch、dynamic preview 一样保留用户显式传入的执行上下文。当前 read-only named 的 `execution.arguments` 以及 write-capable named 的 `executionAfterApproval.arguments` 没有带上 `outputDir`、`runId`、`worktreeDir`；这会让 Codex 先规划再执行时丢掉用户要求的确定性 run id、产物目录或 worktree 位置。修复后，用户仍不需要关心这些高级字段，但一旦他们明确指定，Codex 不会在 planning -> execution 链路中丢失。

### 实施清单

- [x] 先写失败测试，覆盖 read-only named `execution.arguments` 保留 `outputDir`、`runId`、`worktreeDir`
- [x] 先写失败测试，覆盖 write-capable named `executionAfterApproval.arguments` 保留 `outputDir`、`runId`、`worktreeDir`
- [x] 实现 MCP named execution context preservation
- [x] 运行验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/mcp.test.mjs` 失败 2 项；MCP `ultracode_plan_dynamic` 推荐 read-only named workflow 时，`execution.arguments` 丢失 `outputDir`、`runId`、`worktreeDir`；推荐 write-capable named workflow 时，`executionAfterApproval.arguments` 也丢失同样的执行上下文。
- 绿色实现：`createNamedWorkflowExecution()` 新增 `outputDir`、`runId`、`worktreeDir` 透传；`handlePlanDynamicWorkflowTool()` 在构造 read-only named `execution` 和 write-capable named `executionAfterApproval` 时传入这些字段。
- 文档判断：README、README.zh-CN 和 Ultracode Skill 之前已经声明 planning 会保留显式高级执行控制；本次是实现补齐该承诺，因此没有额外文案变更。
- 针对性验证：`npm run build && node --test tests/mcp.test.mjs` 通过，29 项通过。
- 核心验证：`npm run build && node --test tests/dynamic-planner.test.mjs tests/cli.test.mjs tests/mcp.test.mjs` 通过，74 项通过。
- 完整验证：`npm test` 通过 118/118；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`；`pgrep -af 'node --test|run-ultracode|codex exec'` 无残留进程。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260609011328 -> 0.1.0+codex.20260609011828`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260609011828`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260609011828/scripts/` 做 dynamic planner / CLI / MCP 回归，确认 74/74 通过。

## MCP Named Preview Metadata Consistency 计划

### 目标

让 MCP 的 named workflow confirmation preview 与 dynamic preview 一样具备稳定的展示元数据。当前 README / Skill 已要求在 `dispatch.action: "needs_confirmation"` 时展示 `preview.template`，dynamic preview 有该字段，但 named preview 没有；同时 `ultracode_dispatch` 命中 write-capable named workflow 时没有返回完整 `workflow` 对象，而 `ultracode_plan_dynamic` 会返回。补齐后，Codex 可以统一展示 `workflow` 与 `preview.template/summary/stagePlan/writeStages/outputFiles/risks`，不需要按入口猜字段。

### 实施清单

- [x] 先写失败测试，覆盖 named preview 返回 `preview.template: "named-workflow"`
- [x] 先写失败测试，覆盖 write-capable named dispatch confirmation 返回 `workflow`
- [x] 实现 MCP named preview metadata 一致性修复
- [x] 运行验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/mcp.test.mjs` 失败 3 项；read-only named planning 和 write-capable named planning 的 `preview.template` 为 `undefined`，write-capable named dispatch confirmation 没有返回 `workflow` 对象。
- 绿色实现：`createNamedWorkflowPreview()` 统一返回 `template: "named-workflow"`；`handleDispatchIntentTool()` 在 write-capable named confirmation payload 中返回匹配到的 `workflow`。
- 文档判断：README、README.zh-CN 和 Ultracode Skill 已要求 confirmation preview 展示 `preview.template`，本次修复让 named preview 满足既有说明，无需额外文案。
- 针对性验证：`npm run build && node --test tests/mcp.test.mjs` 通过，29 项通过。
- 核心验证：`npm run build && node --test tests/dynamic-planner.test.mjs tests/cli.test.mjs tests/mcp.test.mjs` 通过，74 项通过。
- 完整验证：`npm test` 通过 118/118；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`；`pgrep -af 'node --test|run-ultracode|codex exec'` 无残留进程。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260609011828 -> 0.1.0+codex.20260609012352`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260609012352`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260609012352/scripts/` 做 dynamic planner / CLI / MCP 回归，确认 74/74 通过。

## CLI Named JSON Preview Consistency 计划

### 目标

让 CLI `plan-dynamic --json` 在推荐 named workflow 时也返回结构化 `preview`，与 MCP 的 named preview 和 dynamic preview 保持一致。当前 CLI JSON named 推荐虽然返回 `workflow`、`execution` / `executionAfterApproval` 和命令，但缺少 `preview.template`、`preview.summary`、`preview.stagePlan`、`preview.writeStages`、`preview.outputFiles`、`preview.risks`、`preview.confirmationPrompt`。补齐后，Codex CLI fallback 或脚本消费者可以用同一套 preview 展示逻辑处理 named 与 dynamic。

### 实施清单

- [x] 先写失败测试，覆盖 read-only named CLI JSON 返回 `preview.template: "named-workflow"`
- [x] 先写失败测试，覆盖 write-capable named CLI JSON 返回 `preview.template: "named-workflow"` 与确认 prompt
- [x] 实现 CLI JSON named preview metadata
- [x] 同步 README / README.zh-CN / Skill 的 CLI JSON preview 说明
- [x] 运行验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs` 失败 2 项；CLI `plan-dynamic --json` 推荐 read-only / write-capable named workflow 时没有返回 `preview`。
- 绿色实现：新增 `createCliNamedWorkflowPreview()`，返回 `template: "named-workflow"`、summary、description、stageCount、writeStages、outputFiles、stagePlan、risks 和 confirmationPrompt；CLI `plan-dynamic --json` 的 read-only / write-capable named 推荐，以及 write-capable `dispatch --json` confirmation 都返回该 preview。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 CLI JSON named recommendations 包含 `preview.template: "named-workflow"` 以及和 MCP 相同的 preview 展示字段。
- 针对性验证：`npm run build && node --test tests/cli.test.mjs` 通过，36 项通过。
- 核心验证：`npm run build && node --test tests/dynamic-planner.test.mjs tests/cli.test.mjs tests/mcp.test.mjs` 通过，74 项通过。
- 完整验证：`npm test` 通过 118/118；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`；`pgrep -af 'node --test|run-ultracode|codex exec'` 无残留进程。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260609012352 -> 0.1.0+codex.20260609012957`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260609012957`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260609012957/scripts/` 做 dynamic planner / CLI / MCP 回归，确认 74/74 通过。

## CLI Dispatch Read-Only JSON Run Payload 计划

### 目标

让 CLI `dispatch --json` 命中 read-only named workflow 并自动执行时，也输出单个干净 JSON payload。当前 CLI JSON preview 路径已经结构化，但 read-only named 自动运行会调用 `runNamedWorkflowFromCli()`，该函数会把 workflow event 写到 stdout；这会让脚本或 Codex fallback 无法直接 `JSON.parse(stdout)`。修复后，普通终端运行仍显示事件和 follow-up，`--json` 则静默 trace stdout，并返回包含 `dispatch`、`plan`、`workflow`、`worktree`、`inspection`、`result`、`followUp` 的结构化结果。

### 实施清单

- [x] 先写失败测试，覆盖 `dispatch --json` 命中 read-only named workflow 时 stdout 是单个 JSON
- [x] 实现 `runNamedWorkflowFromCli()` 的 JSON/silent payload 模式
- [x] 同步 README / README.zh-CN / Skill 的 CLI JSON read-only dispatch 说明
- [x] 运行验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs` 先因测试夹具未初始化 git 仓库失败；补齐真实 git primary checkout 后，再次运行失败在目标症状 `SyntaxError: Unexpected non-whitespace character after JSON`，证明 `dispatch --json` 的 read-only named 自动运行 stdout 混入了多段事件 JSON。
- 绿色实现：`runNamedWorkflowFromCli()` 新增 silent payload 模式；JSON 模式下 trace 仍写事件，stdout 由 `dispatch --json` 统一打印单个 payload，包含 `dispatch.action: "ran_named"`、planner 结果、`workflow.paramFile`、`worktree`、`inspection`、`result` 和 `followUp`。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 CLI read-only named 自动运行的 `--json` 输出是单个可解析 payload，并建议使用 `inspection` / `followUp` 做后续 report/status/tail。
- 针对性验证：`npm run build && node --test tests/cli.test.mjs` 通过，37 项通过。
- 核心验证：`npm run build && node --test tests/dynamic-planner.test.mjs tests/cli.test.mjs tests/mcp.test.mjs` 通过，75 项通过。
- 完整验证：`npm test` 通过 119/119；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 清理验证：`find . -path '*/.ultracode/*' -type f -print` 只剩既有 `.ultracode/inputs/kyoto-spring-3day.param.json`；`pgrep -af 'node --test|run-ultracode|codex exec'` 无残留进程。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260609012957 -> 0.1.0+codex.20260609014247`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260609014247`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260609014247/scripts/` 做 dynamic planner / CLI / MCP 回归，使用源码工作区的 TypeScript binary 编译缓存目录后确认 75/75 通过。

## CLI Direct Named JSON Run Payload 计划

### 目标

让直接 named workflow 执行也支持干净的 `--json` 输出。当前 `dispatch --json` 命中 read-only named workflow 已经返回单个结构化 payload，但 `ultracode run-name <workflow> ... --json` 和 friendly shortcut `ultracode <workflow-name> "<task intent>" --json` 仍会忽略 JSON 模式，继续把 workflow events 写到 stdout。修复后，已知 workflow 名称的 CLI fallback 也能直接 `JSON.parse(stdout)`，并复用同一套 `workflow`、`worktree`、`inspection`、`result`、`followUp` 字段。

### 实施清单

- [x] 先写失败测试，覆盖 direct `run-name ... --json` 输出单个 JSON payload
- [x] 先写失败测试，覆盖 friendly named shortcut 解析并执行 `--json`
- [x] 实现 direct named execution 的 JSON/silent payload 输出
- [x] 同步 README / README.zh-CN / Skill 的 direct named CLI JSON 说明
- [x] 运行验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs` 失败 2 项；显式 `run-name ... --json` 报 `Invalid argument near --json`，friendly named shortcut `--json` 进入执行但 stdout 混入事件导致 `JSON.parse` 失败。
- 绿色实现：`CliInput.run-named` 新增 `json`；`run-name` parser 过滤并记录 `--json`；friendly named shortcut 透传 `shortcut.json`；`main()` 在 direct named JSON 模式下以 silent trace 运行，并打印 `runNamedWorkflowFromCli()` 返回的单个 run payload。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 direct named CLI JSON 返回同一类 `workflow`、`worktree`、`inspection`、`result`、`followUp` payload，但不带 dispatch envelope。
- 针对性验证：`npm run build && node --test tests/cli.test.mjs` 通过，39 项通过。
- 核心验证：`npm run build && node --test tests/dynamic-planner.test.mjs tests/cli.test.mjs tests/mcp.test.mjs` 通过，77 项通过。
- 完整验证：`npm test` 通过 121/121；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260609014247 -> 0.1.0+codex.20260609014832`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260609014832`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260609014832/scripts/` 做 dynamic planner / CLI / MCP 回归，使用源码工作区的 TypeScript binary 编译缓存目录后确认 77/77 通过。

## CLI Dynamic JSON Run Payload 计划

### 目标

让 CLI `run-dynamic --plan-file <reviewed-plan> --approved true --json` 也输出单个干净 JSON payload。当前 dynamic preview 的批准后命令是 CLI fallback 的核心路径，但 `run-dynamic` 没有结构化 JSON run 输出：带 `--json` 时会被解析掉而不保存，执行阶段仍把 workflow events 写到 stdout。修复后，动态 run 和 named run 一样可由脚本直接 `JSON.parse(stdout)`，并返回 `workflow`、`worktree`、`inspection`、`result`、`followUp`、`approvedPlanFile`。

### 实施清单

- [x] 先写失败测试，覆盖 `run-dynamic --json` 输出单个 JSON payload
- [x] 实现 `run-dynamic` 的 JSON/silent payload 模式
- [x] 同步 README / README.zh-CN / Skill 的 CLI dynamic JSON run 说明
- [x] 运行验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs` 失败 1 项；`run-dynamic --plan-file ... --approved true --json` 报 `Invalid argument near --json`，证明 CLI dynamic 批准后执行路径还不能使用结构化 JSON 输出。
- 绿色实现：`CliInput.run-dynamic` 新增 `json`；`run-dynamic` parser 过滤并记录 `--json`；dynamic execution 使用 `configureTraceOutput(..., { silent: input.json })`，事件仍写 trace，stdout 在 JSON 模式下只打印单个 run payload。payload 包含生成的 `workflow.workflowFile`、`workflow.paramFile`、`worktree`、`inspection`、`result`、`followUp`、`approvedPlanFile` 和 `inspection.approvedPlanFile`。
- 兼容实现：`run-dynamic` 中少见的 `run_named` plan 分支也复用 `runNamedWorkflowFromCli(..., { silent: input.json })`，避免 JSON 模式事件污染。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 CLI `run-dynamic --json` 输出单个 run payload，并建议 Codex/scripted fallback 使用 `inspection`、`followUp` 和 `approvedPlanFile`。
- 针对性验证：`npm run build && node --test tests/cli.test.mjs` 通过，40 项通过。
- 核心验证：`npm run build && node --test tests/dynamic-planner.test.mjs tests/cli.test.mjs tests/mcp.test.mjs` 通过，78 项通过。
- 完整验证：`npm test` 通过 122/122；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260609014832 -> 0.1.0+codex.20260609015611`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260609015611`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260609015611/scripts/` 做 dynamic planner / CLI / MCP 回归，使用源码工作区的 TypeScript binary 编译缓存目录后确认 78/78 通过。

## CLI Explicit Run JSON Payload 计划

### 目标

让底层显式 workflow 执行入口 `ultracode run <workflow.json> <param.json> --json` 也输出单个干净 JSON payload。named、dispatch read-only 和 dynamic plan-file 执行都已经支持结构化 run payload；显式 workflow/param JSON 是 legacy/底层入口，但目前带 `--json` 会被当成普通参数或继续输出事件流。修复后，所有 CLI run 类入口都有一致的 `workflow`、`worktree`、`inspection`、`result`、`followUp` 结构。

### 实施清单

- [x] 先写失败测试，覆盖 `run <workflow.json> <param.json> --json` 输出单个 JSON payload
- [x] 实现 explicit run-json 的 JSON/silent payload 模式
- [x] 同步 README / README.zh-CN / Skill 的 explicit run JSON 说明
- [x] 运行验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/cli.test.mjs` 失败 1 项；显式 `run <workflow.json> <param.json> --run-id ... --json` 报 `Invalid argument near --json`，证明底层 run-json 入口还不能使用结构化 JSON 输出。
- 绿色实现：`CliInput.run-json` 新增 `json`；explicit `run` parser 过滤并记录 `--json`；执行分支使用 silent trace，事件仍写入 `trace.jsonl`，JSON 模式 stdout 只打印单个 run payload。payload 包含 `workflow.name`、`workflow.workflowFile`、`workflow.paramFile`、`worktree`、`inspection`、`result` 和 `followUp`。
- 文档同步：README、README.zh-CN 和 Ultracode Skill 已说明 explicit CLI workflow/param execution 带 `--json` 时返回同一类 run payload。
- 针对性验证：`npm run build && node --test tests/cli.test.mjs` 通过，41 项通过。
- 核心验证：`npm run build && node --test tests/dynamic-planner.test.mjs tests/cli.test.mjs tests/mcp.test.mjs` 通过，79 项通过。
- 完整验证：`npm test` 通过 123/123；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260609015611 -> 0.1.0+codex.20260609020128`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260609020128`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260609020128/scripts/` 做 dynamic planner / CLI / MCP 回归，使用源码工作区的 TypeScript binary 编译缓存目录后确认 79/79 通过。

## Plugin Manifest Dependency Wording 计划

### 目标

让插件 manifest 的描述与当前实现一致：Codex Ultracode 不再依赖 vendor 内嵌 Codex binary，也不需要外部 `ultracode` binary；插件通过 Node runner 暴露 MCP/CLI，并在 stage 执行时调用环境中的 `codex` 指令。当前 `.codex-plugin/plugin.json` 仍写着 “local ultracode binary”，容易让用户误以为还有额外二进制依赖。修复后 manifest、验证测试和安装说明保持一致。

### 实施清单

- [x] 先写失败测试，覆盖 manifest 不应暗示 vendor/codex 或 local ultracode binary 依赖
- [x] 修正 `.codex-plugin/plugin.json` 描述文案
- [x] 运行验证、刷新 Codex 安装缓存，并补充 Review

### Review

- 红灯验证：`npm run build && node --test tests/plugin-manifest.test.mjs` 失败 1 项；manifest description 仍包含 `local ultracode binary`，与当前 Node runner + 环境 `codex` 指令实现不一致。
- 绿色实现：`.codex-plugin/plugin.json` 描述改为 packaged Node runner，并说明 stage 通过环境中的 `codex` command 启动；新增 manifest 测试禁止 `vendor`、`aarch64-apple-darwin`、`local ultracode binary` 等误导性依赖暗示，并验证 MCP server 仍使用 `node ./scripts/run-mcp.mjs`。
- 针对性验证：`npm run build && node --test tests/plugin-manifest.test.mjs` 通过，2 项通过。
- 完整验证：`npm test` 通过 125/125；`npm run typecheck` 通过；`validate_plugin.py /Users/chuntao.liao/Github/ai-native/codex-ultracode` 通过。
- 使用 plugin-creator helper 刷新 cachebuster：`0.1.0+codex.20260609020128 -> 0.1.0+codex.20260609020542`。
- 已执行 `codex plugin add codex-ultracode@local`；`codex plugin list --marketplace local` 显示 `codex-ultracode@local` installed/enabled，版本为 `0.1.0+codex.20260609020542`。
- 直接从新缓存 `/Users/chuntao.liao/.codex/plugins/cache/local/codex-ultracode/0.1.0+codex.20260609020542/scripts/` 做 dynamic planner / CLI / MCP / manifest 回归，使用源码工作区的 TypeScript binary 编译缓存目录后确认 81/81 通过。
