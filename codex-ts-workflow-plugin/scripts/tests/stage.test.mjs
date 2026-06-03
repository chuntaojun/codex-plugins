import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.resolve(__dirname, "../dist");

function tempRunDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "codex-stage-test-"));
}

test("runAgentStage writes isolated attempt input, prompt, output, and result files", async () => {
  const { runAgentStage } = await import(path.join(distRoot, "core/stage.js"));
  const outputDir = tempRunDir();

  const result = await runAgentStage({
    ctx: {
      repoRoot: "/repo",
      workflow: "test-flow",
      goal: "Write design",
      mode: "read-only",
      outputDir,
    },
    stage: {
      index: 1,
      name: "write-design-doc",
      input: { topic: "workflow gates" },
      prompt: ["Write a design doc using input.topic."],
      agent: {
        label: "doc-writer",
        mode: "read-only",
        outputFile: "design.md",
      },
    },
    runAgent: async (options) => {
      fs.writeFileSync(options.outputFile, "design body");
      return options.outputFile;
    },
  });

  assert.equal(result.status, "passed");
  assert.equal(result.stage, "write-design-doc");
  assert.equal(result.attempt, 1);
  assert.match(result.stageDir, /001-write-design-doc$/);
  assert.match(result.attemptDir, /001-write-design-doc\/attempts\/001$/);
  assert.equal(fs.readFileSync(path.join(result.attemptDir, "input.json"), "utf8").includes("workflow gates"), true);
  assert.equal(fs.readFileSync(path.join(result.attemptDir, "prompt.md"), "utf8"), "Write a design doc using input.topic.");
  assert.equal(fs.readFileSync(result.outputFile, "utf8"), "design body");
  assert.equal(fs.existsSync(path.join(result.attemptDir, "result.json")), true);
});

test("runAgentStage runs command gates and marks the stage failed when a gate fails", async () => {
  const { runAgentStage } = await import(path.join(distRoot, "core/stage.js"));
  const outputDir = tempRunDir();

  const result = await runAgentStage({
    ctx: {
      repoRoot: "/repo",
      workflow: "test-flow",
      goal: "Implement feature",
      mode: "write",
      outputDir,
    },
    stage: {
      index: 2,
      name: "implement",
      input: {},
      prompt: "Implement the feature.",
      agent: {
        label: "implementer",
        mode: "write",
        outputFile: "implementation.md",
      },
      gate: {
        type: "command",
        commands: ["npm test", "npm run typecheck"],
      },
    },
    runAgent: async (options) => {
      fs.writeFileSync(options.outputFile, "implementation summary");
      return options.outputFile;
    },
    runCommand: async (command) => ({
      command,
      exitCode: command === "npm test" ? 0 : 1,
      stdout: command === "npm test" ? "pass" : "",
      stderr: command === "npm test" ? "" : "type error",
    }),
  });

  assert.equal(result.status, "failed");
  assert.equal(result.gate?.status, "failed");
  assert.deepEqual(
    result.gate?.commands.map((command) => command.exitCode),
    [0, 1],
  );
  assert.equal(fs.existsSync(path.join(result.attemptDir, "gate-result.json")), true);
});

test("restartStage creates the next attempt with the same input", async () => {
  const { runAgentStage, restartStage } = await import(path.join(distRoot, "core/stage.js"));
  const outputDir = tempRunDir();
  const common = {
    ctx: {
      repoRoot: "/repo",
      workflow: "test-flow",
      goal: "Write design",
      mode: "read-only",
      outputDir,
    },
    stage: {
      index: 1,
      name: "write-design-doc",
      input: { topic: "workflow gates" },
      prompt: "Write doc.",
      agent: {
        label: "doc-writer",
        mode: "read-only",
        outputFile: "design.md",
      },
    },
    runAgent: async (options) => {
      fs.writeFileSync(options.outputFile, `attempt ${path.basename(path.dirname(options.outputFile))}`);
      return options.outputFile;
    },
  };

  const first = await runAgentStage(common);
  const second = await restartStage({ ...common, previousResult: first });

  assert.equal(first.attempt, 1);
  assert.equal(second.attempt, 2);
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(second.attemptDir, "input.json"), "utf8")),
    JSON.parse(fs.readFileSync(path.join(first.attemptDir, "input.json"), "utf8")),
  );
});

test("reworkStage creates the next attempt with review feedback in input", async () => {
  const { runAgentStage, reworkStage } = await import(path.join(distRoot, "core/stage.js"));
  const outputDir = tempRunDir();
  const baseStage = {
    index: 1,
    name: "write-design-doc",
    input: { topic: "workflow gates" },
    prompt: "Write doc.",
    agent: {
      label: "doc-writer",
      mode: "read-only",
      outputFile: "design.md",
    },
  };
  const common = {
    ctx: {
      repoRoot: "/repo",
      workflow: "test-flow",
      goal: "Write design",
      mode: "read-only",
      outputDir,
    },
    stage: baseStage,
    runAgent: async (options) => {
      fs.writeFileSync(options.outputFile, "design");
      return options.outputFile;
    },
  };

  const first = await runAgentStage(common);
  const second = await reworkStage({
    ...common,
    previousResult: first,
    feedback: {
      sourceStage: "review-design-doc",
      comments: ["Add rollback plan", "Clarify gate criteria"],
    },
  });
  const input = JSON.parse(fs.readFileSync(path.join(second.attemptDir, "input.json"), "utf8"));

  assert.equal(second.attempt, 2);
  assert.deepEqual(input.rework.feedback.comments, [
    "Add rollback plan",
    "Clarify gate criteria",
  ]);
  assert.equal(input.rework.previousAttempt.outputFile, first.outputFile);
});

test("loadLatestStageResult reads the latest result for a stage definition", async () => {
  const { runAgentStage, loadLatestStageResult } = await import(
    path.join(distRoot, "core/stage.js")
  );
  const outputDir = tempRunDir();
  const stage = {
    index: 3,
    name: "review-design-doc",
    input: {},
    prompt: "Review doc.",
    agent: {
      label: "doc-reviewer",
      mode: "read-only",
      outputFile: "review.json",
    },
  };

  const result = await runAgentStage({
    ctx: {
      repoRoot: "/repo",
      workflow: "test-flow",
      goal: "Review design",
      mode: "read-only",
      outputDir,
    },
    stage,
    runAgent: async (options) => {
      fs.writeFileSync(options.outputFile, "review");
      return options.outputFile;
    },
  });
  const latest = loadLatestStageResult(outputDir, stage);

  assert.equal(latest.stage, result.stage);
  assert.equal(latest.status, result.status);
  assert.equal(latest.attempt, result.attempt);
  assert.equal(latest.outputFile, result.outputFile);
});
