# Claude Plugin For Codex

[中文说明](./README.zh-CN.md)

Use Claude CLI from inside Codex and return Claude's final result to the current Codex agent.

This plugin is useful when you want Codex to delegate a focused pass to Claude Code, such as
reviewing a local plan file, checking the implementation direction of uncommitted changes, or
asking Claude to execute a task from the same workspace.

## Requirements

- Node.js 18.18 or later
- Claude Code CLI available as `claude`
- Claude CLI authenticated and usable from your terminal
- Codex plugin support with local MCP servers enabled

Check Claude locally:

```bash
claude --version
claude auth status
```

## Quick Install

Run:

```bash
curl -fsSL https://raw.githubusercontent.com/chuntaojun/claude-plugin-codex/main/install.sh | bash
```

The installer clones or updates the plugin at `~/plugins/claude`, writes the local marketplace entry, and registers that marketplace with Codex:

```text
~/.agents/plugins/marketplace.json
codex plugin marketplace add "$HOME"
```

Then restart Codex and invoke the plugin with Codex's plugin mention syntax:

```text
$claude setup
```

If Codex does not expose the Claude plugin after restart, run this once and start a new Codex session:

```bash
codex plugin marketplace add "$HOME"
```

You can override install locations:

```bash
CLAUDE_PLUGIN_CODEX_INSTALL_DIR="$HOME/plugins/claude" \
CLAUDE_PLUGIN_CODEX_MARKETPLACE="$HOME/.agents/plugins/marketplace.json" \
curl -fsSL https://raw.githubusercontent.com/chuntaojun/claude-plugin-codex/main/install.sh | bash
```

## Manual Install

Clone the plugin:

```bash
git clone git@github.com:chuntaojun/claude-plugin-codex.git
```

Install or register the cloned folder as a local Codex plugin using your Codex plugin workflow.
For a home-local install, ensure the marketplace root is registered:

```bash
codex plugin marketplace add "$HOME"
```

The plugin root is the repository root. Codex should discover:

- `.codex-plugin/plugin.json`
- `.mcp.json`

After enabling the plugin, verify it from Codex:

```text
$claude setup
```

## Usage From Codex

Use `$claude ...` in Codex. That explicitly selects this plugin, then Codex can call the bundled
MCP tools (`claude_setup` and `claude_task`) and return Claude's result into the current agent.

Current Codex CLI `0.125.0` does not expose plugin `commands/` files as `/claude:*` slash commands.
The `commands/` directory is kept as reference material for compatible or future command surfaces,
but the supported invocation path is `$claude`.

- `$claude setup` checks whether `claude` is installed and available.
- `$claude task: <prompt>` calls the bundled `claude_task` MCP tool, runs `claude --print` in the current workspace, and returns the result.
- `$claude review current uncommitted changes...` asks Claude to review current staged and unstaged git changes for implementation reasonableness.

### Setup

```text
$claude setup
```

Use this first. It checks whether Codex can reach the Claude CLI.

### Delegate A Task

```text
$claude task: investigate why the tests are failing
$claude task with model sonnet and high effort: analyze docs/tasks/plan.md
$claude task with permission mode acceptEdits: implement the smallest safe fix
```

By default, task delegation uses Claude's highest permission path:

```bash
--permission-mode bypassPermissions --dangerously-skip-permissions
```

Pass `--permission-mode <mode>` only when you want to lower permissions for a run.

### Review Current Uncommitted Changes

```text
$claude review current uncommitted changes
$claude review current uncommitted changes, focus on whether this is over-engineered
$claude review 当前未提交代码，重点看并发和错误处理是否合理
```

The review request asks Claude to inspect the current staged and unstaged git diff. It is intended
for implementation-reasonableness review and tells Claude not to modify files.

### Analyze A File

For files inside the current workspace, use a relative path:

```text
$claude 请阅读 docs/tasks/plan.md，分析这个方案的风险、遗漏和更优雅的实现路径
```

For files outside the current workspace, run the tool from that file's project root or pass that
directory as the `cwd` when calling the MCP tool directly.

## Runtime

The bridge script lives at `scripts/claude-companion.mjs`. It invokes Claude with:

```bash
claude --print --output-format json --permission-mode bypassPermissions --dangerously-skip-permissions "<prompt>"
```

It accepts `--model`, `--effort`, `--permission-mode`, `--dangerous`, `--allowed-tools`, `--disallowed-tools`, and repeatable `--add-dir`. By default it runs Claude with `--permission-mode bypassPermissions --dangerously-skip-permissions`. Pass an explicit `--permission-mode` when you want to lower permissions for a run.

`--dangerous` maps to Claude's `--dangerously-skip-permissions` and `--permission-mode bypassPermissions`; use it only for trusted workspaces.

## MCP Tools

The plugin also exposes:

- `claude_setup`: checks Claude CLI availability.
- `claude_task`: runs Claude CLI. Pass the current workspace path as `cwd`; this avoids accidentally running Claude in the plugin installation directory. `cwd` must resolve to an existing directory, and `addDir` entries must stay inside that `cwd`.

Example `claude_task` arguments:

```json
{
  "prompt": "Review docs/tasks/plan.md for risks and missing details.",
  "cwd": "/Users/chuntao.liao/Github/my-project"
}
```

Optional fields:

- `model`: Claude model or alias, such as `sonnet`
- `effort`: `low`, `medium`, `high`, `xhigh`, or `max`
- `permissionMode`: explicit Claude permission mode
- `dangerous`: boolean; enables highest permission mode when true
- `addDir`: additional directories inside `cwd`
- `allowedTools` / `disallowedTools`: Claude tool allow/deny expressions

## Development

Run tests:

```bash
npm test
```

Run syntax checks:

```bash
node --check scripts/claude-companion.mjs
node --check scripts/claude-mcp-server.mjs
```

Smoke check Claude availability:

```bash
node scripts/claude-companion.mjs setup --json
```

## Repository Layout

```text
.codex-plugin/plugin.json     Codex plugin manifest
.mcp.json                     Local MCP server registration
commands/                     Reference command prompts; not exposed as /claude:* in Codex CLI 0.125.0
scripts/claude-companion.mjs  Claude CLI bridge
scripts/claude-mcp-server.mjs MCP stdio server exposing claude_setup/claude_task
tests/                        Node test suite and fake Claude fixture
```
