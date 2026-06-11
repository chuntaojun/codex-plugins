import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.resolve(__dirname, "../dist");

test("writeDynamicPlanFile and readDynamicPlanFile persist an approved preview artifact", async () => {
  const { copyApprovedDynamicPlanFile, readDynamicPlanFile, writeDynamicPlanFile } = await import(
    path.join(distRoot, "dynamic-plan-file.js")
  );
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-plan-file-"));
  const planFile = path.join(outputDir, "plan.dynamic.json");

  const plan = {
    recommendedAction: "review_dynamic",
    requiresConfirmation: true,
    reason: "No registered workflow clearly matches.",
    preview: {
      summary: "Dynamic code-change workflow with 1 stage.",
      stageCount: 1,
      writeStages: ["implement-change"],
      outputFiles: ["implementation-summary.md"],
      risks: ["Includes write-mode stages."],
      confirmationPrompt: "Approve with approved=true.",
    },
    workflow: {
      name: "dynamic-fix-tests",
      description: "Dynamic code-change workflow preview.",
      stages: [
        {
          name: "implement-change",
          type: "codex",
          input: {
            intent: "${params.intent}",
          },
          prompt: ["Implement the change."],
          agent: {
            mode: "write",
          },
          output: {
            file: "implementation-summary.md",
          },
        },
      ],
    },
  };

  const written = writeDynamicPlanFile({
    planFile,
    intent: "Fix tests",
    plan,
    params: {
      target: "docs/tasks/todo.md",
    },
    execution: {
      outputDir: ".ultracode/runs/fix-tests",
      runId: "fix-tests",
      worktreeDir: "../worktrees/fix-tests",
    },
  });
  const loaded = readDynamicPlanFile(planFile);

  assert.equal(written.planFile, planFile);
  assert.deepEqual(written.params, {
    target: "docs/tasks/todo.md",
  });
  assert.deepEqual(written.execution, {
    outputDir: ".ultracode/runs/fix-tests",
    runId: "fix-tests",
    worktreeDir: "../worktrees/fix-tests",
  });
  assert.equal(loaded.intent, "Fix tests");
  assert.equal(loaded.plan.workflow.name, "dynamic-fix-tests");
  assert.equal(typeof loaded.createdAt, "string");
  assert.deepEqual(loaded.params, {
    target: "docs/tasks/todo.md",
  });
  assert.deepEqual(loaded.execution, {
    outputDir: ".ultracode/runs/fix-tests",
    runId: "fix-tests",
    worktreeDir: "../worktrees/fix-tests",
  });

  const approved = copyApprovedDynamicPlanFile({
    planFile,
    outputDir,
  });
  const approvedPayload = JSON.parse(fs.readFileSync(approved.approvedPlanFile, "utf8"));

  assert.equal(approved.approvedPlanFile, path.join(outputDir, "approved-plan.json"));
  assert.equal(approvedPayload.sourcePlanFile, planFile);
  assert.equal(approvedPayload.intent, "Fix tests");
  assert.equal(approvedPayload.plan.workflow.name, "dynamic-fix-tests");
  assert.deepEqual(approvedPayload.params, {
    target: "docs/tasks/todo.md",
  });
  assert.deepEqual(approvedPayload.execution, {
    outputDir: ".ultracode/runs/fix-tests",
    runId: "fix-tests",
    worktreeDir: "../worktrees/fix-tests",
  });
});

test("resolveDynamicRunExecutionContext restores plan execution context unless explicit controls override it", async () => {
  const { resolveDynamicRunExecutionContext } = await import(
    path.join(distRoot, "dynamic-plan-file.js")
  );
  const planFile = {
    planFile: ".ultracode/plans/review.plan.json",
    intent: "Review implementation",
    createdAt: "2026-01-01T00:00:00.000Z",
    execution: {
      outputDir: ".ultracode/runs/review-from-plan",
      runId: "review-from-plan",
      worktreeDir: "../worktrees/review-from-plan",
    },
    plan: {
      recommendedAction: "review_dynamic",
      requiresConfirmation: true,
      reason: "No registered workflow clearly matches.",
      preview: {
        summary: "Dynamic research workflow with 1 stage.",
        stageCount: 1,
        writeStages: [],
        outputFiles: ["research.md"],
        risks: [],
        confirmationPrompt: "Approve with approved=true.",
      },
      workflow: {
        name: "dynamic-review",
        stages: [],
      },
    },
  };

  assert.deepEqual(
    resolveDynamicRunExecutionContext({
      input: {},
      planFile,
      defaultRunId: "dynamic-default",
    }),
    {
      outputDir: ".ultracode/runs/review-from-plan",
      runId: "review-from-plan",
      worktreeDir: "../worktrees/review-from-plan",
    },
  );

  assert.deepEqual(
    resolveDynamicRunExecutionContext({
      input: {
        outputDir: ".ultracode/runs/explicit",
        runId: "explicit",
        worktreeDir: "../worktrees/explicit",
      },
      planFile,
      defaultRunId: "dynamic-default",
    }),
    {
      outputDir: ".ultracode/runs/explicit",
      runId: "explicit",
      worktreeDir: "../worktrees/explicit",
    },
  );

  assert.deepEqual(
    resolveDynamicRunExecutionContext({
      input: {},
      defaultRunId: "dynamic-default",
    }),
    {
      outputDir: ".ultracode/runs/dynamic-default",
      runId: "dynamic-default",
      worktreeDir: undefined,
    },
  );
});

