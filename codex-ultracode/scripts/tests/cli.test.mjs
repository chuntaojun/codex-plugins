import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.resolve(__dirname, "../dist");
const runnerPath = path.resolve(__dirname, "../run-ultracode.mjs");

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createWriteWorkflowRegistry() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-cli-registry-"));
  const workflowDir = path.join(root, "repo-change");
  writeJson(path.join(workflowDir, "workflow.json"), {
    name: "repo-change",
    description: "Make a scoped repository change.",
    keywords: ["modify", "repository", "configuration"],
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
  writeJson(path.join(workflowDir, "param.template.json"), {
    mode: "read-only",
    goal: "Make a scoped repository change.",
  });
  return root;
}

function createReadOnlyWorkflowRegistry() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-cli-readonly-registry-"));
  const workflowDir = path.join(root, "release-notes");
  writeJson(path.join(workflowDir, "workflow.json"), {
    name: "release-notes",
    description: "Generate release notes from repository changes.",
    keywords: ["release notes", "changelog", "发布说明"],
    stages: [
      {
        name: "draft",
        type: "codex",
        prompt: ["Draft release notes."],
        output: { file: "release-notes.md" },
      },
      {
        name: "review",
        type: "codex",
        dependsOn: ["draft"],
        prompt: ["Review release notes."],
        output: { file: "release-notes-review.md" },
      },
    ],
  });
  writeJson(path.join(workflowDir, "param.template.json"), {
    mode: "read-only",
    goal: "Generate release notes.",
  });
  return root;
}

function createCompletedRun(root, runId, workflow, outputText) {
  const outputDir = path.join(root, ".ultracode/runs", runId);
  const artifact = path.join(outputDir, "stages/001-final/attempts/001/final.md");
  fs.mkdirSync(path.dirname(artifact), { recursive: true });
  fs.writeFileSync(artifact, outputText);
  fs.writeFileSync(path.join(outputDir, "trace.jsonl"), "{\"type\":\"workflow.completed\"}\n");
  writeJson(path.join(outputDir, "workflow-result.json"), {
    workflow,
    status: "completed",
    outputDir,
    stages: [
      {
        stage: "final",
        status: "passed",
        attempt: 1,
        stageDir: path.join(outputDir, "stages/001-final"),
        attemptDir: path.dirname(artifact),
        inputFile: path.join(path.dirname(artifact), "input.json"),
        promptFile: path.join(path.dirname(artifact), "prompt.md"),
        outputFile: artifact,
        resultFile: path.join(path.dirname(artifact), "result.json"),
      },
    ],
  });
  return outputDir;
}

function createRestartableRun(root, runId) {
  const outputDir = path.join(root, ".ultracode/runs", runId);
  const stageDir = path.join(outputDir, "stages/001-draft");
  const attemptDir = path.join(stageDir, "attempts/001");
  const stage = {
    index: 1,
    name: "draft",
    input: {
      topic: "stage action",
    },
    prompt: "Draft the update.",
    agent: {
      label: "draft",
      mode: "read-only",
      outputFile: "draft.md",
    },
  };
  const result = {
    stage: "draft",
    status: "passed",
    attempt: 1,
    stageDir,
    attemptDir,
    inputFile: path.join(attemptDir, "input.json"),
    promptFile: path.join(attemptDir, "prompt.md"),
    outputFile: path.join(attemptDir, "draft.md"),
    resultFile: path.join(attemptDir, "result.json"),
  };
  writeJson(path.join(attemptDir, "stage.json"), stage);
  writeJson(result.inputFile, stage.input);
  fs.writeFileSync(result.promptFile, stage.prompt);
  fs.writeFileSync(result.outputFile, "attempt 1");
  writeJson(result.resultFile, result);
  writeJson(path.join(stageDir, "latest-result.json"), result);
  writeJson(path.join(outputDir, "workflow-result.json"), {
    workflow: "manual-flow",
    status: "completed",
    outputDir,
    stages: [
      {
        ...result,
        input: stage.input,
      },
    ],
  });
  return outputDir;
}

function createFakeCodexBin() {
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-fake-codex-"));
  const binPath = path.join(binDir, "codex");
  fs.writeFileSync(
    binPath,
    [
      "#!/usr/bin/env node",
      "const fs = require('node:fs');",
      "const path = require('node:path');",
      "const outputIndex = process.argv.indexOf('--output-last-message');",
      "if (outputIndex < 0) process.exit(2);",
      "const outputFile = process.argv[outputIndex + 1];",
      "fs.mkdirSync(path.dirname(outputFile), { recursive: true });",
      "fs.writeFileSync(outputFile, 'fake codex output');",
      "console.log(JSON.stringify({ session_id: 'fake-session' }));",
    ].join("\n"),
    { mode: 0o755 },
  );
  return binDir;
}

function createGitRepo(prefix) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const repoRoot = path.join(parent, "project");
  fs.mkdirSync(repoRoot, { recursive: true });
  execFileSync("git", ["init"], { cwd: repoRoot, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "ultracode@example.com"], {
    cwd: repoRoot,
    stdio: "ignore",
  });
  execFileSync("git", ["config", "user.name", "Ultracode Test"], {
    cwd: repoRoot,
    stdio: "ignore",
  });
  fs.writeFileSync(path.join(repoRoot, "README.md"), "test repository\n");
  execFileSync("git", ["add", "README.md"], { cwd: repoRoot, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "initial"], { cwd: repoRoot, stdio: "ignore" });
  return { parent, repoRoot };
}

test("parseCliArgs supports ultracode run workflow.json param.json", async () => {
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

test("CLI help prints friendly task-first usage without treating help as an intent", () => {
  const stdout = execFileSync(process.execPath, [runnerPath, "help"], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
  });

  assert.match(stdout, /Usage:/);
  assert.match(stdout, /ultracode "<task intent>"/);
  assert.match(stdout, /Common commands:/);
  assert.match(stdout, /ultracode plan-dynamic --intent "<task intent>"/);
  assert.match(stdout, /Write-capable named workflows require --approved true/);
  assert.doesNotMatch(stdout, /workflow\.failed/);
});

test("CLI --help prints the same friendly usage", () => {
  const helpStdout = execFileSync(process.execPath, [runnerPath, "help"], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
  });
  const flagStdout = execFileSync(process.execPath, [runnerPath, "--help"], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
  });

  assert.equal(flagStdout, helpStdout);
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
  assert.equal(input.outputDir, ".ultracode/runs/manual-run");
});

