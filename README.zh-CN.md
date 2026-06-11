# Codex Plugins

[English](./README.md)

这是我的个人 Codex 插件市场：一个入口，收纳我日常使用的 Codex 扩展能力。

它不是普通的源码合集，而是一个面向 Codex 的插件套件。目标是让 Codex 在一个工作区内组合多种专用能力：
让 Claude 做第二视角审查，让 Codex 跑可追踪的多阶段 workflow，让本地自动化有清晰的产物、状态和版本记录。

## 为什么要做这个仓库

单个上下文窗口不应该承担所有事情。更可靠的做法是把任务拆给清晰、可检查、可复用的工具：

- 需要第二模型判断时，让 Codex 调用本地 Claude CLI
- 需要多阶段执行时，用 Ultracode 把 Codex workflow 落成可重启、可审计的运行记录
- 需要本地自动化时，让每一步都有文件、状态、trace 和最终报告
- 需要安装和更新时，只维护一个插件市场入口

## 一次安装

添加这个插件市场：

```bash
codex plugin marketplace add chuntaojun/codex-plugins --ref main
```

然后重启 Codex。本仓库的 marketplace 会把内置插件标记为默认安装。若你的 Codex 版本仍要求显式安装插件，再运行：

```bash
codex plugin add claude@codex-plugins
codex plugin add codex-ultracode@codex-plugins
```

后续更新：

```bash
codex plugin marketplace upgrade codex-plugins
```

## 插件套件

| 插件 | 用途 | 调用方式 |
| --- | --- | --- |
| `claude` | 在 Codex 中调用本地 Claude CLI，用于审查、质疑、实现和第二模型判断。 | `$claude setup`、`$claude task: review the current diff` |
| `codex-ultracode` | 运行 JSON 定义的多阶段 Codex workflow，支持产物、gate、worktree、命名 workflow 和 MCP 检查工具。 | `$ultracode ...`、`ultracode_run`、`ultracode_status` |

## 内置插件

### Claude

路径：[`plugins/claude-plugin-codex`](./plugins/claude-plugin-codex)

`claude` 是一个 Codex 插件，让 Codex 可以调用本地 Claude Code CLI，并把 Claude 的最终结果带回当前 Codex 会话。适合用于：

- 审查设计、计划或当前未提交 diff
- 在提交前质疑实现方向
- 在同一 workspace 中让 Claude 执行一个聚焦任务
- 在 Codex 和 Claude 之间做快速交叉验证，而不用手动切换工具

依赖：

- 本机可用 `claude` 命令
- Claude CLI 已登录
- Node.js 18.18 或更高版本

首次检查：

```text
$claude setup
```

示例：

```text
$claude task: review the current uncommitted changes and challenge the architecture
```

### Codex Ultracode

路径：[`plugins/codex-ultracode`](./plugins/codex-ultracode)

`codex-ultracode` 是 Codex 的 workflow runner。它把 JSON workflow 变成隔离的多阶段 Codex 运行，并把 trace、status、stage result、review artifact 和 final report 写入磁盘。

适合用于：

- 多阶段调研、审查、debug 和实现计划
- 可 restart / rework 的 stage
- agent 输出后的命令 gate
- 内置命名 workflow，例如 travel guide、deep research、code review、debug/fix
- 通过 MCP 查询 status、tail、report 和 run 记录

示例：

```text
$ultracode run a deep research workflow for this repository
```

## 仓库结构

```text
.agents/plugins/marketplace.json   Codex marketplace 描述文件
plugins/claude-plugin-codex/       Codex 调用 Claude CLI 的插件
plugins/codex-ultracode/           Codex workflow runner 插件
context-kg/tasks/                  本地任务记录与验证历史
```

## 开发验证

验证 Claude 插件：

```bash
cd plugins/claude-plugin-codex
npm test
```

验证 Ultracode：

```bash
cd plugins/codex-ultracode/scripts
npm test
npm run typecheck
```

验证插件 manifest：

```bash
python3 /Users/chuntao.liao/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/claude-plugin-codex
python3 /Users/chuntao.liao/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/codex-ultracode
```

## 说明

- 这个仓库的定位是 Codex 插件市场，不是简单的源码堆叠。
- 每个插件都保持在 `plugins/<plugin-folder>/` 下自包含。
- marketplace 名称是 `codex-plugins`。
- 插件源码通过 `git subtree` 导入，因此仍然保留各自来源历史。
