#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";
import path from "node:path";

const VALID_PERMISSION_MODES = new Set([
  "acceptEdits",
  "auto",
  "bypassPermissions",
  "default",
  "dontAsk",
  "plan"
]);
const VALID_EFFORTS = new Set(["low", "medium", "high", "xhigh", "max"]);

function printUsage() {
  console.log(
    [
      "Usage:",
      "  node scripts/claude-companion.mjs setup [--json]",
      "  node scripts/claude-companion.mjs task [--json] [--cwd <path>] [--model <model>] [--effort <level>] [--permission-mode <mode>] [--dangerous] [--add-dir <path>] [--allowed-tools <tools>] [--disallowed-tools <tools>] [prompt]"
    ].join("\n")
  );
}

function parseArgs(argv, config = {}) {
  const valueOptions = new Set(config.valueOptions ?? []);
  const booleanOptions = new Set(config.booleanOptions ?? []);
  const repeatableOptions = new Set(config.repeatableOptions ?? []);
  const options = {};
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      positionals.push(...argv.slice(index + 1));
      break;
    }
    if (!arg.startsWith("--") || arg === "-") {
      positionals.push(arg);
      continue;
    }

    const raw = arg.slice(2);
    const [name, inlineValue] = raw.split(/=(.*)/s, 2);
    if (booleanOptions.has(name)) {
      options[name] = true;
      continue;
    }
    if (!valueOptions.has(name)) {
      throw new Error(`Unknown option --${name}.`);
    }

    const value = inlineValue ?? argv[++index];
    if (value == null) {
      throw new Error(`Missing value for --${name}.`);
    }
    if (repeatableOptions.has(name)) {
      options[name] = [...(options[name] ?? []), value];
    } else {
      options[name] = value;
    }
  }

  return { options, positionals };
}

function readPrompt(positionals) {
  const positionalPrompt = positionals.join(" ").trim();
  if (positionalPrompt) {
    return positionalPrompt;
  }

  if (process.stdin.isTTY) {
    return "";
  }

  let input = "";
  try {
    input = fs.readFileSync(0, "utf8");
  } catch {
    input = "";
  }
  return input.trim();
}

function runCommand(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: "utf8",
    input: options.input,
    shell: process.platform === "win32" && !path.isAbsolute(command),
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024
  });
}

function checkClaude(cwd) {
  const version = runCommand("claude", ["--version"], { cwd });
  if (version.error) {
    return {
      available: false,
      version: null,
      detail: version.error.message
    };
  }
  return {
    available: version.status === 0,
    version: version.stdout.trim() || null,
    detail: version.status === 0 ? "Claude CLI is available." : version.stderr.trim()
  };
}

function normalizePermissionMode(value, dangerous) {
  if (dangerous) {
    return "bypassPermissions";
  }
  const mode = value ?? "default";
  if (!VALID_PERMISSION_MODES.has(mode)) {
    throw new Error(`Unsupported permission mode "${mode}". Use one of: ${[...VALID_PERMISSION_MODES].join(", ")}.`);
  }
  return mode;
}

function normalizeEffort(value) {
  if (value == null) {
    return null;
  }
  const effort = String(value).trim().toLowerCase();
  if (!VALID_EFFORTS.has(effort)) {
    throw new Error(`Unsupported effort "${value}". Use one of: ${[...VALID_EFFORTS].join(", ")}.`);
  }
  return effort;
}