test("parseCliArgs supports named workflow runs with intent and params", async () => {
  const { parseCliArgs } = await import(path.join(distRoot, "cli.js"));

  const input = parseCliArgs([
    "run-name",
    "travel-guide",
    "--intent",
    "Create a relaxed Kyoto guide with rainy-day alternatives",
    "--params",
    "{\"trip\":{\"destination\":\"Kyoto, Japan\",\"durationDays\":3}}",
    "--run-id",
    "kyoto-guide",
  ]);

  assert.equal(input.command, "run-named");
  assert.equal(input.workflowName, "travel-guide");
  assert.equal(input.intent, "Create a relaxed Kyoto guide with rainy-day alternatives");
  assert.deepEqual(input.params, {
    trip: {
      destination: "Kyoto, Japan",
      durationDays: 3,
    },
  });
  assert.equal(input.runId, "kyoto-guide");
  assert.equal(input.outputDir, ".ultracode/runs/kyoto-guide");
});

test("parseCliArgs supports named workflow discovery commands", async () => {
  const { parseCliArgs } = await import(path.join(distRoot, "cli.js"));

  assert.deepEqual(parseCliArgs(["list-workflows", "--registry-dir", "/tmp/registry"]), {
    command: "list-workflows",
    registryDir: "/tmp/registry",
    json: false,
  });
  assert.deepEqual(parseCliArgs(["describe-workflow", "travel-guide", "--json"]), {
    command: "describe-workflow",
    workflowName: "travel-guide",
    registryDir: undefined,
    json: true,
  });
});

test("parseCliArgs supports dynamic workflow planning", async () => {
  const { parseCliArgs } = await import(path.join(distRoot, "cli.js"));

  assert.deepEqual(parseCliArgs([
    "plan-dynamic",
    "--intent",
    "Review the plan",
    "--output-plan",
    ".ultracode/plans/review.json",
    "--json",
  ]), {
    command: "plan-dynamic",
    intent: "Review the plan",
    params: {},
    outputPlan: ".ultracode/plans/review.json",
    outputDir: undefined,
    runId: undefined,
    worktreeDir: undefined,
    registryDir: undefined,
    json: true,
  });

  assert.deepEqual(parseCliArgs([
    "plan-dynamic",
    "--intent",
    "Review the plan",
    "--params",
    "{\"scope\":{\"paths\":[\"README.md\"]}}",
    "--outputDir",
    ".ultracode/runs/review",
    "--run-id",
    "review",
    "--worktree-dir",
    "../worktrees/review",
  ]), {
    command: "plan-dynamic",
    intent: "Review the plan",
    params: {
      scope: {
        paths: ["README.md"],
      },
    },
    outputPlan: undefined,
    outputDir: ".ultracode/runs/review",
    runId: "review",
    worktreeDir: "../worktrees/review",
    registryDir: undefined,
    json: false,
  });
});

test("parseCliArgs supports intent dispatch", async () => {
  const { parseCliArgs } = await import(path.join(distRoot, "cli.js"));

  assert.deepEqual(parseCliArgs([
    "dispatch",
    "--intent",
    "Modify repository configuration",
    "--params",
    "{\"target\":\"config\"}",
    "--run-id",
    "repo-change",
    "--json",
  ]), {
    command: "dispatch",
    intent: "Modify repository configuration",
    params: {
      target: "config",
    },
    outputPlan: undefined,
    outputDir: undefined,
    runId: "repo-change",
    worktreeDir: undefined,
    registryDir: undefined,
    json: true,
  });
});

test("parseCliArgs supports friendly intent dispatch shortcut", async () => {
  const { parseCliArgs } = await import(path.join(distRoot, "cli.js"));

  assert.deepEqual(parseCliArgs([
    "Review the current implementation plan and produce a risk report",
  ]), {
    command: "dispatch",
    intent: "Review the current implementation plan and produce a risk report",
    params: {},
    outputPlan: undefined,
    outputDir: undefined,
    runId: undefined,
    worktreeDir: undefined,
    registryDir: undefined,
    json: false,
  });
});

test("parseCliArgs supports friendly named workflow shortcut", async () => {
  const { parseCliArgs } = await import(path.join(distRoot, "cli.js"));

  const input = parseCliArgs([
    "travel-guide",
    "Create a relaxed 3-day Kyoto guide with rainy-day alternatives",
    "--params",
    "{\"trip\":{\"destination\":\"Kyoto, Japan\",\"durationDays\":3}}",
    "--run-id",
    "kyoto-shortcut",
  ]);

  assert.equal(input.command, "run-named");
  assert.equal(input.workflowName, "travel-guide");
  assert.equal(input.intent, "Create a relaxed 3-day Kyoto guide with rainy-day alternatives");
  assert.deepEqual(input.params, {
    trip: {
      destination: "Kyoto, Japan",
      durationDays: 3,
    },
  });
  assert.equal(input.runId, "kyoto-shortcut");
  assert.equal(input.outputDir, ".ultracode/runs/kyoto-shortcut");
});

test("formatNamedWorkflowConfirmation renders the approval preview and next command", async () => {
  const { formatNamedWorkflowConfirmation } = await import(path.join(distRoot, "cli.js"));

  const output = formatNamedWorkflowConfirmation({
    workflow: {
      name: "repo-change",
      description: "Make a scoped repository change.",
      keywords: ["modify", "repository"],
      workflowFile: "/tmp/registry/repo-change/workflow.json",
      paramTemplateFile: "/tmp/registry/repo-change/param.template.json",
      writeStages: ["implement"],
      outputFiles: ["brief.md", "implementation.md"],
      stagePlan: [
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
      ],
    },
    intent: "Modify repository configuration",
    reason: "The request matches the registered repo-change workflow.",
    nextCommand:
      "ultracode repo-change 'Modify repository configuration' --run-id repo-change",
  });

  assert.match(output, /Recommended action: confirm named workflow/);
  assert.match(output, /Workflow: repo-change/);
  assert.match(output, /Reason: The request matches the registered repo-change workflow/);
  assert.match(output, /Stage plan:/);
  assert.match(output, /- brief \[read-only\] -> brief\.md \(depends on: none\)/);
  assert.match(output, /- implement \[write\] -> implementation\.md \(depends on: brief\)/);
  assert.match(output, /Write stages: implement/);
  assert.match(output, /Output files: brief\.md, implementation\.md/);
  assert.match(output, /Next command after approval:/);
  assert.match(output, /ultracode repo-change 'Modify repository configuration' --run-id repo-change/);
});

