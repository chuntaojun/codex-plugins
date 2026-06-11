import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.resolve(__dirname, "../dist");

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

test("parseCliArgs supports binary-first ultracode run workflow.json param.json", async () => {
  const { parseCliArgs } = await import(path.join(distRoot, "cli.js"));

  const input = parseCliArgs([
    "run",
    "workflow.json",
    "param.json",
    "--outputDir",
    ".ultracode/runs/manual",
  ]);

  assert.equal(input.command, "run-json");
  assert.equal(input.workflowFile, "workflow.json");
  assert.equal(input.paramFile, "param.json");
  assert.equal(input.outputDir, ".ultracode/runs/manual");
});

test("runJsonWorkflow executes codex stages from workflow and param files with session artifacts", async () => {
  const { runJsonWorkflow } = await import(path.join(distRoot, "json-runner.js"));
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-json-runner-"));
  const workflowFile = path.join(repoRoot, "workflow.json");
  const paramFile = path.join(repoRoot, "param.json");
  const outputDir = path.join(repoRoot, ".ultracode/runs/manual");

  writeJson(workflowFile, {
    name: "doc-flow",
    stages: [
      {
        name: "write-doc",
        type: "codex",
        input: {
          goal: "${params.goal}",
        },
        prompt: ["Write a short document for input.goal."],
        output: {
          file: "design.md",
        },
      },
      {
        name: "review-doc",
        type: "codex",
        dependsOn: ["write-doc"],
        input: {
          document: "${stages.write-doc.latest.outputFile}",
        },
        prompt: ["Review input.document."],
        output: {
          file: "review.json",
        },
      },
    ],
  });
  writeJson(paramFile, {
    goal: "Design workflow gates",
    mode: "read-only",
  });

  const statusSnapshots = [];
  const result = await runJsonWorkflow({
    repoRoot,
    workflowFile,
    paramFile,
    outputDir,
    runAgent: async (options) => {
      statusSnapshots.push(
        JSON.parse(fs.readFileSync(path.join(outputDir, "status.json"), "utf8")),
      );
      fs.writeFileSync(options.outputFile, `${options.label} output`);
      fs.writeFileSync(options.eventFile, [
        JSON.stringify({ type: "session.started", session_id: `${options.label}-session` }),
        JSON.stringify({ type: "agent_message", message: "thinking" }),
      ].join("\n"));
      fs.writeFileSync(options.stdoutFile, "stdout event stream");
      fs.writeFileSync(options.stderrFile, "");
      fs.writeFileSync(
        options.sessionFile,
        JSON.stringify(
          {
            codexSessionId: `${options.label}-session`,
            status: "completed",
          },
          null,
          2,
        ),
      );
      return {
        outputFile: options.outputFile,
        sessionId: `${options.label}-session`,
      };
    },
  });

  assert.equal(result.workflow, "doc-flow");
  assert.equal(result.status, "completed");
  assert.equal(result.stages.length, 2);
  assert.equal(result.stages[0].sessionId, "write-doc-session");
  assert.equal(result.stages[1].sessionId, "review-doc-session");
  assert.equal(
    result.stages[1].input.document,
    result.stages[0].outputFile,
  );

  const firstAttempt = path.join(outputDir, "stages/001-write-doc/attempts/001");
  assert.equal(fs.existsSync(path.join(firstAttempt, "codex-events.jsonl")), true);
  assert.equal(fs.existsSync(path.join(firstAttempt, "codex-stdout.log")), true);
  assert.equal(fs.existsSync(path.join(firstAttempt, "codex-stderr.log")), true);
  assert.equal(fs.existsSync(path.join(firstAttempt, "session.json")), true);
  assert.equal(fs.existsSync(path.join(outputDir, "workflow.json")), true);
  assert.equal(fs.existsSync(path.join(outputDir, "param.json")), true);
  assert.deepEqual(
    statusSnapshots[0].stages.map((stage) => stage.status),
    ["running", "pending"],
  );
  assert.deepEqual(
    statusSnapshots[1].stages.map((stage) => stage.status),
    ["passed", "running"],
  );
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(outputDir, "status.json"), "utf8")).status,
    "completed",
  );
});

