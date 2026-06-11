#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const COMPANION_SCRIPT = path.join(ROOT_DIR, "scripts", "claude-companion.mjs");
const SUPPORTED_PROTOCOL_VERSIONS = new Set(["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"]);
const DEFAULT_PROTOCOL_VERSION = "2025-11-25";

const TOOLS = [
  {
    name: "claude_setup",
    description: "Check whether Claude CLI is installed and usable from Codex.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: {
          type: "string",
          description: "Workspace directory to check from. Defaults to the MCP server current directory."
        }
      },
      additionalProperties: false
    }
  },
  {
    name: "claude_task",
    description: "Ask Claude CLI to execute an arbitrary task and return Claude's final result.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Task prompt to send to Claude."
        },
        cwd: {
          type: "string",
          description: "Current Codex workspace directory Claude should run in."
        },
        model: {
          type: "string",
          description: "Optional Claude model or alias, such as sonnet or opus."
        },
        effort: {
          type: "string",
          enum: ["low", "medium", "high", "xhigh", "max"],
          description: "Optional Claude effort level."
        },
        permissionMode: {
          type: "string",
          enum: ["acceptEdits", "auto", "bypassPermissions", "default", "dontAsk", "plan"],
          description: "Claude permission mode. Defaults to default."
        },
        dangerous: {
          type: "boolean",
          description: "Use Claude's bypass permissions mode. Only use in trusted workspaces."
        },
        addDir: {
          type: "array",
          items: { type: "string" },
          description: "Additional directories to allow Claude to access."
        },
        allowedTools: {
          type: "string",
          description: "Claude allowed tools expression."
        },
        disallowedTools: {
          type: "string",
          description: "Claude disallowed tools expression."
        }
      },
      required: ["prompt", "cwd"],
      additionalProperties: false
    }
  }
];

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function errorResponse(id, code, message) {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message
    }
  };
}

function runCompanion(args, cwd) {
  try {
    return spawnSync(process.execPath, [COMPANION_SCRIPT, ...args], {
      cwd: cwd || process.cwd(),
      env: process.env,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 20 * 1024 * 1024
    });
  } catch (error) {
    return {
      status: 1,
      stdout: "",
      stderr: "",
      error
    };
  }
}