test("friendly dispatch confirmation emits a friendly named shortcut", () => {
  const registryDir = createWriteWorkflowRegistry();
  const stdout = execFileSync(
    process.execPath,
    [
      runnerPath,
      "Modify repository configuration",
      "--registry-dir",
      registryDir,
      "--run-id",
      "repo-change",
      "--json",
    ],
    {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
    },
  );
  const payload = JSON.parse(stdout);

  assert.equal(payload.dispatch.action, "needs_confirmation");
  assert.equal(payload.dispatch.tool, "ultracode_run_named");
  assert.equal(payload.preview.template, "named-workflow");
  assert.deepEqual(payload.preview.writeStages, ["implement"]);
  assert.match(payload.preview.confirmationPrompt, /Approve this named workflow preview/);
  assert.equal(
    payload.nextCommand,
    `ultracode repo-change 'Modify repository configuration' --approved true --run-id repo-change --registry-dir ${registryDir}`,
  );
  assert.equal(payload.executionAfterApproval.nextCommand, payload.nextCommand);
  assert.match(payload.executionAfterApproval.confirmationGate, /approved/i);
});

test("formatDynamicDispatchConfirmation renders plan file and next command", async () => {
  const { formatDynamicDispatchConfirmation } = await import(path.join(distRoot, "cli.js"));

  const output = formatDynamicDispatchConfirmation({
    plan: {
      recommendedAction: "review_dynamic",
      requiresConfirmation: true,
      reason: "No registered workflow clearly matches.",
      preview: {
        summary: "Dynamic research workflow with 2 stages.",
        stageCount: 2,
        writeStages: [],
        outputFiles: ["research-brief.md", "research-summary.md"],
        stagePlan: [
          {
            name: "research-brief",
            mode: "read-only",
            outputFile: "research-brief.md",
            dependsOn: [],
          },
        ],
        risks: ["Read-only workflow. Verify external facts before relying on the result."],
        confirmationPrompt: "Review this preview, then approve execution with approved=true.",
      },
      workflow: {
        name: "dynamic-research",
        description: "Dynamic research workflow.",
        stages: [],
      },
    },
    planFile: "/repo/project/.ultracode/plans/research.plan.json",
    nextCommand:
      "ultracode run-dynamic --plan-file /repo/project/.ultracode/plans/research.plan.json --approved true",
  });

  assert.match(output, /Recommended action: review dynamic workflow/);
  assert.match(output, /Plan file: \/repo\/project\/\.ultracode\/plans\/research\.plan\.json/);
  assert.match(output, /Next command after approval:/);
  assert.match(output, /ultracode run-dynamic --plan-file \/repo\/project\/\.ultracode\/plans\/research\.plan\.json --approved true/);
});

test("friendly dynamic dispatch preserves params and execution controls in the approval command", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-dynamic-dispatch-"));
  const stdout = execFileSync(
    process.execPath,
    [
      runnerPath,
      "Draft a stakeholder briefing for launch dependencies and owner handoffs",
      "--params",
      JSON.stringify({
        scope: {
          paths: ["scripts/src/cli.ts"],
        },
        audience: "maintainers",
      }),
      "--outputDir",
      ".ultracode/runs/risk-review",
      "--run-id",
      "risk-review",
      "--worktree-dir",
      "../codex-ultracode.worktrees/risk-review",
      "--json",
    ],
    {
      cwd,
      encoding: "utf8",
    },
  );
  const payload = JSON.parse(stdout);

  assert.equal(payload.dispatch.action, "needs_confirmation");
  assert.equal(payload.dispatch.tool, "ultracode_run_dynamic");
  assert.equal(payload.recommendedAction, "review_dynamic");
  assert.equal(typeof payload.planFile, "string");
  assert.match(payload.nextCommand, /^ultracode run-dynamic --plan-file .+ --approved true/);
  assert.match(
    payload.nextCommand,
    /--params '\{"scope":\{"paths":\["scripts\/src\/cli\.ts"\]\},"audience":"maintainers"\}'/,
  );
  assert.match(payload.nextCommand, /--outputDir \.ultracode\/runs\/risk-review/);
  assert.match(payload.nextCommand, /--run-id risk-review/);
  assert.match(payload.nextCommand, /\.\.\/codex-ultracode\.worktrees\/risk-review/);
  assert.equal(payload.executionAfterApproval.nextCommand, payload.nextCommand);
  assert.match(payload.executionAfterApproval.confirmationGate, /approved/i);

  const planFile = JSON.parse(fs.readFileSync(payload.planFile, "utf8"));
  assert.deepEqual(planFile.params, {
    scope: {
      paths: ["scripts/src/cli.ts"],
    },
    audience: "maintainers",
  });
  assert.deepEqual(planFile.execution, {
    outputDir: ".ultracode/runs/risk-review",
    runId: "risk-review",
    worktreeDir: "../codex-ultracode.worktrees/risk-review",
  });
});