test("runJsonWorkflow executes stages in dependency order even when declared out of order", async () => {
  const { runJsonWorkflow } = await import(path.join(distRoot, "json-runner.js"));
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-json-deps-"));
  const workflowFile = path.join(repoRoot, "workflow.json");
  const paramFile = path.join(repoRoot, "param.json");
  const outputDir = path.join(repoRoot, ".ultracode/runs/deps");

  writeJson(workflowFile, {
    name: "dependency-flow",
    stages: [
      {
        name: "review-doc",
        type: "codex",
        dependsOn: ["write-doc"],
        input: {
          document: "${stages.write-doc.latest.outputFile}",
        },
        prompt: ["Review input.document."],
        output: {
          file: "review.md",
        },
      },
      {
        name: "write-doc",
        type: "codex",
        input: {
          goal: "${params.goal}",
        },
        prompt: ["Write input.goal."],
        output: {
          file: "design.md",
        },
      },
    ],
  });
  writeJson(paramFile, {
    goal: "Dependency-aware runner",
    mode: "read-only",
  });

  const executionOrder = [];
  const result = await runJsonWorkflow({
    repoRoot,
    workflowFile,
    paramFile,
    outputDir,
    runAgent: async (options) => {
      executionOrder.push(options.label);
      fs.writeFileSync(options.outputFile, `${options.label} output`);
      fs.writeFileSync(options.eventFile, "");
      fs.writeFileSync(options.stdoutFile, "");
      fs.writeFileSync(options.stderrFile, "");
      fs.writeFileSync(options.sessionFile, JSON.stringify({ status: "completed" }));
      return {
        outputFile: options.outputFile,
        sessionId: `${options.label}-session`,
      };
    },
  });

  assert.deepEqual(executionOrder, ["write-doc", "review-doc"]);
  assert.deepEqual(result.stages.map((stage) => stage.stage), ["write-doc", "review-doc"]);
  assert.equal(result.stages[1].input.document, result.stages[0].outputFile);
});

test("runJsonWorkflow rejects unknown and cyclic stage dependencies", async () => {
  const { runJsonWorkflow } = await import(path.join(distRoot, "json-runner.js"));
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-json-invalid-deps-"));
  const paramFile = path.join(repoRoot, "param.json");
  const outputDir = path.join(repoRoot, ".ultracode/runs/invalid-deps");
  writeJson(paramFile, { goal: "Invalid deps" });

  const unknownWorkflowFile = path.join(repoRoot, "unknown.workflow.json");
  writeJson(unknownWorkflowFile, {
    name: "unknown-dependency-flow",
    stages: [
      {
        name: "review-doc",
        type: "codex",
        dependsOn: ["missing-doc"],
        input: {},
        prompt: ["Review."],
        output: { file: "review.md" },
      },
    ],
  });

  await assert.rejects(
    () =>
      runJsonWorkflow({
        repoRoot,
        workflowFile: unknownWorkflowFile,
        paramFile,
        outputDir,
        runAgent: async () => ({ outputFile: "unused" }),
      }),
    /Unknown dependency "missing-doc"/,
  );

  const cyclicWorkflowFile = path.join(repoRoot, "cyclic.workflow.json");
  writeJson(cyclicWorkflowFile, {
    name: "cyclic-flow",
    stages: [
      {
        name: "a",
        type: "codex",
        dependsOn: ["b"],
        input: {},
        prompt: ["A."],
        output: { file: "a.md" },
      },
      {
        name: "b",
        type: "codex",
        dependsOn: ["a"],
        input: {},
        prompt: ["B."],
        output: { file: "b.md" },
      },
    ],
  });

  await assert.rejects(
    () =>
      runJsonWorkflow({
        repoRoot,
        workflowFile: cyclicWorkflowFile,
        paramFile,
        outputDir,
        runAgent: async () => ({ outputFile: "unused" }),
      }),
    /Cyclic stage dependency/,
  );
});
