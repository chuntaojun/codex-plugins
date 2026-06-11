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

function createRegistryFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-registry-"));
  const workflowDir = path.join(root, "travel-guide");
  writeJson(path.join(workflowDir, "workflow.json"), {
    name: "travel-guide",
    description: "Create a reviewed travel guide.",
    keywords: ["travel", "trip", "攻略"],
    stages: [
      {
        name: "draft",
        type: "codex",
        prompt: ["Draft input.trip."],
        output: { file: "travel-guide.md" },
      },
    ],
  });
  writeJson(path.join(workflowDir, "param.template.json"), {
    mode: "read-only",
    goal: "Create a practical travel guide.",
    trip: {
      destination: "Unknown destination",
      pace: "balanced, not rushed",
      constraints: ["avoid claiming live availability"],
    },
  });
  fs.writeFileSync(path.join(workflowDir, "README.md"), "# Travel Guide\n");

  const writeWorkflowDir = path.join(root, "repo-change");
  writeJson(path.join(writeWorkflowDir, "workflow.json"), {
    name: "repo-change",
    description: "Make a scoped repository change.",
    keywords: ["change", "modify", "改代码"],
    stages: [
      {
        name: "brief",
        type: "codex",
        prompt: ["Create an implementation brief."],
        output: { file: "brief.md" },
      },
      {
        name: "implement",
        type: "codex",
        dependsOn: ["brief"],
        agent: { mode: "write" },
        prompt: ["Implement the change."],
        output: { file: "implementation.md" },
      },
    ],
  });
  writeJson(path.join(writeWorkflowDir, "param.template.json"), {
    mode: "read-only",
    goal: "Make a scoped repository change.",
  });
  return root;
}

test("named workflow registry discovers workflows with templates", async () => {
  const { listNamedWorkflows, resolveNamedWorkflow } = await import(
    path.join(distRoot, "named-workflows.js")
  );
  const registryDir = createRegistryFixture();

  const workflows = listNamedWorkflows({ registryDir });
  assert.deepEqual(workflows.map((workflow) => workflow.name), ["repo-change", "travel-guide"]);
  assert.equal(workflows[1].description, "Create a reviewed travel guide.");
  assert.deepEqual(workflows[1].keywords, ["travel", "trip", "攻略"]);
  assert.deepEqual(workflows[0].writeStages, ["implement"]);
  assert.deepEqual(workflows[0].stagePlan, [
    {
      name: "brief",
      mode: "read-only",
      outputFile: "brief.md",
      dependsOn: [],
    },
    {
      name: "implement",
      mode: "write",
      outputFile: "implementation.md",
      dependsOn: ["brief"],
    },
  ]);

  const resolved = resolveNamedWorkflow("travel-guide", { registryDir });
  assert.equal(resolved.name, "travel-guide");
  assert.equal(resolved.workflowFile, path.join(registryDir, "travel-guide/workflow.json"));
  assert.equal(
    resolved.paramTemplateFile,
    path.join(registryDir, "travel-guide/param.template.json"),
  );
  assert.equal(resolved.readmeFile, path.join(registryDir, "travel-guide/README.md"));
});

test("param resolver deep merges user params and preserves the natural-language intent", async () => {
  const { createParamFileFromTemplate } = await import(
    path.join(distRoot, "named-workflows.js")
  );
  const registryDir = createRegistryFixture();
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-param-"));

  const result = createParamFileFromTemplate({
    templateFile: path.join(registryDir, "travel-guide/param.template.json"),
    outputDir,
    workflowName: "travel-guide",
    intent: "为第一次去京都的两位成人做 3 天旅游攻略，节奏轻松一点，包含雨天方案",
    params: {
      trip: {
        destination: "Kyoto, Japan",
        durationDays: 3,
        travelers: "two adults visiting for the first time",
        constraints: ["include rainy-day alternatives"],
      },
    },
  });

  const param = JSON.parse(fs.readFileSync(result.paramFile, "utf8"));
  assert.equal(param.mode, "read-only");
  assert.equal(param.goal, "为第一次去京都的两位成人做 3 天旅游攻略，节奏轻松一点，包含雨天方案");
  assert.equal(param.intent, "为第一次去京都的两位成人做 3 天旅游攻略，节奏轻松一点，包含雨天方案");
  assert.equal(param.trip.destination, "Kyoto, Japan");
  assert.equal(param.trip.durationDays, 3);
  assert.equal(param.trip.pace, "balanced, not rushed");
  assert.deepEqual(param.trip.constraints, ["include rainy-day alternatives"]);
});

test("writeApprovedNamedWorkflowFile writes an approval audit snapshot", async () => {
  const { writeApprovedNamedWorkflowFile } = await import(
    path.join(distRoot, "named-workflows.js")
  );
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-named-approval-"));

  const approved = writeApprovedNamedWorkflowFile({
    outputDir,
    workflowName: "repo-change",
    workflowFile: "/plugin/workflows/repo-change/workflow.json",
    paramFile: `${outputDir}/param.generated.json`,
    intent: "Modify repository configuration",
    params: {
      change: {
        file: ".gitignore",
      },
    },
    execution: {
      runId: "repo-change",
      outputDir: ".ultracode/runs/repo-change",
      worktreeDir: "../worktrees/repo-change",
    },
    createdAt: "2026-06-08T20:10:00.000Z",
  });

  assert.equal(approved.approvedNamedWorkflowFile, path.join(outputDir, "approved-named-workflow.json"));
  const payload = JSON.parse(fs.readFileSync(approved.approvedNamedWorkflowFile, "utf8"));
  assert.deepEqual(payload, {
    workflowName: "repo-change",
    workflowFile: "/plugin/workflows/repo-change/workflow.json",
    paramFile: `${outputDir}/param.generated.json`,
    intent: "Modify repository configuration",
    createdAt: "2026-06-08T20:10:00.000Z",
    params: {
      change: {
        file: ".gitignore",
      },
    },
    execution: {
      runId: "repo-change",
      outputDir: ".ultracode/runs/repo-change",
      worktreeDir: "../worktrees/repo-change",
    },
  });
});