test("formatDynamicWorkflowPlan renders a confirmation-friendly preview", async () => {
  const { formatDynamicWorkflowPlan } = await import(path.join(distRoot, "cli.js"));

  const output = formatDynamicWorkflowPlan({
    recommendedAction: "review_dynamic",
    requiresConfirmation: true,
    reason: "No registered workflow clearly matches.",
    preview: {
      template: "code-change",
      summary: "Dynamic code-change workflow with 3 stages.",
      stageCount: 3,
      writeStages: ["implement-change"],
      outputFiles: [
        "change-brief.md",
        "implementation-summary.md",
        "implementation-review.md",
      ],
      stagePlan: [
        {
          name: "change-brief",
          mode: "read-only",
          outputFile: "change-brief.md",
          dependsOn: [],
        },
        {
          name: "implement-change",
          mode: "write",
          outputFile: "implementation-summary.md",
          dependsOn: ["change-brief"],
        },
        {
          name: "review-change",
          mode: "read-only",
          outputFile: "implementation-review.md",
          dependsOn: ["implement-change"],
        },
      ],
      risks: [
        "Includes write-mode stages. Review scope before approving execution.",
      ],
      confirmationPrompt: "Review this preview, then approve execution with approved=true.",
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
  });

  assert.match(output, /Preview:/);
  assert.match(output, /Template: code-change/);
  assert.match(output, /Dynamic code-change workflow with 3 stages/);
  assert.match(output, /Approval required: yes/);
  assert.match(output, /Stage plan:/);
  assert.match(output, /- change-brief \[read-only\] -> change-brief\.md \(depends on: none\)/);
  assert.match(output, /- implement-change \[write\] -> implementation-summary\.md \(depends on: change-brief\)/);
  assert.match(output, /Write stages: implement-change/);
  assert.match(output, /Output files: change-brief\.md, implementation-summary\.md, implementation-review\.md/);
  assert.match(output, /Includes write-mode stages/);
  assert.match(output, /Full workflow JSON:/);
});

test("CLI plan-dynamic writes a reusable plan file by default for dynamic previews", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-plan-dynamic-"));
  const stdout = execFileSync(
    process.execPath,
    [
      runnerPath,
      "plan-dynamic",
      "--intent",
      "Draft a stakeholder briefing for launch dependencies and owner handoffs",
      "--json",
    ],
    {
      cwd,
      encoding: "utf8",
    },
  );
  const payload = JSON.parse(stdout);

  assert.equal(payload.recommendedAction, "review_dynamic");
  assert.equal(typeof payload.planFile, "string");
  assert.match(payload.planFile, /\.ultracode\/plans\/.+\.plan\.json$/);
  assert.equal(fs.existsSync(payload.planFile), true);
  assert.equal(
    payload.nextCommand,
    `ultracode run-dynamic --plan-file ${payload.planFile} --approved true`,
  );
  assert.deepEqual(payload.executionAfterApproval, {
    nextCommand: payload.nextCommand,
    confirmationGate: "Only run this command after the user has approved the dynamic workflow preview.",
  });

  const planFile = JSON.parse(fs.readFileSync(payload.planFile, "utf8"));
  assert.equal(planFile.intent, "Draft a stakeholder briefing for launch dependencies and owner handoffs");
  assert.equal(planFile.plan.recommendedAction, "review_dynamic");
});

test("CLI plan-dynamic exposes content deliverable dynamic previews", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-plan-content-"));
  const registryDir = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-empty-registry-"));
  const stdout = execFileSync(
    process.execPath,
    [
      runnerPath,
      "plan-dynamic",
      "--intent",
      "Create a 3-day Kyoto travel guide with rainy-day alternatives",
      "--registry-dir",
      registryDir,
      "--json",
    ],
    {
      cwd,
      encoding: "utf8",
    },
  );
  const payload = JSON.parse(stdout);

  assert.equal(payload.recommendedAction, "review_dynamic");
  assert.deepEqual(
    payload.preview.stagePlan.map((stage) => stage.name),
    ["deliverable-brief", "draft-deliverable", "review-deliverable"],
  );
  assert.equal(payload.preview.template, "content-deliverable");
  assert.match(payload.reason, /content-deliverable/i);
  assert.deepEqual(payload.preview.writeStages, []);
  assert.match(payload.preview.summary, /content-deliverable workflow/i);

  const planFile = JSON.parse(fs.readFileSync(payload.planFile, "utf8"));
  assert.equal(planFile.plan.preview.template, "content-deliverable");
  assert.deepEqual(
    planFile.plan.workflow.stages.map((stage) => stage.name),
    ["deliverable-brief", "draft-deliverable", "review-deliverable"],
  );
});

test("CLI plan-dynamic preserves params and execution controls for dynamic previews", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-plan-dynamic-context-"));
  const stdout = execFileSync(
    process.execPath,
    [
      runnerPath,
      "plan-dynamic",
      "--intent",
      "Draft a stakeholder briefing for launch dependencies and owner handoffs",
      "--params",
      JSON.stringify({
        scope: {
          paths: ["scripts/src/cli.ts"],
        },
      }),
      "--outputDir",
      ".ultracode/runs/risk-review",
      "--run-id",
      "risk-review",
      "--worktree-dir",
      "../codex-ultracode.worktrees/risk-review",
      "--json",
    ],
    {
      cwd,
      encoding: "utf8",
    },
  );
  const payload = JSON.parse(stdout);

  assert.equal(payload.recommendedAction, "review_dynamic");
  assert.equal(typeof payload.planFile, "string");
  assert.match(
    payload.nextCommand,
    /--params '\{"scope":\{"paths":\["scripts\/src\/cli\.ts"\]\}\}'/,
  );
  assert.match(payload.nextCommand, /--outputDir \.ultracode\/runs\/risk-review/);
  assert.match(payload.nextCommand, /--run-id risk-review/);
  assert.match(payload.nextCommand, /\.\.\/codex-ultracode\.worktrees\/risk-review/);
  assert.equal(payload.executionAfterApproval.nextCommand, payload.nextCommand);
  assert.match(payload.executionAfterApproval.confirmationGate, /approved/i);
});

test("CLI plan-dynamic non-json output includes the next approval command", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-plan-dynamic-text-"));
  const stdout = execFileSync(
    process.execPath,
    [
      runnerPath,
      "plan-dynamic",
      "--intent",
      "Draft a stakeholder briefing for launch dependencies and owner handoffs",
    ],
    {
      cwd,
      encoding: "utf8",
    },
  );

  assert.match(stdout, /Plan file: .+\.ultracode\/plans\/.+\.plan\.json/);
  assert.match(stdout, /Next command after approval:/);
  assert.match(stdout, /ultracode run-dynamic --plan-file .+\.plan\.json --approved true/);
});

