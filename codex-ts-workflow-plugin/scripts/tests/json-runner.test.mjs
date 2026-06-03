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

test("parseCliArgs supports binary-first harness-cli run workflow.json param.json", async () => {
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

test("runJsonWorkflow executes codex stages from workflow and param files with session artifacts", async () => {
  const { runJsonWorkflow } = await import(path.join(distRoot, "json-runner.js"));
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-json-runner-"));
  const workflowFile = path.join(repoRoot, "workflow.json");
  const paramFile = path.join(repoRoot, "param.json");
  const outputDir = path.join(repoRoot, ".codex-workflows/runs/manual");

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