function parseClaudeJson(stdout) {
  const text = String(stdout ?? "").trim();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractClaudeResult(parsed, stdout) {
  if (!parsed) {
    return String(stdout ?? "").trimEnd();
  }
  if (typeof parsed.result === "string") {
    return parsed.result;
  }
  if (typeof parsed.message === "string") {
    return parsed.message;
  }
  if (typeof parsed.output === "string") {
    return parsed.output;
  }
  return String(stdout ?? "").trimEnd();
}

function buildClaudeArgs(options, prompt) {
  const explicitPermissionMode = options["permission-mode"] != null;
  const dangerous = Boolean(options.dangerous) || !explicitPermissionMode;
  const permissionMode = normalizePermissionMode(options["permission-mode"], dangerous);
  const effort = normalizeEffort(options.effort);
  const args = ["--print", "--output-format", "json", "--permission-mode", permissionMode];

  if (dangerous) {
    args.push("--dangerously-skip-permissions");
  }
  if (options.model) {
    args.push("--model", options.model);
  }
  if (effort) {
    args.push("--effort", effort);
  }
  for (const dir of options["add-dir"] ?? []) {
    args.push("--add-dir", dir);
  }
  if (options["allowed-tools"]) {
    args.push("--allowedTools", options["allowed-tools"]);
  }
  if (options["disallowed-tools"]) {
    args.push("--disallowedTools", options["disallowed-tools"]);
  }

  args.push(prompt);
  return args;
}

function renderSetupReport(report) {
  const lines = [
    "# Claude CLI Setup",
    "",
    `Ready: ${report.ready ? "yes" : "no"}`,
    `Claude: ${report.claude.available ? report.claude.version : "not available"}`
  ];
  if (!report.ready) {
    lines.push("", "Next steps:", "- Install Claude Code CLI and authenticate with `claude auth`.");
  }
  return `${lines.join("\n")}\n`;
}

function renderTaskResult(payload) {
  const lines = ["# Claude Result", "", payload.rawOutput || "(Claude returned no final text.)"];
  if (payload.sessionId) {
    lines.push("", `Session: ${payload.sessionId}`);
  }
  if (payload.stderr) {
    lines.push("", "## Claude Stderr", "", payload.stderr);
  }
  return `${lines.join("\n")}\n`;
}

async function handleSetup(argv) {
  const { options } = parseArgs(argv, {
    valueOptions: ["cwd"],
    booleanOptions: ["json"]
  });
  const cwd = options.cwd ? path.resolve(process.cwd(), options.cwd) : process.cwd();
  const claude = checkClaude(cwd);
  const report = {
    ready: claude.available,
    claude,
    cwd
  };
  process.stdout.write(options.json ? `${JSON.stringify(report, null, 2)}\n` : renderSetupReport(report));
}

async function handleTask(argv) {
  const { options, positionals } = parseArgs(argv, {
    valueOptions: [
      "cwd",
      "model",
      "effort",
      "permission-mode",
      "add-dir",
      "allowed-tools",
      "disallowed-tools"
    ],
    booleanOptions: ["json", "dangerous"],
    repeatableOptions: ["add-dir"]
  });
  const cwd = options.cwd ? path.resolve(process.cwd(), options.cwd) : process.cwd();
  const prompt = readPrompt(positionals);
  if (!prompt) {
    throw new Error("Provide a prompt as arguments or piped stdin.");
  }

  const availability = checkClaude(cwd);
  if (!availability.available) {
    throw new Error(`Claude CLI is not available: ${availability.detail}`);
  }

  const args = buildClaudeArgs(options, prompt);
  const result = runCommand("claude", args, { cwd });
  const parsed = parseClaudeJson(result.stdout);
  const rawOutput = extractClaudeResult(parsed, result.stdout);
  const payload = {
    status: result.status ?? 1,
    signal: result.signal ?? null,
    rawOutput,
    stderr: String(result.stderr ?? "").trim(),
    sessionId: parsed?.session_id ?? parsed?.sessionId ?? null,
    costUsd: parsed?.total_cost_usd ?? parsed?.cost_usd ?? null,
    durationMs: parsed?.duration_ms ?? null,
    numTurns: parsed?.num_turns ?? null,
    claude: parsed ?? null
  };

  process.stdout.write(options.json ? `${JSON.stringify(payload, null, 2)}\n` : renderTaskResult(payload));
  if (payload.status !== 0) {
    process.exitCode = payload.status;
  }
}

async function main() {
  const [command, ...argv] = process.argv.slice(2);
  if (!command || command === "help" || command === "--help" || command === "-h") {
    printUsage();
    return;
  }

  switch (command) {
    case "setup":
      await handleSetup(argv);
      return;
    case "task":
      await handleTask(argv);
      return;
    default:
      throw new Error(`Unknown command "${command}".`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
