# Claude Plugin For Codex

[English](./README.md)

在 Codex 里调用 Claude Code CLI，把 Claude 的执行结果返回给当前 Codex agent。

这个插件适合在 Codex 工作流中把某个聚焦任务交给 Claude，例如审查本地方案文件、检查当前未提交代码的实现方向，或让 Claude 在同一个工作区里执行一个具体任务。

## 前置要求

- Node.js 18.18 或更高版本
- Claude Code CLI 可通过 `claude` 命令访问
- Claude CLI 已登录并能在终端中正常使用
- Codex 支持本地插件和本地 MCP server

本地检查 Claude：

```bash
claude --version
claude auth status
```

## 快速安装

运行：

```bash
curl -fsSL https://raw.githubusercontent.com/chuntaojun/claude-plugin-codex/main/install.sh | bash
```

安装脚本会把插件 clone 或更新到：

```text
~/plugins/claude
```

并写入本地 marketplace，同时把这个 marketplace 注册到 Codex：

```text
~/.agents/plugins/marketplace.json
codex plugin marketplace add "$HOME"
```

然后重启 Codex，用插件 mention 方式调用：

```text
$claude setup
```

如果重启后 Codex 仍然没有暴露 Claude 插件，先手动运行一次：

```bash
codex plugin marketplace add "$HOME"
```

然后新开一个 Codex 会话。

可以用环境变量覆盖安装位置：

```bash
CLAUDE_PLUGIN_CODEX_INSTALL_DIR="$HOME/plugins/claude" \
CLAUDE_PLUGIN_CODEX_MARKETPLACE="$HOME/.agents/plugins/marketplace.json" \
curl -fsSL https://raw.githubusercontent.com/chuntaojun/claude-plugin-codex/main/install.sh | bash
```

## 手动安装

Clone 仓库：

```bash
git clone git@github.com:chuntaojun/claude-plugin-codex.git
```

然后按你的 Codex 插件流程，把这个目录注册为本地 Codex plugin。如果走 home-local marketplace，需要确保 marketplace root 已注册：

```bash
codex plugin marketplace add "$HOME"
```

插件根目录就是仓库根目录，Codex 应能发现：

- `.codex-plugin/plugin.json`
- `.mcp.json`

启用后，在 Codex 中运行：

```text
$claude setup
```

## 在 Codex 中使用

在 Codex 里使用 `$claude ...`。这会显式选择 Claude 插件，然后 Codex 可以调用插件暴露的
MCP tools（`claude_setup` 和 `claude_task`），并把 Claude 的结果带回当前 agent。

当前 Codex CLI `0.125.0` 不会把 plugin 里的 `commands/` 文件暴露成 `/claude:*` slash command。
`commands/` 目录保留为兼容或未来命令面的参考材料；当前稳定用法是 `$claude`。

- `$claude setup`：检查 `claude` 是否已安装且可用。
- `$claude task: <prompt>`：调用内置 `claude_task` MCP 工具，在当前工作区运行 `claude --print`，并返回结果。
- `$claude review 当前未提交代码...`：让 Claude 审查当前 staged 和 unstaged git diff，重点看实现合理性。

### 初始化检查

```text
$claude setup
```

建议安装后先运行它，确认 Codex 能访问 Claude CLI。

### 委托任务给 Claude

```text
$claude task: investigate why the tests are failing
$claude task with model sonnet and high effort: analyze docs/tasks/plan.md
$claude task with permission mode acceptEdits: implement the smallest safe fix
```

默认情况下，任务委托使用 Claude 的最高权限路径：

```bash
--permission-mode bypassPermissions --dangerously-skip-permissions
```

如果想降低某次运行的权限，显式传：

```text
$claude task with permission mode default: 做一次只读分析
```

### 审查当前未提交代码

```text
$claude review current uncommitted changes
$claude review current uncommitted changes, focus on whether this is over-engineered
$claude review 当前未提交代码，重点看并发和错误处理是否合理
```

review 请求会让 Claude 检查当前 staged 和 unstaged git diff。它用于审查实现合理性，并明确要求 Claude 不修改文件。

### 分析方案文件

如果文件在当前 workspace 内，直接写相对路径：

```text
$claude 请阅读 docs/tasks/plan.md，分析这个方案的风险、遗漏和更优雅的实现路径
```

如果文件不在当前 workspace 内，建议从包含该文件的项目根目录运行，或直接调用 MCP 工具时把 `cwd` 设成对应项目根目录。

## 运行机制

桥接脚本是：

```text
scripts/claude-companion.mjs
```

它会调用：

```bash
claude --print --output-format json --permission-mode bypassPermissions --dangerously-skip-permissions "<prompt>"
```

支持参数：

- `--model`
- `--effort`
- `--permission-mode`
- `--dangerous`
- `--allowed-tools`
- `--disallowed-tools`
- 可重复的 `--add-dir`

默认会使用最高权限。如果需要降低权限，传显式 `--permission-mode`。

## MCP 工具

插件暴露两个 MCP tool：

- `claude_setup`：检查 Claude CLI 可用性。
- `claude_task`：运行 Claude CLI。必须传当前工作区路径 `cwd`，避免误在插件安装目录里执行。

`claude_task` 示例参数：

```json
{
  "prompt": "Review docs/tasks/plan.md for risks and missing details.",
  "cwd": "/Users/chuntao.liao/Github/my-project"
}
```

可选字段：

- `model`：Claude model 或 alias，例如 `sonnet`
- `effort`：`low`、`medium`、`high`、`xhigh`、`max`
- `permissionMode`：显式 Claude permission mode
- `dangerous`：boolean；为 true 时启用最高权限
- `addDir`：`cwd` 内的额外目录
- `allowedTools` / `disallowedTools`：Claude tool allow/deny 表达式

## 开发

运行测试：

```bash
npm test
```

语法检查：

```bash
node --check scripts/claude-companion.mjs
node --check scripts/claude-mcp-server.mjs
```

检查 Claude 可用性：

```bash
node scripts/claude-companion.mjs setup --json
```

## 仓库结构

```text
.codex-plugin/plugin.json     Codex plugin manifest
.mcp.json                     本地 MCP server 注册
commands/                     参考命令提示；Codex CLI 0.125.0 不会暴露为 /claude:*
scripts/claude-companion.mjs  Claude CLI 桥接脚本
scripts/claude-mcp-server.mjs MCP stdio server，暴露 claude_setup/claude_task
tests/                        Node 测试和 fake Claude fixture
```