function parseJsonOutput(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

function contentResult(text, structuredContent = {}, isError = false) {
  return {
    content: [
      {
        type: "text",
        text
      }
    ],
    structuredContent,
    isError
  };
}

function requireString(input, key) {
  if (typeof input[key] !== "string" || !input[key].trim()) {
    throw new Error(`${key} must be a non-empty string.`);
  }
  return input[key];
}

function optionalString(input, key) {
  if (!(key in input) || input[key] == null) {
    return null;
  }
  if (typeof input[key] !== "string") {
    throw new Error(`${key} must be a string.`);
  }
  return input[key];
}

function optionalBoolean(input, key) {
  if (!(key in input) || input[key] == null) {
    return null;
  }
  if (typeof input[key] !== "boolean") {
    throw new Error(`${key} must be a boolean.`);
  }
  return input[key];
}

function normalizeDirectory(directory, baseDir = process.cwd()) {
  const resolved = path.resolve(baseDir, directory);
  let realpath;
  try {
    realpath = fs.realpathSync(resolved);
  } catch (error) {
    throw new Error(`Directory does not exist: ${resolved}`);
  }
  if (!fs.statSync(realpath).isDirectory()) {
    throw new Error(`Path is not a directory: ${realpath}`);
  }
  return realpath;
}

function isInsideOrEqual(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function normalizeAddDirs(input, cwd) {
  if (!(("addDir" in input)) || input.addDir == null) {
    return [];
  }
  if (!Array.isArray(input.addDir)) {
    throw new Error("addDir must be an array of strings.");
  }
  return input.addDir.map((entry) => {
    if (typeof entry !== "string" || !entry.trim()) {
      throw new Error("addDir must be an array of non-empty strings.");
    }
    const normalized = normalizeDirectory(entry, cwd);
    if (!isInsideOrEqual(normalized, cwd)) {
      throw new Error(`addDir must stay inside cwd: ${entry}`);
    }
    return normalized;
  });
}

function buildTaskArgs(input) {
  const cwd = normalizeDirectory(requireString(input, "cwd"));
  const addDirs = normalizeAddDirs(input, cwd);
  const prompt = requireString(input, "prompt");
  const model = optionalString(input, "model");
  const effort = optionalString(input, "effort");
  const permissionMode = optionalString(input, "permissionMode");
  const allowedTools = optionalString(input, "allowedTools");
  const disallowedTools = optionalString(input, "disallowedTools");
  const dangerous = optionalBoolean(input, "dangerous");
  const useHighestPermission = dangerous === true || (dangerous == null && !permissionMode);
  const args = ["task", "--json"];
  args.push("--cwd", cwd);
  if (model) {
    args.push("--model", model);
  }
  if (effort) {
    args.push("--effort", effort);
  }
  if (permissionMode) {
    args.push("--permission-mode", permissionMode);
  }
  if (useHighestPermission) {
    args.push("--dangerous");
  }
  for (const dir of addDirs) {
    args.push("--add-dir", dir);
  }
  if (allowedTools) {
    args.push("--allowed-tools", allowedTools);
  }
  if (disallowedTools) {
    args.push("--disallowed-tools", disallowedTools);
  }
  args.push(prompt);
  return { args, cwd };
}

function handleInitialize(params = {}) {
  const requestedVersion =
    typeof params.protocolVersion === "string" && SUPPORTED_PROTOCOL_VERSIONS.has(params.protocolVersion)
      ? params.protocolVersion
      : DEFAULT_PROTOCOL_VERSION;
  return {
    protocolVersion: requestedVersion,
    capabilities: {
      tools: {}
    },
    serverInfo: {
      name: "claude-plugin-codex",
      version: "0.1.0"
    }
  };
}

function handleToolCall(params = {}) {
  const name = params.name;
  const input = params.arguments ?? {};

  if (name === "claude_setup") {
    let cwd = process.cwd();
    const args = ["setup", "--json"];
    try {
      if (input.cwd != null) {
        if (typeof input.cwd !== "string") {
          throw new Error("cwd must be a string.");
        }
        cwd = normalizeDirectory(input.cwd);
        args.push("--cwd", cwd);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return contentResult(message, { ready: false, error: message }, true);
    }
    const result = runCompanion(args, process.cwd());
    const payload = parseJsonOutput(result.stdout) ?? {
      ready: false,
      error: result.error?.message || result.stderr || result.stdout
    };
    const text = result.status === 0 ? result.stdout.trim() : (result.error?.message || result.stderr || result.stdout).trim();
    return contentResult(text, payload, Boolean(result.error) || result.status !== 0);
  }

  if (name === "claude_task") {
    let request;
    try {
      request = buildTaskArgs(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return contentResult(message, { error: message }, true);
    }
    const result = runCompanion(request.args, process.cwd());
    const payload = parseJsonOutput(result.stdout) ?? {
      status: result.status ?? 1,
      rawOutput: result.stdout,
      stderr: result.stderr,
      error: result.error?.message ?? null
    };
    const text = payload.rawOutput || result.stdout || result.error?.message || result.stderr || "";
    return contentResult(text.trimEnd(), payload, Boolean(result.error) || result.status !== 0);
  }

  return contentResult(`Unknown tool: ${name}`, {}, true);
}

function handleRequest(message) {
  if (!("id" in message)) {
    return null;
  }
  const id = message.id ?? null;
  switch (message.method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: handleInitialize(message.params)
      };
    case "ping":
      return {
        jsonrpc: "2.0",
        id,
        result: {}
      };
    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: { tools: TOOLS }
      };
    case "tools/call":
      return {
        jsonrpc: "2.0",
        id,
        result: handleToolCall(message.params)
      };
    default:
      return errorResponse(id, -32601, `Method not found: ${message.method}`);
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity
});

rl.on("line", (line) => {
  if (!line.trim()) {
    return;
  }
  try {
    const message = JSON.parse(line);
    const response = handleRequest(message);
    if (response) {
      send(response);
    }
  } catch (error) {
    send(errorResponse(null, -32700, error instanceof Error ? error.message : String(error)));
  }
});
