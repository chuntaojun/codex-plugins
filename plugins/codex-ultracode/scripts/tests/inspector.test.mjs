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

function createRunDir() {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-inspector-"));
  const stageOneOutput = path.join(outputDir, "stages/001-write-doc/attempts/001/doc.md");
  const stageTwoOutput = path.join(outputDir, "stages/002-review-doc/attempts/001/review.md");
  fs.mkdirSync(path.dirname(stageOneOutput), { recursive: true });
  fs.mkdirSync(path.dirname(stageTwoOutput), { recursive: true });
  fs.writeFileSync(stageOneOutput, "Design draft");
  fs.writeFileSync(stageTwoOutput, "Review notes");
  writeJson(path.join(outputDir, "workflow-result.json"), {
    workflow: "doc-flow",
    status: "completed",
    outputDir,
    stages: [
      {
        stage: "write-doc",
        status: "passed",
        attempt: 1,
        stageDir: path.join(outputDir, "stages/001-write-doc"),
        attemptDir: path.dirname(stageOneOutput),
        inputFile: path.join(path.dirname(stageOneOutput), "input.json"),
        promptFile: path.join(path.dirname(stageOneOutput), "prompt.md"),
        outputFile: stageOneOutput,
        resultFile: path.join(path.dirname(stageOneOutput), "result.json"),
        sessionId: "session-write",
      },
      {
        stage: "review-doc",
        status: "failed",
        attempt: 1,
        stageDir: path.join(outputDir, "stages/002-review-doc"),
        attemptDir: path.dirname(stageTwoOutput),
        inputFile: path.join(path.dirname(stageTwoOutput), "input.json"),
        promptFile: path.join(path.dirname(stageTwoOutput), "prompt.md"),
        outputFile: stageTwoOutput,
        resultFile: path.join(path.dirname(stageTwoOutput), "result.json"),
        sessionId: "session-review",
        gate: {
          type: "command",
          status: "failed",
          commands: [
            {
              command: "npm test",
              exitCode: 1,
              stdout: "",
              stderr: "failed assertion",
            },
          ],
        },
      },
    ],
  });
  fs.writeFileSync(
    path.join(outputDir, "trace.jsonl"),
    [
      JSON.stringify({ type: "stage.started", stage: "write-doc", attempt: 1 }),
      JSON.stringify({ type: "stage.completed", stage: "write-doc", attempt: 1, status: "passed" }),
      JSON.stringify({ type: "gate.command.completed", command: "npm test", exitCode: 1 }),
    ].join("\n") + "\n",
  );
  return outputDir;
}

test("inspectWorkflowStatus summarizes stages and failed gates", async () => {
  const { inspectWorkflowStatus } = await import(path.join(distRoot, "core/inspector.js"));
  const outputDir = createRunDir();

  const status = inspectWorkflowStatus(outputDir);

  assert.equal(status.workflow, "doc-flow");
  assert.equal(status.status, "failed");
  assert.equal(status.stages.length, 2);
  assert.deepEqual(
    status.stages.map((stage) => [stage.name, stage.status, stage.sessionId]),
    [
      ["write-doc", "passed", "session-write"],
      ["review-doc", "failed", "session-review"],
    ],
  );
  assert.equal(status.currentStage?.name, "review-doc");
  assert.equal(status.failedGates[0].command, "npm test");
});

test("inspectWorkflowTail returns recent trace events", async () => {
  const { inspectWorkflowTail } = await import(path.join(distRoot, "core/inspector.js"));
  const outputDir = createRunDir();

  const tail = inspectWorkflowTail(outputDir, { limit: 2 });

  assert.equal(tail.events.length, 2);
  assert.equal(tail.events[0].type, "stage.completed");
  assert.equal(tail.events[1].type, "gate.command.completed");
});

test("inspectWorkflowReport returns final stage artifacts and text summary", async () => {
  const { inspectWorkflowReport } = await import(path.join(distRoot, "core/inspector.js"));
  const outputDir = createRunDir();

  const report = inspectWorkflowReport(outputDir);

  assert.equal(report.workflow, "doc-flow");
  assert.equal(report.status, "failed");
  assert.equal(report.finalStage?.name, "review-doc");
  assert.equal(report.finalArtifact?.text, "Review notes");
  assert.match(report.summary, /review-doc\s+failed/);
  assert.match(report.summary, /session-review/);
});
