import path from "node:path";
import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { buildEnv, installFakeClaude } from "./fake-claude-fixture.mjs";
import { makeTempDir, run } from "./helpers.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts", "claude-companion.mjs");
const MCP_SERVER = path.join(ROOT, "scripts", "claude-mcp-server.mjs");

function readJsonLine(child) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for MCP response.")), 3000);
    child.stdout.on("data", function onData(chunk) {
      buffer += chunk.toString("utf8");
      const newline = buffer.indexOf("\n");
      if (newline === -1) {
        return;
      }
      child.stdout.off("data", onData);
      clearTimeout(timeout);
      resolve(JSON.parse(buffer.slice(0, newline)));
    });
  });
}

async function sendMcp(child, message) {
  const response = readJsonLine(child);
  child.stdin.write(`${JSON.stringify(message)}\n`);
  return response;
}

function waitForNoMcpResponse(child, message) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      settled = true;
      resolve();
    }, 150);
    child.stdout.once("data", (chunk) => {
      if (settled) {
        return;
      }
      clearTimeout(timeout);
      reject(new Error(`Unexpected MCP response: ${chunk.toString("utf8")}`));
    });
    child.stdin.write(`${JSON.stringify(message)}\n`);
  });
}

test("setup reports ready when claude is available", () => {
  const binDir = makeTempDir();
  installFakeClaude(binDir);

  const result = run("node", [SCRIPT, "setup", "--json"], {
    cwd: ROOT,
    env: buildEnv(binDir)
  });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ready, true);
  assert.equal(payload.claude.available, true);
  assert.match(payload.claude.version, /1\.2\.3-test/);
});

test("task invokes claude print mode and renders the final result", () => {
  const binDir = makeTempDir();
  installFakeClaude(binDir);

  const result = run("node", [SCRIPT, "task", "--model", "sonnet", "--effort", "medium", "fix the bug"], {
    cwd: ROOT,
    env: buildEnv(binDir)
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Claude handled: fix the bug/);
  assert.match(result.stdout, /Session: claude-session-123/);
});

test("task returns json payload with raw claude metadata", () => {
  const binDir = makeTempDir();
  installFakeClaude(binDir);

  const result = run("node", [SCRIPT, "task", "--json", "--permission-mode", "acceptEdits", "inspect"], {
    cwd: ROOT,
    env: buildEnv(binDir)
  });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 0);
  assert.equal(payload.rawOutput, "Claude handled: inspect");
  assert.equal(payload.sessionId, "claude-session-123");
  assert.deepEqual(payload.claude.args.slice(0, 5), [
    "--print",
    "--output-format",
    "json",
    "--permission-mode",
    "acceptEdits"
  ]);
});

test("task defaults to Claude highest permission mode", () => {
  const binDir = makeTempDir();
  installFakeClaude(binDir);

  const result = run("node", [SCRIPT, "task", "--json", "inspect"], {
    cwd: ROOT,
    env: buildEnv(binDir)
  });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.deepEqual(payload.claude.args.slice(0, 6), [
    "--print",
    "--output-format",
    "json",
    "--permission-mode",
    "bypassPermissions",
    "--dangerously-skip-permissions"
  ]);
});

test("task reads prompt from piped stdin", () => {
  const binDir = makeTempDir();
  installFakeClaude(binDir);

  const result = run("node", [SCRIPT, "task"], {
    cwd: ROOT,
    env: buildEnv(binDir),
    input: "summarize from stdin"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Claude handled: summarize from stdin/);
});

test("task preserves plain text output when claude does not emit json", () => {
  const binDir = makeTempDir();
  installFakeClaude(binDir, "plain-text");

  const result = run("node", [SCRIPT, "task", "plain mode"], {
    cwd: ROOT,
    env: buildEnv(binDir)
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Plain Claude response for: plain mode/);
});

test("mcp server lists setup and task tools", async () => {
  const binDir = makeTempDir();
  installFakeClaude(binDir);
  const child = spawn(process.execPath, [MCP_SERVER], {
    cwd: ROOT,
    env: buildEnv(binDir),
    stdio: ["pipe", "pipe", "pipe"]
  });

  try {
    const init = await sendMcp(child, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "0" } }
    });
    assert.equal(init.result.serverInfo.name, "claude-plugin-codex");

    const tools = await sendMcp(child, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {}
    });
    assert.deepEqual(
      tools.result.tools.map((tool) => tool.name),
      ["claude_setup", "claude_task"]
    );
  } finally {
    child.kill();
  }
});

