# Codex Plugins

[English](./README.md)

一个面向 Codex 的个人插件市场，用来承载我的 AI-native 工程工具栈。

`codex-plugins` 不是随机堆放插件的 monorepo，而是一个可安装、可验证、可持续维护的 Codex 插件套件：一个 marketplace 入口，两个互补插件，一条根目录验证命令。它的目标是让 Codex 不只停留在单个聊天窗口里，而是能委托、交叉审查、运行结构化 workflow，并留下可检查的本地产物。

## 安装

添加一次 marketplace：

```bash
codex plugin marketplace add chuntaojun/codex-plugins --ref main
```

添加或升级 marketplace 后，重启 Codex。

本仓库会把内置插件标记为默认安装。如果你的 Codex 版本仍需要显式安装插件，运行：

```bash
codex plugin add claude@codex-plugins
codex plugin add codex-ultracode@codex-plugins
```

后续更新：

```bash
codex plugin marketplace upgrade codex-plugins
```

## 你会得到什么

| 插件 | 定位 | 适用场景 |
| --- | --- | --- |
| `claude` | Codex 调用 Claude 的桥接插件 | 需要 Claude 在 Codex 内做审查、质疑、实现或第二模型判断。 |
| `codex-ultracode` | Codex workflow runner | 需要可复用的多阶段 Codex 运行、命名 workflow、产物、gate、运行状态和 restart/rework 控制。 |

组合起来，它们让 Codex 更像一个本地工程驾驶舱：

- **跨模型委托**：不离开 Codex，就能让 Claude 做聚焦分析或审查。
- **结构化执行**：把 Codex 任务变成有阶段、有产物、有状态的 workflow。
- **可审计自动化**：prompt、input、output、trace、report 和验证命令都落盘。
- **单一安装入口**：添加一个 marketplace，维护整套插件。

## 快速开始

检查 Claude 桥接：

```text
$claude setup
```

让 Claude 做第二视角审查：

```text
$claude task: review the current uncommitted changes and challenge the architecture
```

运行 Ultracode workflow：

```text
$ultracode run a deep research workflow for this repository
```

通过 MCP 工具查看 Ultracode 运行结果：

```text
$ultracode show recent run status and final report
```

## 插件详情

### Claude

路径：[`plugins/claude-plugin-codex`](./plugins/claude-plugin-codex)

`claude` 让 Codex 调用本地 Claude Code CLI，并把 Claude 的最终结果带回当前 Codex 会话。

依赖：

- Node.js 18.18 或更高版本
- 本机可通过 `claude` 命令访问 Claude Code CLI
- Claude 已在终端登录并可正常使用

常用请求：

```text
$claude setup
$claude task: inspect docs/tasks/plan.md and find risks
$claude review current uncommitted changes, focus on over-engineering
```

### Codex Ultracode

路径：[`plugins/codex-ultracode`](./plugins/codex-ultracode)

`codex-ultracode` 运行 JSON 定义或命名的多阶段 Codex workflow。它会把 stage input、prompt、Codex events、output、status 和 final report 写入 `.ultracode/runs/`。

内置 workflow 家族包括：

- `deep-research`
- `code-review`
- `debug-fix`
- `travel-guide`

常用请求：

```text
$ultracode list available workflows
$ultracode run code-review for the current branch
$ultracode run debug-fix for the failing npm test case
```

## 仓库结构

```text
.agents/plugins/marketplace.json   Codex 读取的 marketplace 描述文件
plugins/claude-plugin-codex/       Codex 调 Claude CLI 的插件
plugins/codex-ultracode/           Codex 插件和 workflow runner
scripts/check-marketplace.mjs      根目录 marketplace 一致性检查
context-kg/tasks/                  本地任务计划与 Review 记录
```

## 开发

在根目录运行完整验证：

```bash
npm test
```

它会依次运行：

- marketplace 一致性检查
- `plugins/claude-plugin-codex` 测试
- `plugins/codex-ultracode/scripts` 测试
- Ultracode TypeScript 类型检查

单独命令：

```bash
npm run check:marketplace
npm run test:claude
npm run test:ultracode
npm run typecheck:ultracode
```

修改插件元数据时，额外运行 manifest 校验：

```bash
python3 /Users/chuntao.liao/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/claude-plugin-codex
python3 /Users/chuntao.liao/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/codex-ultracode
```

## 维护约定

- marketplace entry 统一放在 `.agents/plugins/marketplace.json`。
- 每个插件保持在 `plugins/<plugin-folder>/` 下自包含。
- marketplace 名称保持为 `codex-plugins`，安装命令依赖这个名字。
- 推送前优先运行根目录 `npm test`。
- 插件历史通过 `git subtree` 导入；后续同步上游时继续保持相同目录边界。
