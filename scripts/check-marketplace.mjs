import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARKETPLACE_PATH = path.join(ROOT, ".agents", "plugins", "marketplace.json");
const VALID_INSTALLATION_POLICIES = new Set(["NOT_AVAILABLE", "AVAILABLE", "INSTALLED_BY_DEFAULT"]);
const VALID_AUTH_POLICIES = new Set(["ON_INSTALL", "ON_USE"]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertFile(filePath, label) {
  assert(fs.existsSync(filePath), `${label} does not exist: ${path.relative(ROOT, filePath)}`);
  assert(fs.statSync(filePath).isFile(), `${label} is not a file: ${path.relative(ROOT, filePath)}`);
}

function assertDirectory(dirPath, label) {
  assert(fs.existsSync(dirPath), `${label} does not exist: ${path.relative(ROOT, dirPath)}`);
  assert(fs.statSync(dirPath).isDirectory(), `${label} is not a directory: ${path.relative(ROOT, dirPath)}`);
}

function checkMarketplace() {
  assertFile(MARKETPLACE_PATH, "marketplace");
  const marketplace = readJson(MARKETPLACE_PATH);

  assert(marketplace.name === "codex-plugins", "marketplace.name must be codex-plugins");
  assert(marketplace.interface?.displayName === "Codex Plugins", "marketplace displayName must be Codex Plugins");
  assert(Array.isArray(marketplace.plugins), "marketplace.plugins must be an array");
  assert(marketplace.plugins.length > 0, "marketplace must expose at least one plugin");

  const seen = new Set();
  for (const plugin of marketplace.plugins) {
    assert(typeof plugin.name === "string" && plugin.name.length > 0, "plugin name must be set");
    assert(!seen.has(plugin.name), `duplicate plugin entry: ${plugin.name}`);
    seen.add(plugin.name);

    assert(plugin.source?.source === "local", `${plugin.name} must use local source`);
    assert(typeof plugin.source.path === "string", `${plugin.name} source.path must be set`);
    assert(plugin.source.path.startsWith("./plugins/"), `${plugin.name} source.path must live under ./plugins/`);

    const pluginDir = path.join(ROOT, plugin.source.path);
    assertDirectory(pluginDir, `${plugin.name} plugin directory`);

    const manifestPath = path.join(pluginDir, ".codex-plugin", "plugin.json");
    const mcpPath = path.join(pluginDir, ".mcp.json");
    const readmePath = path.join(pluginDir, "README.md");
    const readmeZhPath = path.join(pluginDir, "README.zh-CN.md");

    assertFile(manifestPath, `${plugin.name} manifest`);
    assertFile(mcpPath, `${plugin.name} MCP config`);
    assertFile(readmePath, `${plugin.name} README`);
    assertFile(readmeZhPath, `${plugin.name} Chinese README`);

    const manifest = readJson(manifestPath);
    assert(manifest.name === plugin.name, `${plugin.name} marketplace name must match manifest name`);
    assert(manifest.mcpServers === "./.mcp.json", `${plugin.name} manifest must point to ./.mcp.json`);
    assert(typeof manifest.interface?.displayName === "string", `${plugin.name} displayName must be set`);

    assert(VALID_INSTALLATION_POLICIES.has(plugin.policy?.installation), `${plugin.name} has invalid installation policy`);
    assert(VALID_AUTH_POLICIES.has(plugin.policy?.authentication), `${plugin.name} has invalid authentication policy`);
    assert(typeof plugin.category === "string" && plugin.category.length > 0, `${plugin.name} category must be set`);
  }

  assert(seen.has("claude"), "marketplace must include claude");
  assert(seen.has("codex-ultracode"), "marketplace must include codex-ultracode");

  console.log(`marketplace ok: ${[...seen].join(", ")}`);
}

checkMarketplace();