test("CLI plan-dynamic returns a named workflow next command", () => {
  const registryDir = createWriteWorkflowRegistry();
  const stdout = execFileSync(
    process.execPath,
    [
      runnerPath,
      "plan-dynamic",
      "--intent",
      "Modify repository configuration",
      "--registry-dir",
      registryDir,
      "--json",
    ],
    {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
    },
  );
  const payload = JSON.parse(stdout);

  assert.equal(payload.recommendedAction, "run_named");
  assert.equal(payload.workflowName, "repo-change");
  assert.equal(payload.preview.template, "named-workflow");
  assert.match(payload.preview.summary, /repo-change is a registered named workflow with 2 stages/);
  assert.deepEqual(payload.preview.writeStages, ["implement"]);
  assert.deepEqual(payload.preview.outputFiles, ["brief.md", "implementation.md"]);
  assert.match(payload.preview.confirmationPrompt, /Approve this named workflow preview/);
  assert.deepEqual(payload.workflow.writeStages, ["implement"]);
  assert.deepEqual(payload.workflow.outputFiles, ["brief.md", "implementation.md"]);
  assert.deepEqual(
    payload.workflow.stagePlan.map((stage) => [stage.name, stage.mode, stage.outputFile]),
    [
      ["brief", "read-only", "brief.md"],
      ["implement", "write", "implementation.md"],
    ],
  );
  assert.equal(payload.requiresConfirmation, true);
  assert.equal(payload.nextCommand, undefined);
  assert.equal(
    payload.executionAfterApproval.nextCommand,
    `ultracode repo-change 'Modify repository configuration' --approved true --registry-dir ${registryDir}`,
  );
  assert.match(payload.executionAfterApproval.confirmationGate, /approved/i);
});

test("CLI plan-dynamic returns direct execution envelope for read-only named workflows", () => {
  const registryDir = createReadOnlyWorkflowRegistry();
  const stdout = execFileSync(
    process.execPath,
    [
      runnerPath,
      "plan-dynamic",
      "--intent",
      "Generate release notes from repository changes",
      "--registry-dir",
      registryDir,
      "--json",
    ],
    {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
    },
  );
  const payload = JSON.parse(stdout);

  assert.equal(payload.recommendedAction, "run_named");
  assert.equal(payload.workflowName, "release-notes");
  assert.equal(payload.preview.template, "named-workflow");
  assert.match(payload.preview.summary, /release-notes is a registered named workflow/);
  assert.deepEqual(payload.preview.writeStages, []);
  assert.match(payload.preview.confirmationPrompt, /No approval is required/);
  assert.equal(payload.requiresConfirmation, false);
  assert.equal(
    payload.nextCommand,
    `ultracode release-notes 'Generate release notes from repository changes' --registry-dir ${registryDir}`,
  );
  assert.deepEqual(payload.execution, {
    nextCommand: payload.nextCommand,
    approvalRequired: false,
  });
});

test("CLI dispatch --json returns one payload after running a read-only named workflow", () => {
  const registryDir = createReadOnlyWorkflowRegistry();
  const { parent, repoRoot } = createGitRepo("ultracode-cli-dispatch-readonly-json-");
  const fakeCodexBin = createFakeCodexBin();
  const env = {
    ...process.env,
    PATH: `${fakeCodexBin}${path.delimiter}${process.env.PATH ?? ""}`,
  };
  const expectedWorktreeRoot = path.join(parent, "project.worktrees", "release-json");
  const expectedOutputDir = path.join(expectedWorktreeRoot, ".ultracode/runs/release-json");

  const stdout = execFileSync(
    process.execPath,
    [
      runnerPath,
      "dispatch",
      "--intent",
      "Generate release notes from repository changes",
      "--registry-dir",
      registryDir,
      "--run-id",
      "release-json",
      "--json",
    ],
    {
      cwd: repoRoot,
      env,
      encoding: "utf8",
    },
  );
  const payload = JSON.parse(stdout);

  assert.equal(payload.dispatch.action, "ran_named");
  assert.equal(payload.dispatch.tool, "ultracode_run_named");
  assert.equal(payload.recommendedAction, "run_named");
  assert.equal(payload.workflowName, "release-notes");
  assert.equal(payload.workflow.name, "release-notes");
  assert.equal(
    fs.realpathSync(payload.workflow.paramFile),
    fs.realpathSync(path.join(expectedOutputDir, "param.generated.json")),
  );
  assert.equal(fs.realpathSync(payload.worktree.root), fs.realpathSync(expectedWorktreeRoot));
  assert.equal(payload.worktree.created, true);
  assert.equal(payload.worktree.branch, "codex/ultracode-release-json");
  assert.equal(payload.inspection.runId, "release-json");
  assert.equal(fs.realpathSync(payload.inspection.outputDir), fs.realpathSync(expectedOutputDir));
  assert.equal(payload.followUp.type, "workflow.next_actions");
  assert.deepEqual(payload.followUp.commands, payload.inspection.commands);
  assert.equal(payload.result.status, "completed");
});

test("CLI run-name --json returns one named workflow run payload", () => {
  const registryDir = createReadOnlyWorkflowRegistry();
  const { parent, repoRoot } = createGitRepo("ultracode-cli-run-name-json-");
  const fakeCodexBin = createFakeCodexBin();
  const env = {
    ...process.env,
    PATH: `${fakeCodexBin}${path.delimiter}${process.env.PATH ?? ""}`,
  };
  const expectedWorktreeRoot = path.join(parent, "project.worktrees", "direct-json");
  const expectedOutputDir = path.join(expectedWorktreeRoot, ".ultracode/runs/direct-json");

  const stdout = execFileSync(
    process.execPath,
    [
      runnerPath,
      "run-name",
      "release-notes",
      "--intent",
      "Generate release notes from repository changes",
      "--registry-dir",
      registryDir,
      "--run-id",
      "direct-json",
      "--json",
    ],
    {
      cwd: repoRoot,
      env,
      encoding: "utf8",
    },
  );
  const payload = JSON.parse(stdout);

  assert.equal(payload.workflow.name, "release-notes");
  assert.equal(fs.realpathSync(payload.worktree.root), fs.realpathSync(expectedWorktreeRoot));
  assert.equal(payload.worktree.created, true);
  assert.equal(payload.inspection.runId, "direct-json");
  assert.equal(fs.realpathSync(payload.inspection.outputDir), fs.realpathSync(expectedOutputDir));
  assert.equal(payload.followUp.type, "workflow.next_actions");
  assert.equal(payload.result.status, "completed");
});

