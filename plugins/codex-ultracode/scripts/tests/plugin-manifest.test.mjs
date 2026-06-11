import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "../..");

test("plugin manifest describes the Node runner without implying bundled Codex binaries", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(pluginRoot, ".codex-plugin/plugin.json"), "utf8"),
  );
  const searchableText = [
    manifest.description,
    manifest.interface?.shortDescription,
    manifest.interface?.longDescription,
    ...(manifest.interface?.defaultPrompt ?? []),
  ].join("\n");

  assert.doesNotMatch(searchableText, /vendor/i);
  assert.doesNotMatch(searchableText, /aarch64-apple-darwin/i);
  assert.doesNotMatch(searchableText, /local ultracode binary/i);
  assert.match(searchableText, /Node/i);
  assert.match(searchableText, /\bcodex\b/i);
});

test("plugin MCP server uses the packaged Node entrypoint", () => {
  const mcpConfig = JSON.parse(fs.readFileSync(path.join(pluginRoot, ".mcp.json"), "utf8"));
  assert.deepEqual(mcpConfig.mcpServers.ultracode, {
    command: "node",
    args: ["./scripts/run-mcp.mjs"],
    cwd: ".",
  });
});
