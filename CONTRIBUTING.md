# Contributing

This repository is a Codex plugin marketplace. Treat the marketplace contract as the public API.

## Repository Rules

- Marketplace entries live in `.agents/plugins/marketplace.json`.
- Installable plugins live under `plugins/<plugin-folder>/`.
- Each plugin must keep its own `.codex-plugin/plugin.json` and `.mcp.json`.
- The marketplace plugin `name` must match the plugin manifest `name`.
- Root documentation should describe marketplace installation first.
- Plugin-specific READMEs may describe standalone installation, but it should not be the primary path for this repository.

## Validation

Run the full validation before pushing:

```bash
npm test
```

Run focused checks when iterating:

```bash
npm run check:marketplace
npm run test:claude
npm run test:ultracode
npm run typecheck:ultracode
```

When editing plugin manifests, also run:

```bash
python3 /Users/chuntao.liao/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/claude-plugin-codex
python3 /Users/chuntao.liao/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/codex-ultracode
```

## Adding A Plugin

1. Place the plugin under `plugins/<plugin-folder>/`.
2. Ensure the plugin has `.codex-plugin/plugin.json`.
3. Add the plugin to `.agents/plugins/marketplace.json`.
4. Run `npm run check:marketplace`.
5. Add or update README sections in both English and Chinese.
6. Run `npm test`.

## Updating Imported Plugins

Plugin histories were imported with `git subtree`. Keep the same directory boundaries when syncing
from a source repository. Avoid moving plugin internals unless the plugin itself requires it.
