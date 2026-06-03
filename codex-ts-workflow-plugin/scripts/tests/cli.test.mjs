import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.resolve(__dirname, "../dist");

test("parseCliArgs supports harness-cli run workflow.json param.json", async () => {
  const { parseCliArgs } = await import(path.join(distRoot, "cli.js"));

  const input = parseCliArgs([
    "run",
    "workflow.json",
    "param.json",
    "--outputDir",
    ".codex-workflows/runs/manual",
  ]);

  assert.equal(input.command, "run-json");
  assert.equal(input.workflowFile, "workflow.json");
  assert.equal(input.paramFile, "param.json");
  assert.equal(input.outputDir, ".codex-workflows/runs/manual");
});

test("parseCliArgs supports explicit run id and worktree directory", async () => {
  const { parseCliArgs } = await import(path.join(distRoot, "cli.js"));

  const input = parseCliArgs([
    "run",
    "workflow.json",
    "param.json",
    "--run-id",
    "manual-run",
    "--worktree-dir",
    "/tmp/manual-run",
  ]);

  assert.equal(input.runId, "manual-run");
  assert.equal(input.worktreeDir, "/tmp/manual-run");
  assert.equal(input.outputDir, ".codex-workflows/runs/manual-run");
});

test("parseCliArgs rejects non-run commands", async () => {
  const { parseCliArgs } = await import(path.join(distRoot, "cli.js"));

  assert.throws(
    () => parseCliArgs(["--anything"]),
    /Usage: harness-cli run <workflow.json> <param.json>/,
  );
});

test("parseCliArgs supports workflow inspection commands", async () => {
  const { parseCliArgs } = await import(path.join(distRoot, "cli.js"));

  assert.deepEqual(parseCliArgs(["status", ".runs/manual"]), {
    command: "status",
    outputDir: ".runs/manual",
    json: false,
  });
  assert.deepEqual(parseCliArgs(["tail", ".runs/manual", "--limit", "5"]), {
    command: "tail",
    outputDir: ".runs/manual",
    limit: 5,
    json: false,
  });
  assert.deepEqual(parseCliArgs(["report", ".runs/manual", "--json"]), {
    command: "report",
    outputDir: ".runs/manual",
    json: true,
  });
});

test("formatWorkflowStatus renders stage progress for terminal users", async () => {
  const { formatWorkflowStatus } = await import(path.join(distRoot, "cli.js"));

  const text = formatWorkflowStatus({
    workflow: "doc-flow",
    status: "failed",
    outputDir: "/tmp/run",
    stages: [
      { index: 1, name: "write-doc", status: "passed", attempt: 1, sessionId: "s1" },
      { index: 2, name: "review-doc", status: "failed", attempt: 1, sessionId: "s2" },
    ],
    failedGates: [{ stage: "review-doc", command: "npm test", exitCode: 1 }],
  });

  assert.match(text, /Workflow: doc-flow/);
  assert.match(text, /\[1\] write-doc\s+passed\s+session: s1/);
  assert.match(text, /Failed gates:/);
});
