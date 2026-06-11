# Claude Plugin For Codex Task Plan

## Plan

- [x] Inspect current repository state and confirm it is an empty plugin workspace.
- [x] Inspect `../codex-plugin-cc` for plugin layout, CLI bridge design, commands, and tests.
- [x] Write failing tests for the Claude companion CLI behavior.
- [x] Implement a Codex plugin skeleton and Claude companion script.
- [x] Add command prompt templates that route through Claude MCP tools where supported.
- [x] Add user-facing README and setup guidance.
- [x] Run verification: targeted tests, full test suite, and metadata smoke checks.
- [x] Address code review feedback: strict MCP argument validation, safer permissions, protocol fixes, cwd normalization, and spawn-error reporting.
- [x] Add a review prompt template for implementation review of current uncommitted git changes.
- [x] Polish README with install, usage, runtime, MCP, and development instructions before publishing.
- [x] Add quick install script for local Codex plugin marketplace registration.
- [x] Add Chinese README.
- [x] Diagnose local slash command registration failure and register the home-local marketplace source through Codex CLI.
- [x] Re-check Codex plugin design and document `$claude` as the supported invocation path.

## Review

- Implemented root-level Codex plugin metadata in `.codex-plugin/plugin.json`.
- Added `.mcp.json` and `scripts/claude-mcp-server.mjs` so Codex can call Claude through MCP tools without relying on an unproven plugin-root environment variable.
- Added `scripts/claude-companion.mjs` for direct CLI usage and MCP reuse.
- Added setup and task command prompt templates that route through `claude_setup` and `claude_task` where the host supports plugin command files.
- Added README usage guidance and tests with a fake Claude CLI fixture.
- Verification passed:
  - `npm test` => 14/14 passing
  - `node --check scripts/claude-companion.mjs` => exit 0
  - `node --check scripts/claude-mcp-server.mjs` => exit 0
  - `node scripts/claude-companion.mjs setup --json` => ready with Claude Code 2.1.122
- Code review follow-up:
  - Strictly validates MCP argument types, including `dangerous`.
  - Defaults Claude permission mode to highest permissions: `bypassPermissions` plus `--dangerously-skip-permissions`; lower permission modes must be explicit.
  - Normalizes `cwd` once and requires it to be an existing directory.
  - Restricts `addDir` to paths inside `cwd`.
  - Implements MCP `ping`, protocol-version echo for supported versions, one-way notification handling, and clearer spawn-error reporting.
- User correction follow-up:
  - Updated default Claude task execution to highest permission mode in both direct companion and MCP tool paths.
  - Added regression coverage for the highest-permission default.
- Review prompt follow-up:
  - Added a review prompt template to review current staged and unstaged git changes for implementation reasonableness.
  - The review shortcut explicitly uses `permissionMode: default` so review does not edit files.
- Publishing follow-up:
  - Added `.gitignore` and MIT `LICENSE`.
  - Expanded README with requirements, install notes, command examples, MCP tool arguments, and development checks.
- Installer follow-up:
  - Added `install.sh` for `curl | bash` quick install.
  - The installer clones or updates the plugin, writes a plugin-creator-compatible local marketplace entry, and prints restart plus `$claude setup` instructions.
  - Added tests that execute the installer against a temporary bare repo and verify the generated marketplace entry.
- Documentation follow-up:
  - Added `README.zh-CN.md` and linked it from the English README.
- Slash command registration follow-up:
  - Root cause: the installer wrote `~/.agents/plugins/marketplace.json`, but did not also run `codex plugin marketplace add "$HOME"`, so Codex could have an enabled MCP plugin cache without a fully registered local marketplace source.
  - Updated the installer to register the home-local marketplace root with Codex when `codex` is available.
  - Updated English and Chinese docs with the manual registration command and `$claude setup` MCP fallback.
- Codex 0.125.0 plugin design follow-up:
  - Verified the plugin manifest schema exposes `skills`, `hooks`, `mcpServers`, and `apps`, but not a `commands` manifest field.
  - Verified the current Codex CLI plugin command surface only manages marketplaces.
  - Updated docs and installer output to make `$claude ...` the supported usage path and mark `commands/` as reference material only.