test("CLI friendly named shortcut --json returns one named workflow run payload", () => {
  const registryDir = createReadOnlyWorkflowRegistry();
  const { parent, repoRoot } = createGitRepo("ultracode-cli-named-shortcut-json-");
  const fakeCodexBin = createFakeCodexBin();
  const env = {
    ...process.env,
    PATH: `${fakeCodexBin}${path.delimiter}${process.env.PATH ?? ""}`,
  };
  const expectedWorktreeRoot = path.join(parent, "project.worktrees", "shortcut-json");

  const stdout = execFileSync(
    process.execPath,
    [
      runnerPath,
      "release-notes",
      "Generate release notes from repository changes",
      "--registry-dir",
      registryDir,
      "--run-id",
      "shortcut-json",
      "--json",
    ],
    {
      cwd: repoRoot,
      env,
      encoding: "utf8",
    },
  );
  const payload = JSON.parse(stdout);

  assert.equal(payload.workflow.name, "release-notes");
  assert.equal(fs.realpathSync(payload.worktree.root), fs.realpathSync(expectedWorktreeRoot));
  assert.equal(payload.inspection.runId, "shortcut-json");
  assert.deepEqual(payload.followUp.commands, payload.inspection.commands);
  assert.equal(payload.result.status, "completed");
});