test("resolveDynamicRunParams deep merges explicit params over saved plan params", async () => {
  const { resolveDynamicRunParams } = await import(
    path.join(distRoot, "dynamic-plan-file.js")
  );
  const planFile = {
    planFile: ".ultracode/plans/review.plan.json",
    intent: "Review implementation",
    createdAt: "2026-01-01T00:00:00.000Z",
    params: {
      scope: {
        paths: ["scripts/src/cli.ts"],
        details: {
          owner: "maintainers",
          priority: "medium",
        },
      },
      audience: "maintainers",
      tags: ["saved"],
    },
    plan: {
      recommendedAction: "review_dynamic",
      requiresConfirmation: true,
      reason: "No registered workflow clearly matches.",
      preview: {
        summary: "Dynamic research workflow with 1 stage.",
        stageCount: 1,
        writeStages: [],
        outputFiles: ["research.md"],
        risks: [],
        confirmationPrompt: "Approve with approved=true.",
      },
      workflow: {
        name: "dynamic-review",
        stages: [],
      },
    },
  };

  assert.deepEqual(
    resolveDynamicRunParams({
      inputParams: {
        scope: {
          details: {
            priority: "high",
          },
        },
        tags: ["explicit"],
      },
      planFile,
    }),
    {
      scope: {
        paths: ["scripts/src/cli.ts"],
        details: {
          owner: "maintainers",
          priority: "high",
        },
      },
      audience: "maintainers",
      tags: ["explicit"],
    },
  );

  assert.deepEqual(resolveDynamicRunParams({ inputParams: {}, planFile }), planFile.params);
  assert.deepEqual(resolveDynamicRunParams({ inputParams: { audience: "reviewers" } }), {
    audience: "reviewers",
  });
});

test("copyApprovedDynamicPlanFile writes the effective run params and execution context", async () => {
  const { copyApprovedDynamicPlanFile, writeDynamicPlanFile } = await import(
    path.join(distRoot, "dynamic-plan-file.js")
  );
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-approved-effective-"));
  const planFile = path.join(outputDir, "review.plan.json");

  writeDynamicPlanFile({
    planFile,
    intent: "Review implementation",
    params: {
      audience: "maintainers",
      scope: {
        paths: ["scripts/src/cli.ts"],
      },
    },
    execution: {
      outputDir: ".ultracode/runs/saved",
      runId: "saved",
      worktreeDir: "../worktrees/saved",
    },
    plan: {
      recommendedAction: "review_dynamic",
      requiresConfirmation: true,
      reason: "No registered workflow clearly matches.",
      preview: {
        summary: "Dynamic research workflow with 1 stage.",
        stageCount: 1,
        writeStages: [],
        outputFiles: ["research.md"],
        risks: [],
        confirmationPrompt: "Approve with approved=true.",
      },
      workflow: {
        name: "dynamic-review",
        stages: [],
      },
    },
  });

  const approved = copyApprovedDynamicPlanFile({
    planFile,
    outputDir,
    params: {
      audience: "reviewers",
      scope: {
        paths: ["scripts/src/cli.ts"],
        details: {
          priority: "high",
        },
      },
    },
    execution: {
      outputDir: ".ultracode/runs/effective",
      runId: "effective",
      worktreeDir: "../worktrees/effective",
    },
  });
  const approvedPayload = JSON.parse(fs.readFileSync(approved.approvedPlanFile, "utf8"));

  assert.deepEqual(approved.params, {
    audience: "reviewers",
    scope: {
      paths: ["scripts/src/cli.ts"],
      details: {
        priority: "high",
      },
    },
  });
  assert.deepEqual(approved.execution, {
    outputDir: ".ultracode/runs/effective",
    runId: "effective",
    worktreeDir: "../worktrees/effective",
  });
  assert.deepEqual(approvedPayload.params, approved.params);
  assert.deepEqual(approvedPayload.execution, approved.execution);
});
