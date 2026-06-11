import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.resolve(__dirname, "../dist");

const validWorkflow = {
  name: "dynamic-review-plan",
  description: "Dynamic preview",
  stages: [
    {
      name: "scope-brief",
      type: "codex",
      input: {
        intent: "${params.intent}",
      },
      prompt: ["Create a scope brief."],
      output: {
        file: "scope-brief.md",
      },
    },
    {
      name: "execute-task",
      type: "codex",
      dependsOn: ["scope-brief"],
      input: {
        scopeBriefFile: "${stages.scope-brief.latest.outputFile}",
      },
      prompt: ["Execute the task."],
      output: {
        file: "task-output.md",
      },
    },
  ],
};

test("validateDynamicWorkflow accepts constrained planner output", async () => {
  const { validateDynamicWorkflow } = await import(path.join(distRoot, "dynamic-runner.js"));

  const result = validateDynamicWorkflow(validWorkflow);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateDynamicWorkflow accepts forward dependencies", async () => {
  const { validateDynamicWorkflow } = await import(path.join(distRoot, "dynamic-runner.js"));

  const result = validateDynamicWorkflow({
    name: "dynamic-forward-deps",
    description: "Forward dependency order should be valid.",
    stages: [
      {
        name: "review-result",
        type: "codex",
        dependsOn: ["execute-task"],
        input: {
          taskOutputFile: "${stages.execute-task.latest.outputFile}",
        },
        prompt: ["Review the task output."],
        output: {
          file: "review.md",
        },
      },
      {
        name: "execute-task",
        type: "codex",
        input: {
          intent: "${params.intent}",
        },
        prompt: ["Execute the task."],
        output: {
          file: "task.md",
        },
      },
    ],
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateDynamicWorkflow accepts supported agent modes and rejects unsupported ones", async () => {
  const { validateDynamicWorkflow } = await import(path.join(distRoot, "dynamic-runner.js"));

  const valid = validateDynamicWorkflow({
    name: "dynamic-write-stage",
    description: "Write stage should be valid after preview approval.",
    stages: [
      {
        name: "implement-change",
        type: "codex",
        input: {
          intent: "${params.intent}",
        },
        prompt: ["Implement the requested change."],
        agent: {
          mode: "write",
        },
        output: {
          file: "implementation-summary.md",
        },
      },
    ],
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, []);

  const invalid = validateDynamicWorkflow({
    name: "dynamic-invalid-agent-mode",
    description: "Invalid agent mode should be rejected.",
    stages: [
      {
        name: "implement-change",
        type: "codex",
        input: {
          intent: "${params.intent}",
        },
        prompt: ["Implement the requested change."],
        agent: {
          mode: "danger-full-access",
        },
        output: {
          file: "implementation-summary.md",
        },
      },
    ],
  });
  assert.equal(invalid.valid, false);
  assert(invalid.errors.some((error) => /agent.mode/i.test(error)));
});

test("validateDynamicWorkflow rejects unsafe dynamic workflow features", async () => {
  const { validateDynamicWorkflow } = await import(path.join(distRoot, "dynamic-runner.js"));

  const result = validateDynamicWorkflow({
    name: "unsafe",
    stages: [
      {
        name: "write",
        type: "codex",
        input: {},
        prompt: ["Write something."],
        output: {
          file: "../escape.md",
        },
        gate: {
          command: "rm -rf /",
        },
      },
      {
        name: "review",
        type: "shell",
        dependsOn: ["missing"],
        input: {},
        prompt: ["Review."],
        output: {
          file: "/tmp/review.md",
        },
      },
      {
        name: "cycle-a",
        type: "codex",
        dependsOn: ["cycle-b"],
        input: {},
        prompt: ["A."],
        output: {
          file: "cycle-a.md",
        },
      },
      {
        name: "cycle-b",
        type: "codex",
        dependsOn: ["cycle-a"],
        input: {},
        prompt: ["B."],
        output: {
          file: "cycle-b.md",
        },
      },
    ],
  });

  assert.equal(result.valid, false);
  assert(result.errors.some((error) => /gate/i.test(error)));
  assert(result.errors.some((error) => /Unsupported stage type/i.test(error)));
  assert(result.errors.some((error) => /Unknown dependency/i.test(error)));
  assert(result.errors.some((error) => /safe relative path/i.test(error)));
  assert(result.errors.some((error) => /Cyclic stage dependency/i.test(error)));
});

test("createDynamicWorkflowFiles writes approved workflow and params into the run directory", async () => {
  const { createDynamicWorkflowFiles } = await import(path.join(distRoot, "dynamic-runner.js"));
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-dynamic-"));

  const files = createDynamicWorkflowFiles({
    outputDir,
    intent: "Review the implementation plan",
    workflow: validWorkflow,
    params: {
      target: "docs/tasks/todo.md",
    },
  });

  const workflow = JSON.parse(fs.readFileSync(files.workflowFile, "utf8"));
  const params = JSON.parse(fs.readFileSync(files.paramFile, "utf8"));

  assert.equal(workflow.name, "dynamic-review-plan");
  assert.equal(params.mode, "read-only");
  assert.equal(params.goal, "Review the implementation plan");
  assert.equal(params.intent, "Review the implementation plan");
  assert.equal(params.target, "docs/tasks/todo.md");
});
