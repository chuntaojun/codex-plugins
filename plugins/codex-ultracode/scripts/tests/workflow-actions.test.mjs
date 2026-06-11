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

async function createRunWithOneStage() {
  const { runAgentStage } = await import(path.join(distRoot, "core/stage.js"));
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-action-repo-"));
  const outputDir = path.join(repoRoot, ".ultracode/runs/manual");
  const stage = {
    index: 1,
    name: "draft",
    input: {
      topic: "workflow actions",
    },
    prompt: "Draft the doc.",
    agent: {
      label: "draft",
      mode: "read-only",
      outputFile: "draft.md",
    },
  };

  const first = await runAgentStage({
    ctx: {
      repoRoot,
      workflow: "manual-flow",
      goal: "Draft",
      mode: "read-only",
      outputDir,
    },
    stage,
    runAgent: async (options) => {
      fs.writeFileSync(options.outputFile, "attempt 1");
      return options.outputFile;
    },
  });

  writeJson(path.join(outputDir, "workflow-result.json"), {
    workflow: "manual-flow",
    status: "completed",
    outputDir,
    stages: [
      {
        ...first,
        input: stage.input,
      },
    ],
  });

  return { repoRoot, outputDir };
}

async function createRunWithTwoStages() {
  const { runJsonWorkflow } = await import(path.join(distRoot, "json-runner.js"));
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-cascade-repo-"));
  const workflowFile = path.join(repoRoot, "workflow.json");
  const paramFile = path.join(repoRoot, "param.json");
  const outputDir = path.join(repoRoot, ".ultracode/runs/manual");

  writeJson(workflowFile, {
    name: "cascade-flow",
    stages: [
      {
        name: "draft",
        type: "codex",
        input: {
          topic: "${params.topic}",
        },
        prompt: ["Draft input.topic."],
        output: {
          file: "draft.md",
        },
      },
      {
        name: "review",
        type: "codex",
        dependsOn: ["draft"],
        input: {
          draftFile: "${stages.draft.latest.outputFile}",
        },
        prompt: ["Review input.draftFile."],
        output: {
          file: "review.md",
        },
      },
    ],
  });
  writeJson(paramFile, {
    topic: "cascade",
  });

  await runJsonWorkflow({
    repoRoot,
    workflowFile,
    paramFile,
    outputDir,
    runAgent: async (options) => {
      fs.writeFileSync(options.outputFile, `attempt ${path.basename(path.dirname(options.outputFile))}`);
      return options.outputFile;
    },
  });
  return { repoRoot, outputDir };
}

async function createRunWithIndependentStage() {
  const { runJsonWorkflow } = await import(path.join(distRoot, "json-runner.js"));
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-cascade-independent-"));
  const workflowFile = path.join(repoRoot, "workflow.json");
  const paramFile = path.join(repoRoot, "param.json");
  const outputDir = path.join(repoRoot, ".ultracode/runs/manual");

  writeJson(workflowFile, {
    name: "cascade-independent-flow",
    stages: [
      {
        name: "draft",
        type: "codex",
        input: {
          topic: "${params.topic}",
        },
        prompt: ["Draft input.topic."],
        output: {
          file: "draft.md",
        },
      },
      {
        name: "notes",
        type: "codex",
        input: {
          topic: "${params.topic}",
        },
        prompt: ["Write unrelated notes."],
        output: {
          file: "notes.md",
        },
      },
      {
        name: "review",
        type: "codex",
        dependsOn: ["draft"],
        input: {
          draftFile: "${stages.draft.latest.outputFile}",
        },
        prompt: ["Review input.draftFile."],
        output: {
          file: "review.md",
        },
      },
    ],
  });
  writeJson(paramFile, {
    topic: "cascade",
  });

  await runJsonWorkflow({
    repoRoot,
    workflowFile,
    paramFile,
    outputDir,
    runAgent: async (options) => {
      fs.writeFileSync(options.outputFile, `${options.label} attempt 1`);
      return options.outputFile;
    },
  });
  return { repoRoot, outputDir };
}

