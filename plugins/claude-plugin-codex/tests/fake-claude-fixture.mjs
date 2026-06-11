import path from "node:path";

import { writeExecutable } from "./helpers.mjs";

export function installFakeClaude(binDir, behavior = "ok") {
  const scriptPath = path.join(binDir, "claude");
  const source = `#!/usr/bin/env node
const fs = require("node:fs");

const behavior = ${JSON.stringify(behavior)};
const args = process.argv.slice(2);

if (args.includes("--version")) {
  console.log("1.2.3-test");
  process.exit(0);
}

if (args.includes("--help")) {
  console.log("fake claude help");
  process.exit(0);
}

if (behavior === "missing-auth") {
  console.error("Not authenticated. Run claude auth login.");
  process.exit(1);
}

const prompt = args[args.length - 1] || "";
const payload = {
  type: "result",
  subtype: behavior === "error-result" ? "error_max_turns" : "success",
  is_error: behavior === "error-result",
  result: behavior === "plain-text" ? undefined : "Claude handled: " + prompt,
  session_id: "claude-session-123",
  total_cost_usd: 0.01,
  duration_ms: 42,
  num_turns: 1,
  cwd: process.cwd(),
  args
};

if (behavior === "plain-text") {
  process.stdout.write("Plain Claude response for: " + prompt + "\\n");
  process.exit(0);
}

process.stdout.write(JSON.stringify(payload) + "\\n");
process.exit(behavior === "error-result" ? 2 : 0);
`;
  writeExecutable(scriptPath, source);
  return scriptPath;
}

export function buildEnv(binDir) {
  return {
    ...process.env,
    PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ""}`
  };
}
