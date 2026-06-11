import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.resolve(__dirname, "../dist");

test("dynamic planner recommends a named workflow when intent matches the registry", async () => {
  const { planDynamicWorkflow } = await import(path.join(distRoot, "dynamic-planner.js"));

  const plan = planDynamicWorkflow({
    intent: "为第一次去京都的两位成人做 3 天旅游攻略，包含雨天方案",
    availableWorkflows: [
      {
        name: "travel-guide",
        description: "Create a reviewed travel guide.",
        keywords: ["旅游", "旅行", "攻略", "行程", "travel", "trip", "itinerary", "guide"],
        workflowFile: "/registry/travel-guide/workflow.json",
        paramTemplateFile: "/registry/travel-guide/param.template.json",
      },
    ],
  });

  assert.equal(plan.recommendedAction, "run_named");
  assert.equal(plan.workflowName, "travel-guide");
  assert.equal(plan.requiresConfirmation, false);
});

test("dynamic planner recommends registry workflows by keywords instead of hardcoded names", async () => {
  const { planDynamicWorkflow } = await import(path.join(distRoot, "dynamic-planner.js"));

  const plan = planDynamicWorkflow({
    intent: "根据最近的变更生成一份发布说明",
    availableWorkflows: [
      {
        name: "release-notes",
        description: "Generate release notes from repository changes.",
        keywords: ["release notes", "changelog", "发布说明", "变更日志"],
        workflowFile: "/registry/release-notes/workflow.json",
        paramTemplateFile: "/registry/release-notes/param.template.json",
      },
      {
        name: "travel-guide",
        description: "Create a reviewed travel guide.",
        keywords: ["travel", "trip", "itinerary", "guide"],
        workflowFile: "/registry/travel-guide/workflow.json",
        paramTemplateFile: "/registry/travel-guide/param.template.json",
      },
    ],
  });

  assert.equal(plan.recommendedAction, "run_named");
  assert.equal(plan.workflowName, "release-notes");
  assert.equal(plan.reason, "The request matches the registered release-notes workflow.");
});

test("dynamic planner creates a constrained workflow preview when no named workflow matches", async () => {
  const { planDynamicWorkflow } = await import(path.join(distRoot, "dynamic-planner.js"));

  const plan = planDynamicWorkflow({
    intent: "Prepare an onboarding checklist for a new project maintainer",
    availableWorkflows: [],
  });

  assert.equal(plan.recommendedAction, "review_dynamic");
  assert.equal(plan.requiresConfirmation, true);
  assert.equal(plan.workflow.name, "dynamic-prepare-an-onboarding-checklist-for");
  assert.deepEqual(
    plan.workflow.stages.map((stage) => stage.name),
    ["scope-brief", "execute-task", "review-result"],
  );
  assert.equal(plan.workflow.stages[0].type, "codex");
  assert.equal(plan.workflow.stages[2].dependsOn[0], "execute-task");
});

test("dynamic planner creates a code-change workflow with an explicit write stage", async () => {
  const { planDynamicWorkflow } = await import(path.join(distRoot, "dynamic-planner.js"));

  const plan = planDynamicWorkflow({
    intent: "Implement a new repository setting and update the related code",
    availableWorkflows: [],
  });

  assert.equal(plan.recommendedAction, "review_dynamic");
  assert.equal(plan.requiresConfirmation, true);
  assert.deepEqual(
    plan.workflow.stages.map((stage) => stage.name),
    ["change-brief", "implement-change", "review-change"],
  );
  assert.equal(plan.workflow.stages[1].agent.mode, "write");
  assert.equal(plan.workflow.stages[1].dependsOn[0], "change-brief");
  assert.equal(plan.workflow.stages[2].dependsOn[0], "implement-change");
  assert.equal(plan.preview.stageCount, 3);
  assert.deepEqual(plan.preview.writeStages, ["implement-change"]);
  assert.deepEqual(plan.preview.outputFiles, [
    "change-brief.md",
    "implementation-summary.md",
    "implementation-review.md",
  ]);
  assert(plan.preview.risks.some((risk) => /write-mode/i.test(risk)));
  assert.match(plan.preview.confirmationPrompt, /approve/i);
});