test("restartWorkflowStage creates a new attempt and refreshes workflow status", async () => {
  const { restartWorkflowStage } = await import(path.join(distRoot, "workflow-actions.js"));
  const { outputDir } = await createRunWithOneStage();

  const result = await restartWorkflowStage({
    outputDir,
    stageName: "draft",
    runAgent: async (options) => {
      fs.writeFileSync(options.outputFile, "attempt 2");
      return options.outputFile;
    },
  });

  assert.equal(result.stage.stage, "draft");
  assert.equal(result.stage.attempt, 2);
  assert.equal(fs.readFileSync(result.stage.outputFile, "utf8"), "attempt 2");

  const workflowResult = JSON.parse(
    fs.readFileSync(path.join(outputDir, "workflow-result.json"), "utf8"),
  );
  assert.equal(workflowResult.stages[0].attempt, 2);
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(outputDir, "status.json"), "utf8")).stages[0].attempt,
    2,
  );
});

test("reworkWorkflowStage adds feedback to the next attempt input", async () => {
  const { reworkWorkflowStage } = await import(path.join(distRoot, "workflow-actions.js"));
  const { outputDir } = await createRunWithOneStage();

  const result = await reworkWorkflowStage({
    outputDir,
    stageName: "draft",
    feedback: {
      comments: ["Add rollout risks"],
    },
    runAgent: async (options) => {
      fs.writeFileSync(options.outputFile, "attempt 2 with feedback");
      return options.outputFile;
    },
  });

  const input = JSON.parse(fs.readFileSync(result.stage.inputFile, "utf8"));
  assert.equal(result.stage.attempt, 2);
  assert.deepEqual(input.rework.feedback.comments, ["Add rollout risks"]);
});

test("reworkWorkflowStage cascades downstream stages with updated upstream output", async () => {
  const { reworkWorkflowStage } = await import(path.join(distRoot, "workflow-actions.js"));
  const { outputDir } = await createRunWithTwoStages();

  const result = await reworkWorkflowStage({
    outputDir,
    stageName: "draft",
    cascade: true,
    feedback: {
      comments: ["Tighten draft"],
    },
    runAgent: async (options) => {
      fs.writeFileSync(options.outputFile, `attempt ${path.basename(path.dirname(options.outputFile))}`);
      return options.outputFile;
    },
  });

  const workflowResult = JSON.parse(
    fs.readFileSync(path.join(outputDir, "workflow-result.json"), "utf8"),
  );
  const draft = workflowResult.stages[0];
  const review = workflowResult.stages[1];
  const reviewInput = JSON.parse(fs.readFileSync(review.inputFile, "utf8"));

  assert.equal(result.cascadedStages.length, 1);
  assert.equal(draft.attempt, 2);
  assert.equal(review.attempt, 2);
  assert.equal(reviewInput.draftFile, draft.outputFile);
});

test("reworkWorkflowStage cascades only transitive downstream dependencies", async () => {
  const { reworkWorkflowStage } = await import(path.join(distRoot, "workflow-actions.js"));
  const { outputDir } = await createRunWithIndependentStage();
  const rerunLabels = [];

  const result = await reworkWorkflowStage({
    outputDir,
    stageName: "draft",
    cascade: true,
    feedback: {
      comments: ["Revise draft only"],
    },
    runAgent: async (options) => {
      rerunLabels.push(options.label);
      fs.writeFileSync(options.outputFile, `${options.label} attempt 2`);
      return options.outputFile;
    },
  });

  const workflowResult = JSON.parse(
    fs.readFileSync(path.join(outputDir, "workflow-result.json"), "utf8"),
  );
  const notes = workflowResult.stages.find((stage) => stage.stage === "notes");
  const review = workflowResult.stages.find((stage) => stage.stage === "review");

  assert.deepEqual(rerunLabels, ["draft", "review"]);
  assert.deepEqual(result.cascadedStages.map((stage) => stage.stage), ["review"]);
  assert.equal(notes.attempt, 1);
  assert.equal(review.attempt, 2);
});
