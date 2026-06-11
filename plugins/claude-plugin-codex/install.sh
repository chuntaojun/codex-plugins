#!/usr/bin/env bash
set -euo pipefail

REPO_SSH_URL="${CLAUDE_PLUGIN_CODEX_REPO:-git@github.com:chuntaojun/claude-plugin-codex.git}"
PLUGIN_NAME="claude"
INSTALL_ROOT="${CLAUDE_PLUGIN_CODEX_INSTALL_ROOT:-$HOME/plugins}"
INSTALL_DIR="${CLAUDE_PLUGIN_CODEX_INSTALL_DIR:-$INSTALL_ROOT/$PLUGIN_NAME}"
MARKETPLACE_PATH="${CLAUDE_PLUGIN_CODEX_MARKETPLACE:-$HOME/.agents/plugins/marketplace.json}"
SKIP_CODEX_MARKETPLACE_ADD="${CLAUDE_PLUGIN_CODEX_SKIP_CODEX_MARKETPLACE_ADD:-0}"

log() {
  printf '[claude-plugin-codex] %s\n' "$*"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

install_or_update_repo() {
  mkdir -p "$(dirname "$INSTALL_DIR")"

  if [ -d "$INSTALL_DIR/.git" ]; then
    log "Updating $INSTALL_DIR"
    git -C "$INSTALL_DIR" fetch --prune origin
    git -C "$INSTALL_DIR" checkout main
    git -C "$INSTALL_DIR" pull --ff-only origin main
    return
  fi

  if [ -e "$INSTALL_DIR" ]; then
    printf 'Install path exists but is not a git checkout: %s\n' "$INSTALL_DIR" >&2
    printf 'Move it aside or set CLAUDE_PLUGIN_CODEX_INSTALL_DIR to another path.\n' >&2
    exit 1
  fi

  log "Cloning $REPO_SSH_URL to $INSTALL_DIR"
  git clone "$REPO_SSH_URL" "$INSTALL_DIR"
}

update_marketplace() {
  mkdir -p "$(dirname "$MARKETPLACE_PATH")"

  MARKETPLACE_PATH="$MARKETPLACE_PATH" INSTALL_DIR="$INSTALL_DIR" node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const marketplacePath = process.env.MARKETPLACE_PATH;
const installDir = process.env.INSTALL_DIR;
const marketplaceDir = path.dirname(marketplacePath);

function usesCodexHomeMarketplaceConvention(marketplacePath, installDir) {
  const marketplaceParts = path.normalize(marketplacePath).split(path.sep);
  const installParts = path.normalize(installDir).split(path.sep);
  return (
    marketplaceParts.at(-1) === 'marketplace.json' &&
    marketplaceParts.at(-2) === 'plugins' &&
    marketplaceParts.at(-3) === '.agents' &&
    installParts.at(-2) === 'plugins'
  );
}

let sourcePath;
if (usesCodexHomeMarketplaceConvention(marketplacePath, installDir)) {
  sourcePath = `./plugins/${path.basename(installDir)}`;
} else {
  const relativePluginPath = path.relative(marketplaceDir, installDir).replaceAll(path.sep, '/');
  sourcePath = relativePluginPath.startsWith('.') ? relativePluginPath : `./${relativePluginPath}`;
}

let marketplace;
if (fs.existsSync(marketplacePath)) {
  marketplace = JSON.parse(fs.readFileSync(marketplacePath, 'utf8'));
} else {
  marketplace = {
    name: 'local',
    interface: {
      displayName: 'Local Plugins'
    },
    plugins: []
  };
}

if (!Array.isArray(marketplace.plugins)) {
  marketplace.plugins = [];
}

const entry = {
  name: 'claude',
  source: {
    source: 'local',
    path: sourcePath
  },
  policy: {
    installation: 'AVAILABLE',
    authentication: 'ON_INSTALL'
  },
  category: 'Coding'
};

const index = marketplace.plugins.findIndex((plugin) => plugin.name === entry.name);
if (index >= 0) {
  marketplace.plugins[index] = entry;
} else {
  marketplace.plugins.push(entry);
}

fs.writeFileSync(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`);
NODE
}

codex_marketplace_root() {
  MARKETPLACE_PATH="$MARKETPLACE_PATH" node <<'NODE'
const path = require('node:path');

const marketplacePath = path.resolve(process.env.MARKETPLACE_PATH);
const marketplaceFile = path.basename(marketplacePath);
const pluginsDir = path.dirname(marketplacePath);
const agentsDir = path.dirname(pluginsDir);

if (
  marketplaceFile === 'marketplace.json' &&
  path.basename(pluginsDir) === 'plugins' &&
  path.basename(agentsDir) === '.agents'
) {
  process.stdout.write(path.dirname(agentsDir));
}
NODE
}

register_codex_marketplace() {
  if [ "$SKIP_CODEX_MARKETPLACE_ADD" = "1" ]; then
    log "Skipped Codex marketplace registration because CLAUDE_PLUGIN_CODEX_SKIP_CODEX_MARKETPLACE_ADD=1"
    return
  fi

  local marketplace_root
  marketplace_root="$(codex_marketplace_root)"

  if [ -z "$marketplace_root" ]; then
    log "Skipped Codex marketplace registration for non-standard marketplace path: $MARKETPLACE_PATH"
    log "To register manually, keep marketplace.json at <root>/.agents/plugins/marketplace.json and run: codex plugin marketplace add <root>"
    return
  fi

  if ! command -v codex >/dev/null 2>&1; then
    log "Codex CLI was not found on PATH. Register the marketplace later with:"
    log "codex plugin marketplace add \"$marketplace_root\""
    return
  fi

  codex plugin marketplace add "$marketplace_root"
}

main() {
  require_command git
  require_command node

  install_or_update_repo
  update_marketplace
  register_codex_marketplace

  log "Installed plugin at $INSTALL_DIR"
  log "Updated marketplace at $MARKETPLACE_PATH"

  if command -v claude >/dev/null 2>&1; then
    log "Claude CLI: $(claude --version 2>/dev/null || printf 'installed')"
  else
    log "Claude CLI was not found on PATH. Install Claude Code before using \$claude requests."
  fi

  cat <<EOF

Next steps:
1. Restart Codex or start a new session so it reloads plugin marketplaces.
2. Install or enable the "Claude" plugin from the local marketplace if Codex does not auto-enable it.
3. Run:

   \$claude setup

If the Claude plugin still does not appear, run:

   codex plugin marketplace add "$HOME"

EOF
}

main "$@"