test("CLI run-dynamic --json returns one dynamic workflow run payload", () => {
  const { parent, repoRoot } = createGitRepo("ultracode-cli-run-dynamic-json-");
  const registryDir = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-empty-registry-"));
  const fakeCodexBin = createFakeCodexBin();
  const env = {
    ...process.env,
    PATH: `${fakeCodexBin}${path.delimiter}${process.env.PATH ?? ""}`,
  };
  const planStdout = execFileSync(
    process.execPath,
    [
      runnerPath,
      "plan-dynamic",
      "--intent",
      "Draft a stakeholder briefing for launch dependencies and owner handoffs",
      "--registry-dir",
      registryDir,
      "--run-id",
      "dynamic-json",
      "--json",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );
  const planPayload = JSON.parse(planStdout);
  const expectedWorktreeRoot = path.join(parent, "project.worktrees", "dynamic-json");
  const expectedOutputDir = path.join(expectedWorktreeRoot, ".ultracode/runs/dynamic-json");

  const stdout = execFileSync(
    process.execPath,
    [
      runnerPath,
      "run-dynamic",
      "--plan-file",
      planPayload.planFile,
      "--approved",
      "true",
      "--json",
    ],
    {
      cwd: repoRoot,
      env,
      encoding: "utf8",
    },
  );
  const payload = JSON.parse(stdout);

  assert.equal(payload.workflow.name, planPayload.workflow.name);
  assert.equal(
    fs.realpathSync(payload.workflow.workflowFile),
    fs.realpathSync(path.join(expectedOutputDir, "workflow.dynamic.json")),
  );
  assert.equal(
    fs.realpathSync(payload.workflow.paramFile),
    fs.realpathSync(path.join(expectedOutputDir, "param.dynamic.json")),
  );
  assert.equal(fs.realpathSync(payload.worktree.root), fs.realpathSync(expectedWorktreeRoot));
  assert.equal(payload.worktree.created, true);
  assert.equal(payload.worktree.branch, "codex/ultracode-dynamic-json");
  assert.equal(payload.inspection.runId, "dynamic-json");
  assert.equal(fs.realpathSync(payload.inspection.outputDir), fs.realpathSync(expectedOutputDir));
  assert.equal(
    fs.realpathSync(payload.approvedPlanFile),
    fs.realpathSync(path.join(expectedOutputDir, "approved-plan.json")),
  );
  assert.equal(payload.inspection.approvedPlanFile, payload.approvedPlanFile);
  assert.equal(payload.followUp.type, "workflow.next_actions");
  assert.deepEqual(payload.followUp.commands, payload.inspection.commands);
  assert.equal(payload.result.status, "completed");
});

test("CLI explicit run --json returns one workflow run payload", () => {
  const { parent, repoRoot } = createGitRepo("ultracode-cli-run-json-");
  const fakeCodexBin = createFakeCodexBin();
  const env = {
    ...process.env,
    PATH: `${fakeCodexBin}${path.delimiter}${process.env.PATH ?? ""}`,
  };
  const workflowFile = path.join(repoRoot, "workflow.json");
  const paramFile = path.join(repoRoot, "param.json");
  writeJson(workflowFile, {
    name: "manual-json",
    stages: [
      {
        name: "draft",
        type: "codex",
        input: {},
        prompt: ["Draft the output."],
        output: { file: "draft.md" },
      },
    ],
  });
  writeJson(paramFile, {
    topic: "manual run",
  });
  const expectedWorktreeRoot = path.join(parent, "project.worktrees", "manual-json");
  const expectedOutputDir = path.join(expectedWorktreeRoot, ".ultracode/runs/manual-json");

  const stdout = execFileSync(
    process.execPath,
    [
      runnerPath,
      "run",
      workflowFile,
      paramFile,
      "--run-id",
      "manual-json",
      "--json",
    ],
    {
      cwd: repoRoot,
      env,
      encoding: "utf8",
    },
  );
  const payload = JSON.parse(stdout);

  assert.equal(payload.workflow.name, "manual-json");
  assert.equal(fs.realpathSync(payload.workflow.workflowFile), fs.realpathSync(workflowFile));
  assert.equal(fs.realpathSync(payload.workflow.paramFile), fs.realpathSync(paramFile));
  assert.equal(fs.realpathSync(payload.worktree.root), fs.realpathSync(expectedWorktreeRoot));
  assert.equal(payload.worktree.created, true);
  assert.equal(payload.worktree.branch, "codex/ultracode-manual-json");
  assert.equal(payload.inspection.runId, "manual-json");
  assert.equal(fs.realpathSync(payload.inspection.outputDir), fs.realpathSync(expectedOutputDir));
  assert.equal(payload.followUp.type, "workflow.next_actions");
  assert.deepEqual(payload.followUp.commands, payload.inspection.commands);
  assert.equal(payload.result.status, "completed");
});

test("CLI plan-dynamic preserves params for named workflow recommendations", () => {
  const registryDir = createWriteWorkflowRegistry();
  const stdout = execFileSync(
    process.execPath,
    [
      runnerPath,
      "plan-dynamic",
      "--intent",
      "Modify repository configuration",
      "--params",
      JSON.stringify({
        change: {
          file: ".gitignore",
        },
      }),
      "--registry-dir",
      registryDir,
      "--json",
    ],
    {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
    },
  );
  const payload = JSON.parse(stdout);

  assert.equal(payload.recommendedAction, "run_named");
  assert.match(
    payload.executionAfterApproval.nextCommand,
    /--params '\{"change":\{"file":"\.gitignore"\}\}'/,
  );
  assert.match(payload.executionAfterApproval.nextCommand, /--registry-dir /);
});

test("CLI plan-dynamic non-json named recommendation includes a next command", () => {
  const registryDir = createWriteWorkflowRegistry();
  const stdout = execFileSync(
    process.execPath,
    [
      runnerPath,
      "plan-dynamic",
      "--intent",
      "Modify repository configuration",
      "--registry-dir",
      registryDir,
    ],
    {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
    },
  );

  assert.match(stdout, /Recommended action: confirm named workflow/);
  assert.match(stdout, /Approval required: yes/);
  assert.match(stdout, /Stage plan:/);
  assert.match(stdout, /- brief \[read-only\] -> brief\.md \(depends on: none\)/);
  assert.match(stdout, /- implement \[write\] -> implementation\.md \(depends on: brief\)/);
  assert.match(stdout, /Write stages: implement/);
  assert.match(stdout, /Output files: brief\.md, implementation\.md/);
  assert.match(stdout, /Next command after approval:/);
  assert.match(
    stdout,
    new RegExp(`ultracode repo-change 'Modify repository configuration' --approved true --registry-dir ${registryDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
  );
});

test("CLI plan-dynamic non-json read-only named recommendation marks approval as unnecessary", () => {
  const registryDir = createReadOnlyWorkflowRegistry();
  const stdout = execFileSync(
    process.execPath,
    [
      runnerPath,
      "plan-dynamic",
      "--intent",
      "Generate release notes from repository changes",
      "--registry-dir",
      registryDir,
    ],
    {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
    },
  );

  assert.match(stdout, /Recommended action: run named workflow/);
  assert.match(stdout, /Approval required: no/);
  assert.match(stdout, /Next command:/);
  assert.doesNotMatch(stdout, /Next command after approval:/);
  assert.match(
    stdout,
    new RegExp(`ultracode release-notes 'Generate release notes from repository changes' --registry-dir ${registryDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
  );
});

test("CLI rejects write-capable named workflow execution without approval", () => {
  const registryDir = createWriteWorkflowRegistry();
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-unapproved-named-"));

  assert.throws(
    () =>
      execFileSync(
        process.execPath,
        [
          runnerPath,
          "repo-change",
          "Modify repository configuration",
          "--registry-dir",
          registryDir,
        ],
        {
          cwd,
          encoding: "utf8",
          stdio: "pipe",
        },
      ),
    /Write-capable named workflow execution requires --approved true/,
  );
});

test("parseCliArgs supports approved dynamic workflow runs from plan files only", async () => {
  const { parseCliArgs } = await import(path.join(distRoot, "cli.js"));

  assert.throws(
    () =>
      parseCliArgs([
        "run-dynamic",
        "--intent",
        "Review the plan",
        "--approved",
        "true",
      ]),
    /run-dynamic requires --plan-file/,
  );

  const fromPlanFile = parseCliArgs([
    "run-dynamic",
    "--plan-file",
    ".ultracode/plans/review.json",
    "--approved",
    "true",
    "--run-id",
    "dynamic-review-from-plan",
  ]);
  assert.equal(fromPlanFile.command, "run-dynamic");
  assert.equal(fromPlanFile.planFile, ".ultracode/plans/review.json");
  assert.equal(fromPlanFile.intent, undefined);
  assert.equal(fromPlanFile.approved, true);
  assert.equal(fromPlanFile.runId, "dynamic-review-from-plan");
});

test("parseCliArgs supports stage restart and rework commands", async () => {
  const { parseCliArgs } = await import(path.join(distRoot, "cli.js"));

  assert.deepEqual(parseCliArgs(["restart-stage", "/tmp/run", "draft", "--json"]), {
    command: "restart-stage",
    outputDir: "/tmp/run",
    stageName: "draft",
    cascade: false,
    json: true,
  });
  assert.deepEqual(parseCliArgs([
    "rework-stage",
    "/tmp/run",
    "draft",
    "--feedback",
    "{\"comments\":[\"Add risks\"]}",
    "--cascade",
    "true",
  ]), {
    command: "rework-stage",
    outputDir: "/tmp/run",
    stageName: "draft",
    feedback: {
      comments: ["Add risks"],
    },
    cascade: true,
    json: false,
  });
});

test("parseCliArgs supports run registry commands", async () => {
  const { parseCliArgs } = await import(path.join(distRoot, "cli.js"));

  assert.deepEqual(parseCliArgs(["list-runs", "--limit", "5", "--json"]), {
    command: "list-runs",
    limit: 5,
    json: true,
  });
  assert.deepEqual(parseCliArgs(["artifact", "run-one"]), {
    command: "artifact",
    runId: "run-one",
    json: false,
  });
  assert.deepEqual(parseCliArgs(["prune-runs", "run-one,run-two", "--json"]), {
    command: "prune-runs",
    runIds: ["run-one", "run-two"],
    removeWorktrees: false,
    json: true,
  });
  assert.deepEqual(parseCliArgs(["prune-runs", "run-one", "--worktrees", "true", "--json"]), {
    command: "prune-runs",
    runIds: ["run-one"],
    removeWorktrees: true,
    json: true,
  });
});

test("parseCliArgs rejects non-run commands", async () => {
  const { parseCliArgs } = await import(path.join(distRoot, "cli.js"));

  assert.throws(
    () => parseCliArgs(["--anything"]),
    /Usage:\n  ultracode "<task intent>"/,
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

test("CLI inspection commands accept run ids", () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-cli-inspect-"));
  const repoRoot = path.join(parent, "project");
  fs.mkdirSync(repoRoot, { recursive: true });
  const outputDir = createCompletedRun(repoRoot, "run-one", "doc-flow", "final body");

  const reportStdout = execFileSync(
    process.execPath,
    [runnerPath, "report", "run-one", "--json"],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );
  const report = JSON.parse(reportStdout);
  assert.equal(fs.realpathSync(report.outputDir), fs.realpathSync(outputDir));
  assert.equal(report.finalArtifact.text, "final body");

  const tailStdout = execFileSync(process.execPath, [runnerPath, "tail", "run-one", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const tail = JSON.parse(tailStdout);
  assert.equal(fs.realpathSync(tail.outputDir), fs.realpathSync(outputDir));
  assert.equal(tail.events[0].type, "workflow.completed");
});

test("CLI stage action commands accept run ids", () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-cli-stage-action-"));
  const repoRoot = path.join(parent, "project");
  fs.mkdirSync(repoRoot, { recursive: true });
  const outputDir = createRestartableRun(repoRoot, "run-one");
  const fakeCodexBin = createFakeCodexBin();
  const env = {
    ...process.env,
    PATH: `${fakeCodexBin}${path.delimiter}${process.env.PATH ?? ""}`,
  };

  const restartStdout = execFileSync(
    process.execPath,
    [runnerPath, "restart-stage", "run-one", "draft", "--json"],
    {
      cwd: repoRoot,
      env,
      encoding: "utf8",
    },
  );
  const restart = JSON.parse(restartStdout);
  assert.equal(fs.realpathSync(restart.outputDir), fs.realpathSync(outputDir));
  assert.equal(restart.stage.stage, "draft");
  assert.equal(restart.stage.attempt, 2);
  assert.deepEqual(restart.followUp.commands, {
    report: "ultracode report run-one",
    status: "ultracode status run-one",
    tail: "ultracode tail run-one --limit 20",
    restartStage: "ultracode restart-stage run-one <stage-name>",
    reworkStage: "ultracode rework-stage run-one <stage-name> --feedback '<json object>'",
  });

  const reworkStdout = execFileSync(
    process.execPath,
    [
      runnerPath,
      "rework-stage",
      "run-one",
      "draft",
      "--feedback",
      "{\"comments\":[\"Add rollout risks\"]}",
      "--json",
    ],
    {
      cwd: repoRoot,
      env,
      encoding: "utf8",
    },
  );
  const rework = JSON.parse(reworkStdout);
  assert.equal(fs.realpathSync(rework.outputDir), fs.realpathSync(outputDir));
  assert.equal(rework.stage.stage, "draft");
  assert.equal(rework.stage.attempt, 3);
  assert.deepEqual(rework.stage.input.rework.feedback, {
    comments: ["Add rollout risks"],
  });
  assert.deepEqual(rework.followUp.commands, {
    report: "ultracode report run-one",
    status: "ultracode status run-one",
    tail: "ultracode tail run-one --limit 20",
    restartStage: "ultracode restart-stage run-one <stage-name>",
    reworkStage: "ultracode rework-stage run-one <stage-name> --feedback '<json object>'",
  });

  const traceEvents = fs
    .readFileSync(path.join(outputDir, "trace.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.deepEqual(
    traceEvents
      .filter((event) => event.type === "stage.started" && event.stage === "draft")
      .map((event) => event.attempt),
    [2, 3],
  );
  assert.deepEqual(
    traceEvents
      .filter((event) => event.type === "stage.completed" && event.stage === "draft")
      .map((event) => event.attempt),
    [2, 3],
  );
});

test("CLI stage action commands print run-id follow-up events", () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-cli-stage-follow-up-"));
  const repoRoot = path.join(parent, "project");
  fs.mkdirSync(repoRoot, { recursive: true });
  createRestartableRun(repoRoot, "run-two");
  const fakeCodexBin = createFakeCodexBin();
  const env = {
    ...process.env,
    PATH: `${fakeCodexBin}${path.delimiter}${process.env.PATH ?? ""}`,
  };

  const stdout = execFileSync(
    process.execPath,
    [runnerPath, "restart-stage", "run-two", "draft"],
    {
      cwd: repoRoot,
      env,
      encoding: "utf8",
    },
  );

  assert.match(stdout, /"type":"workflow\.next_actions"/);
  assert.match(stdout, /"report":"ultracode report run-two"/);
  assert.match(stdout, /Workflow: manual-flow/);
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

test("formatPruneRuns renders removed worktrees for terminal users", async () => {
  const { formatPruneRuns } = await import(path.join(distRoot, "cli.js"));

  const text = formatPruneRuns({
    removed: [
      {
        runId: "run-one",
        outputDir: "/repo/.ultracode/runs/run-one",
      },
    ],
    removedWorktrees: [
      {
        runId: "run-one",
        worktreeRoot: "/repo.worktrees/run-one",
      },
    ],
    missing: [],
  });

  assert.match(text, /Removed run-one: \/repo\/\.ultracode\/runs\/run-one/);
  assert.match(text, /Removed worktree run-one: \/repo\.worktrees\/run-one/);
});

test("buildRunFollowUpEvent returns run-id next actions", async () => {
  const { buildRunFollowUpEvent } = await import(path.join(distRoot, "cli.js"));

  const event = buildRunFollowUpEvent("travel guide/demo");

  assert.equal(event.type, "workflow.next_actions");
  assert.equal(event.runId, "travel guide/demo");
  assert.deepEqual(event.commands, {
    report: "ultracode report 'travel guide/demo'",
    status: "ultracode status 'travel guide/demo'",
    tail: "ultracode tail 'travel guide/demo' --limit 20",
    restartStage: "ultracode restart-stage 'travel guide/demo' <stage-name>",
    reworkStage:
      "ultracode rework-stage 'travel guide/demo' <stage-name> --feedback '<json object>'",
  });
});