test("mcp server claude_task returns claude output to caller", async () => {
  const binDir = makeTempDir();
  installFakeClaude(binDir);
  const child = spawn(process.execPath, [MCP_SERVER], {
    cwd: ROOT,
    env: buildEnv(binDir),
    stdio: ["pipe", "pipe", "pipe"]
  });

  try {
    await sendMcp(child, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "0" } }
    });
    const response = await sendMcp(child, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "claude_task",
        arguments: {
          prompt: "mcp task",
          cwd: ROOT
        }
      }
    });

    assert.equal(response.result.isError, false);
    assert.match(response.result.content[0].text, /Claude handled: mcp task/);
    assert.equal(response.result.structuredContent.sessionId, "claude-session-123");
    assert.deepEqual(response.result.structuredContent.claude.args.slice(0, 6), [
      "--print",
      "--output-format",
      "json",
      "--permission-mode",
      "bypassPermissions",
      "--dangerously-skip-permissions"
    ]);
  } finally {
    child.kill();
  }
});

test("mcp server rejects non-boolean dangerous argument", async () => {
  const binDir = makeTempDir();
  installFakeClaude(binDir);
  const child = spawn(process.execPath, [MCP_SERVER], {
    cwd: ROOT,
    env: buildEnv(binDir),
    stdio: ["pipe", "pipe", "pipe"]
  });

  try {
    await sendMcp(child, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "0" } }
    });
    const response = await sendMcp(child, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "claude_task",
        arguments: {
          prompt: "mcp task",
          cwd: ROOT,
          dangerous: "false"
        }
      }
    });

    assert.equal(response.result.isError, true);
    assert.match(response.result.content[0].text, /dangerous must be a boolean/);
  } finally {
    child.kill();
  }
});

test("mcp server normalizes relative cwd only once", async () => {
  const binDir = makeTempDir();
  installFakeClaude(binDir);
  const workspace = makeTempDir();
  const subdir = path.join(workspace, "subdir");
  fs.mkdirSync(subdir);
  const child = spawn(process.execPath, [MCP_SERVER], {
    cwd: workspace,
    env: buildEnv(binDir),
    stdio: ["pipe", "pipe", "pipe"]
  });

  try {
    await sendMcp(child, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "0" } }
    });
    const response = await sendMcp(child, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "claude_task",
        arguments: {
          prompt: "relative cwd",
          cwd: "subdir"
        }
      }
    });

    assert.equal(response.result.isError, false);
    assert.equal(
      fs.realpathSync(response.result.structuredContent.claude.cwd),
      fs.realpathSync(subdir)
    );
  } finally {
    child.kill();
  }
});

test("mcp server supports ping and ignores unknown notifications", async () => {
  const binDir = makeTempDir();
  installFakeClaude(binDir);
  const child = spawn(process.execPath, [MCP_SERVER], {
    cwd: ROOT,
    env: buildEnv(binDir),
    stdio: ["pipe", "pipe", "pipe"]
  });

  try {
    const init = await sendMcp(child, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "0" } }
    });
    assert.equal(init.result.protocolVersion, "2025-11-25");

    const ping = await sendMcp(child, {
      jsonrpc: "2.0",
      id: 2,
      method: "ping",
      params: {}
    });
    assert.deepEqual(ping.result, {});

    await waitForNoMcpResponse(child, {
      jsonrpc: "2.0",
      method: "notifications/cancelled",
      params: { requestId: 99, reason: "test" }
    });
  } finally {
    child.kill();
  }
});