test("dynamic planner creates a debug/fix workflow for failing tests and CI", async () => {
  const { planDynamicWorkflow } = await import(path.join(distRoot, "dynamic-planner.js"));

  const plan = planDynamicWorkflow({
    intent: "Debug the failing CI tests, find the root cause, fix the bug, and verify the suite",
    availableWorkflows: [],
  });

  assert.equal(plan.recommendedAction, "review_dynamic");
  assert.deepEqual(
    plan.workflow.stages.map((stage) => stage.name),
    ["reproduce-failure", "diagnose-root-cause", "implement-fix", "verify-fix"],
  );
  assert.equal(plan.workflow.stages[0].agent?.mode, "read-only");
  assert.equal(plan.workflow.stages[2].agent.mode, "write");
  assert.equal(plan.workflow.stages[1].dependsOn[0], "reproduce-failure");
  assert.equal(plan.workflow.stages[2].dependsOn[0], "diagnose-root-cause");
  assert.equal(plan.workflow.stages[3].dependsOn[0], "implement-fix");
  assert.deepEqual(plan.preview.writeStages, ["implement-fix"]);
  assert.deepEqual(plan.preview.outputFiles, [
    "failure-reproduction.md",
    "root-cause-analysis.md",
    "fix-summary.md",
    "verification-report.md",
  ]);
  assert.equal(plan.preview.template, "debug-fix");
  assert.match(plan.reason, /debug\/fix/i);
  assert.deepEqual(plan.preview.stagePlan, [
    {
      name: "reproduce-failure",
      mode: "read-only",
      outputFile: "failure-reproduction.md",
      dependsOn: [],
    },
    {
      name: "diagnose-root-cause",
      mode: "read-only",
      outputFile: "root-cause-analysis.md",
      dependsOn: ["reproduce-failure"],
    },
    {
      name: "implement-fix",
      mode: "write",
      outputFile: "fix-summary.md",
      dependsOn: ["diagnose-root-cause"],
    },
    {
      name: "verify-fix",
      mode: "read-only",
      outputFile: "verification-report.md",
      dependsOn: ["implement-fix"],
    },
  ]);
});

test("dynamic planner creates a research workflow for research intents", async () => {
  const { planDynamicWorkflow } = await import(path.join(distRoot, "dynamic-planner.js"));

  const plan = planDynamicWorkflow({
    intent: "Research the current repository architecture and summarize the tradeoffs",
    availableWorkflows: [],
  });

  assert.equal(plan.recommendedAction, "review_dynamic");
  assert.deepEqual(
    plan.workflow.stages.map((stage) => stage.name),
    ["research-scope", "collect-findings", "synthesize-report"],
  );
  assert.equal(plan.workflow.stages[1].dependsOn[0], "research-scope");
  assert.equal(plan.workflow.stages[2].output.file, "research-report.md");
  assert.equal(plan.preview.stageCount, 3);
  assert.deepEqual(plan.preview.writeStages, []);
  assert.deepEqual(plan.preview.outputFiles, [
    "research-scope.md",
    "research-findings.md",
    "research-report.md",
  ]);
  assert.equal(plan.preview.template, "research");
  assert.match(plan.reason, /research/i);
  assert(plan.preview.risks.some((risk) => /read-only/i.test(risk)));
});

test("dynamic planner creates a content deliverable workflow for task-specific artifacts", async () => {
  const { planDynamicWorkflow } = await import(path.join(distRoot, "dynamic-planner.js"));

  const plan = planDynamicWorkflow({
    intent: "Create a 3-day Kyoto travel guide with rainy-day alternatives",
    availableWorkflows: [],
  });

  assert.equal(plan.recommendedAction, "review_dynamic");
  assert.deepEqual(
    plan.workflow.stages.map((stage) => stage.name),
    ["deliverable-brief", "draft-deliverable", "review-deliverable"],
  );
  assert.deepEqual(plan.preview.writeStages, []);
  assert.equal(plan.preview.template, "content-deliverable");
  assert.match(plan.reason, /content-deliverable/i);
  assert.deepEqual(plan.preview.outputFiles, [
    "deliverable-brief.md",
    "deliverable-draft.md",
    "deliverable-review.md",
  ]);
  assert.match(plan.workflow.description, /content-deliverable workflow/i);
  assert.match(plan.workflow.stages[0].prompt.join("\n"), /audience/i);
  assert.match(plan.workflow.stages[1].prompt.join("\n"), /deliverable/i);
});

test("dynamic planner keeps release notes from repository changes as content deliverables", async () => {
  const { planDynamicWorkflow } = await import(path.join(distRoot, "dynamic-planner.js"));

  for (const intent of [
    "Generate release notes from recent repository changes",
    "根据最近的代码变更生成一份发布说明",
  ]) {
    const plan = planDynamicWorkflow({
      intent,
      availableWorkflows: [],
    });

    assert.equal(plan.recommendedAction, "review_dynamic");
    assert.equal(plan.preview.template, "content-deliverable");
    assert.deepEqual(plan.preview.writeStages, []);
    assert.deepEqual(
      plan.workflow.stages.map((stage) => stage.name),
      ["deliverable-brief", "draft-deliverable", "review-deliverable"],
    );
  }
});

test("dynamic planner keeps review and risk report intents read-only", async () => {
  const { planDynamicWorkflow } = await import(path.join(distRoot, "dynamic-planner.js"));

  for (const intent of [
    "Review implementation risks",
    "Review the current implementation plan and produce a risk report",
    "分析当前实现方案的风险并输出改进建议",
  ]) {
    const plan = planDynamicWorkflow({
      intent,
      availableWorkflows: [],
    });

    assert.equal(plan.recommendedAction, "review_dynamic");
    assert.deepEqual(
      plan.workflow.stages.map((stage) => stage.name),
      ["research-scope", "collect-findings", "synthesize-report"],
    );
    assert.deepEqual(plan.preview.writeStages, []);
    assert(plan.preview.risks.some((risk) => /read-only/i.test(risk)));
  }
});
