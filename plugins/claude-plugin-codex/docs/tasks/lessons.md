# Lessons

- When the user corrects a runtime default, update both implementation and tests so future behavior matches their preferred workflow. For this project, Claude delegation should default to the highest Claude CLI permission mode unless the user explicitly overrides it.
- For home-local Codex plugins, writing `~/.agents/plugins/marketplace.json` is not enough. The installer must also run `codex plugin marketplace add "$HOME"` when possible, otherwise plugin exposure can be inconsistent.
- Codex CLI 0.125.0 does not expose plugin `commands/` files as `/plugin:*` slash commands. Document `$plugin ...` mention-based MCP usage as the supported path unless the installed Codex version proves otherwise.
