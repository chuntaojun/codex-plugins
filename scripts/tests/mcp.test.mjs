import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.resolve(__dirname, "../dist");

test("handleMcpRequest lists the ultracode_run tool", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));

  const response = await handleMcpRequest({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
  });

  assert.equal(response.jsonrpc, "2.0");
  assert.equal(response.id, 1);
  assert.equal(response.result.tools[0].name, "ultracode_run");
  assert(response.result.tools.some((tool) => tool.name === "ultracode_run_named"));
  assert(response.result.tools.some((tool) => tool.name === "ultracode_list_workflows"));
  assert(response.result.tools.some((tool) => tool.name === "ultracode_describe_workflow"));
  assert(response.result.tools.some((tool) => tool.name === "ultracode_dispatch"));
  assert(response.result.tools.some((tool) => tool.name === "ultracode_plan_dynamic"));
  assert(response.result.tools.some((tool) => tool.name === "ultracode_run_dynamic"));
  assert(response.result.tools.some((tool) => tool.name === "ultracode_restart_stage"));
  assert(response.result.tools.some((tool) => tool.name === "ultracode_rework_stage"));
  assert(response.result.tools.some((tool) => tool.name === "ultracode_list_runs"));
  assert(response.result.tools.some((tool) => tool.name === "ultracode_artifact"));
  assert(response.result.tools.some((tool) => tool.name === "ultracode_prune_runs"));
  assert(response.result.tools.some((tool) => tool.name === "ultracode_status"));
  assert(response.result.tools.some((tool) => tool.name === "ultracode_tail"));
  assert(response.result.tools.some((tool) => tool.name === "ultracode_report"));
  const runNamedTool = response.result.tools.find((tool) => tool.name === "ultracode_run_named");
  assert.equal(runNamedTool.inputSchema.properties.approved.type, "boolean");
  assert.match(
    runNamedTool.inputSchema.properties.approved.description,
    /write-capable named workflow/i,
  );
});

test("handleMcpRequest runs a workflow in a prepared worktree", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));
  let runOptions;

  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "ultracode_run",
        arguments: {
          cwd: "/repo/project",
          workflowFile: "workflow.json",
          paramFile: "param.json",
          outputDir: ".runs/manual",
          runId: "manual",
        },
      },
    },
    {
      prepareRunWorktree: (_cwd, options) => ({
        worktreeRoot: "/repo/project.worktrees/manual",
        created: true,
        branch: `codex/ultracode-${options.runId}`,
        status: {
          isGitRepository: true,
          isLinkedWorktree: false,
          isSubmodule: false,
          reason: "primary-checkout",
        },
      }),
      runJsonWorkflow: async (options) => {
        runOptions = options;
        return {
          workflow: "doc-flow",
          status: "completed",
          outputDir: options.outputDir,
          stages: [
            {
              stage: "draft",
              status: "passed",
              attempt: 1,
              stageDir: "/repo/project.worktrees/manual/.runs/manual/stages/001-draft",
              attemptDir:
                "/repo/project.worktrees/manual/.runs/manual/stages/001-draft/attempts/001",
              outputFile:
                "/repo/project.worktrees/manual/.runs/manual/stages/001-draft/attempts/001/draft.md",
              resultFile:
                "/repo/project.worktrees/manual/.runs/manual/stages/001-draft/attempts/001/result.json",
              sessionId: "session-draft",
            },
            {
              stage: "review",
              status: "failed",
              attempt: 2,
              stageDir: "/repo/project.worktrees/manual/.runs/manual/stages/002-review",
              attemptDir:
                "/repo/project.worktrees/manual/.runs/manual/stages/002-review/attempts/002",
              outputFile:
                "/repo/project.worktrees/manual/.runs/manual/stages/002-review/attempts/002/review.md",
              resultFile:
                "/repo/project.worktrees/manual/.runs/manual/stages/002-review/attempts/002/result.json",
              sessionId: "session-review",
            },
          ],
        };
      },
      configureTraceOutput: () => {},
    },
  );

  assert.equal(runOptions.repoRoot, "/repo/project.worktrees/manual");
  assert.equal(runOptions.workflowFile, "/repo/project/workflow.json");
  assert.equal(runOptions.paramFile, "/repo/project/param.json");
  assert.equal(runOptions.outputDir, "/repo/project.worktrees/manual/.runs/manual");

  const payload = JSON.parse(response.result.content[0].text);
  assert.equal(payload.worktree.created, true);
  assert.equal(payload.worktree.branch, "codex/ultracode-manual");
  assert.equal(payload.result.workflow, "doc-flow");
  assert.deepEqual(response.result.structuredContent.inspection, {
    runId: "manual",
    outputDir: "/repo/project.worktrees/manual/.runs/manual",
    status: {
      tool: "ultracode_status",
      arguments: {
        cwd: "/repo/project",
        runId: "manual",
      },
    },
    tail: {
      tool: "ultracode_tail",
      arguments: {
        cwd: "/repo/project",
        runId: "manual",
        limit: 20,
      },
    },
    report: {
      tool: "ultracode_report",
      arguments: {
        cwd: "/repo/project",
        runId: "manual",
      },
    },
    artifact: {
      tool: "ultracode_artifact",
      arguments: {
        cwd: "/repo/project",
        runId: "manual",
      },
    },
    restartStage: {
      tool: "ultracode_restart_stage",
      arguments: {
        cwd: "/repo/project",
        runId: "manual",
        stageName: "<stage-name>",
      },
    },
    reworkStage: {
      tool: "ultracode_rework_stage",
      arguments: {
        cwd: "/repo/project",
        runId: "manual",
        stageName: "<stage-name>",
        feedback: {
          comments: ["<feedback>"],
        },
      },
    },
    stages: [
      {
        stageName: "draft",
        status: "passed",
        attempt: 1,
        artifact: {
          outputFile:
            "/repo/project.worktrees/manual/.runs/manual/stages/001-draft/attempts/001/draft.md",
          resultFile:
            "/repo/project.worktrees/manual/.runs/manual/stages/001-draft/attempts/001/result.json",
          attemptDir:
            "/repo/project.worktrees/manual/.runs/manual/stages/001-draft/attempts/001",
          stageDir: "/repo/project.worktrees/manual/.runs/manual/stages/001-draft",
          sessionId: "session-draft",
        },
        restartStage: {
          tool: "ultracode_restart_stage",
          arguments: {
            cwd: "/repo/project",
            runId: "manual",
            stageName: "draft",
          },
        },
        reworkStage: {
          tool: "ultracode_rework_stage",
          arguments: {
            cwd: "/repo/project",
            runId: "manual",
            stageName: "draft",
            feedback: {
              comments: ["<feedback>"],
            },
          },
        },
      },
      {
        stageName: "review",
        status: "failed",
        attempt: 2,
        artifact: {
          outputFile:
            "/repo/project.worktrees/manual/.runs/manual/stages/002-review/attempts/002/review.md",
          resultFile:
            "/repo/project.worktrees/manual/.runs/manual/stages/002-review/attempts/002/result.json",
          attemptDir:
            "/repo/project.worktrees/manual/.runs/manual/stages/002-review/attempts/002",
          stageDir: "/repo/project.worktrees/manual/.runs/manual/stages/002-review",
          sessionId: "session-review",
        },
        restartStage: {
          tool: "ultracode_restart_stage",
          arguments: {
            cwd: "/repo/project",
            runId: "manual",
            stageName: "review",
          },
        },
        reworkStage: {
          tool: "ultracode_rework_stage",
          arguments: {
            cwd: "/repo/project",
            runId: "manual",
            stageName: "review",
            feedback: {
              comments: ["<feedback>"],
            },
          },
        },
      },
    ],
    nextActions: [
      "Call ultracode_status with inspection.status.arguments to display run progress.",
      "Call ultracode_tail with inspection.tail.arguments when recent events are useful.",
      "Call ultracode_report with inspection.report.arguments when the run is completed.",
      "Call ultracode_artifact with inspection.artifact.arguments to preview the final artifact.",
      "Use inspection.restartStage.arguments as a template when a stage should be retried.",
      "Use inspection.reworkStage.arguments as a template when reviewer feedback should be applied.",
      "Use inspection.stages to select concrete per-stage restart/rework arguments.",
    ],
  });
});

test("handleMcpRequest runs a named workflow with generated params", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));
  let runOptions;

  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: {
        name: "ultracode_run_named",
        arguments: {
          cwd: "/repo/project",
          workflowName: "travel-guide",
          intent: "Create a relaxed Kyoto guide with rainy-day alternatives",
          params: {
            trip: {
              destination: "Kyoto, Japan",
              durationDays: 3,
            },
          },
          runId: "kyoto-guide",
        },
      },
    },
    {
      prepareRunWorktree: (_cwd, options) => ({
        worktreeRoot: "/repo/project.worktrees/kyoto-guide",
        created: true,
        branch: `codex/ultracode-${options.runId}`,
        status: {
          isGitRepository: true,
          isLinkedWorktree: false,
          isSubmodule: false,
          reason: "primary-checkout",
        },
      }),
      resolveNamedWorkflow: (workflowName) => ({
        name: workflowName,
        description: "Create a reviewed travel guide.",
        workflowFile: "/plugin/skills/ultracode/workflows/travel-guide/workflow.json",
        paramTemplateFile: "/plugin/skills/ultracode/workflows/travel-guide/param.template.json",
      }),
      createParamFileFromTemplate: (options) => ({
        paramFile: `${options.outputDir}/param.generated.json`,
        params: {
          mode: "read-only",
          goal: options.intent,
          trip: options.params.trip,
        },
      }),
      runJsonWorkflow: async (options) => {
        runOptions = options;
        return {
          workflow: "travel-guide",
          status: "completed",
          outputDir: options.outputDir,
          stages: [],
        };
      },
      configureTraceOutput: () => {},
    },
  );

  assert.equal(runOptions.repoRoot, "/repo/project.worktrees/kyoto-guide");
  assert.equal(
    runOptions.workflowFile,
    "/plugin/skills/ultracode/workflows/travel-guide/workflow.json",
  );
  assert.equal(
    runOptions.paramFile,
    "/repo/project.worktrees/kyoto-guide/.ultracode/runs/kyoto-guide/param.generated.json",
  );
  assert.equal(
    runOptions.outputDir,
    "/repo/project.worktrees/kyoto-guide/.ultracode/runs/kyoto-guide",
  );
  assert.equal(response.result.structuredContent.result.workflow, "travel-guide");
  assert.deepEqual(response.result.structuredContent.inspection, {
    runId: "kyoto-guide",
    outputDir: "/repo/project.worktrees/kyoto-guide/.ultracode/runs/kyoto-guide",
    status: {
      tool: "ultracode_status",
      arguments: {
        cwd: "/repo/project",
        runId: "kyoto-guide",
      },
    },
    tail: {
      tool: "ultracode_tail",
      arguments: {
        cwd: "/repo/project",
        runId: "kyoto-guide",
        limit: 20,
      },
    },
    report: {
      tool: "ultracode_report",
      arguments: {
        cwd: "/repo/project",
        runId: "kyoto-guide",
      },
    },
    artifact: {
      tool: "ultracode_artifact",
      arguments: {
        cwd: "/repo/project",
        runId: "kyoto-guide",
      },
    },
    restartStage: {
      tool: "ultracode_restart_stage",
      arguments: {
        cwd: "/repo/project",
        runId: "kyoto-guide",
        stageName: "<stage-name>",
      },
    },
    reworkStage: {
      tool: "ultracode_rework_stage",
      arguments: {
        cwd: "/repo/project",
        runId: "kyoto-guide",
        stageName: "<stage-name>",
        feedback: {
          comments: ["<feedback>"],
        },
      },
    },
    nextActions: [
      "Call ultracode_status with inspection.status.arguments to display run progress.",
      "Call ultracode_tail with inspection.tail.arguments when recent events are useful.",
      "Call ultracode_report with inspection.report.arguments when the run is completed.",
      "Call ultracode_artifact with inspection.artifact.arguments to preview the final artifact.",
      "Use inspection.restartStage.arguments as a template when a stage should be retried.",
      "Use inspection.reworkStage.arguments as a template when reviewer feedback should be applied.",
    ],
  });
});

test("handleMcpRequest writes approval audit for approved write-capable named workflows", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));
  const worktreeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-approved-named-mcp-"));

  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 6.5,
      method: "tools/call",
      params: {
        name: "ultracode_run_named",
        arguments: {
          cwd: "/repo/project",
          workflowName: "repo-change",
          intent: "Modify repository configuration",
          params: {
            change: {
              file: ".gitignore",
            },
          },
          runId: "repo-change",
          approved: true,
        },
      },
    },
    {
      prepareRunWorktree: (_cwd, options) => ({
        worktreeRoot,
        created: true,
        branch: `codex/ultracode-${options.runId}`,
      }),
      resolveNamedWorkflow: () => ({
        name: "repo-change",
        description: "Make a scoped repository change.",
        workflowFile: "/plugin/skills/ultracode/workflows/repo-change/workflow.json",
        paramTemplateFile: "/plugin/skills/ultracode/workflows/repo-change/param.template.json",
        writeStages: ["implement"],
      }),
      createParamFileFromTemplate: (options) => ({
        paramFile: `${options.outputDir}/param.generated.json`,
        params: {
          mode: "read-only",
          goal: options.intent,
          change: options.params.change,
        },
      }),
      runJsonWorkflow: async (options) => ({
        workflow: "repo-change",
        status: "completed",
        outputDir: options.outputDir,
        stages: [],
      }),
      configureTraceOutput: () => {},
    },
  );

  const outputDir = path.join(worktreeRoot, ".ultracode/runs/repo-change");
  const approvedFile = path.join(outputDir, "approved-named-workflow.json");
  assert.equal(response.result.structuredContent.approvedNamedWorkflowFile, approvedFile);
  assert.equal(response.result.structuredContent.inspection.approvedNamedWorkflowFile, approvedFile);
  const payload = JSON.parse(fs.readFileSync(approvedFile, "utf8"));
  assert.equal(payload.workflowName, "repo-change");
  assert.equal(payload.workflowFile, "/plugin/skills/ultracode/workflows/repo-change/workflow.json");
  assert.equal(payload.paramFile, path.join(outputDir, "param.generated.json"));
  assert.equal(payload.intent, "Modify repository configuration");
  assert.deepEqual(payload.params.change, {
    file: ".gitignore",
  });
  assert.deepEqual(payload.execution, {
    runId: "repo-change",
    outputDir: ".ultracode/runs/repo-change",
  });
});

test("handleMcpRequest dispatches a matching intent to a named workflow run", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));
  let runOptions;

  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 16,
      method: "tools/call",
      params: {
        name: "ultracode_dispatch",
        arguments: {
          cwd: "/repo/project",
          intent: "Create a relaxed Kyoto travel guide with rainy-day alternatives",
          params: {
            trip: {
              destination: "Kyoto, Japan",
              durationDays: 3,
            },
          },
          runId: "kyoto-guide",
          registryDir: "/tmp/registry",
        },
      },
    },
    {
      listNamedWorkflows: () => [
        {
          name: "travel-guide",
          description: "Create a reviewed travel guide.",
          keywords: ["travel", "guide", "Kyoto"],
          workflowFile: "/tmp/registry/travel-guide/workflow.json",
          paramTemplateFile: "/tmp/registry/travel-guide/param.template.json",
        },
      ],
      prepareRunWorktree: (_cwd, options) => ({
        worktreeRoot: "/repo/project.worktrees/kyoto-guide",
        created: true,
        branch: `codex/ultracode-${options.runId}`,
        status: {
          isGitRepository: true,
          isLinkedWorktree: false,
          isSubmodule: false,
          reason: "primary-checkout",
        },
      }),
      resolveNamedWorkflow: (workflowName) => ({
        name: workflowName,
        description: "Create a reviewed travel guide.",
        workflowFile: "/tmp/registry/travel-guide/workflow.json",
        paramTemplateFile: "/tmp/registry/travel-guide/param.template.json",
      }),
      createParamFileFromTemplate: (options) => ({
        paramFile: `${options.outputDir}/param.generated.json`,
        params: {
          mode: "read-only",
          goal: options.intent,
          trip: options.params.trip,
        },
      }),
      runJsonWorkflow: async (options) => {
        runOptions = options;
        return {
          workflow: "travel-guide",
          status: "completed",
          outputDir: options.outputDir,
          stages: [],
        };
      },
      configureTraceOutput: () => {},
    },
  );

  assert.equal(response.result.structuredContent.dispatch.action, "ran_named");
  assert.equal(response.result.structuredContent.plan.recommendedAction, "run_named");
  assert.equal(response.result.structuredContent.workflow.name, "travel-guide");
  assert.equal(runOptions.repoRoot, "/repo/project.worktrees/kyoto-guide");
  assert.equal(response.result.structuredContent.inspection.runId, "kyoto-guide");
  assert.deepEqual(response.result.structuredContent.inspection.report.arguments, {
    cwd: "/repo/project",
    runId: "kyoto-guide",
  });
});

test("handleMcpRequest lists and describes named workflows", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));

  const listResponse = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      params: {
        name: "ultracode_list_workflows",
        arguments: {
          registryDir: "/tmp/registry",
        },
      },
    },
    {
      listNamedWorkflows: (options) => [
        {
          name: "travel-guide",
          description: `registry=${options.registryDir}`,
          workflowFile: "/tmp/registry/travel-guide/workflow.json",
          paramTemplateFile: "/tmp/registry/travel-guide/param.template.json",
        },
      ],
    },
  );

  assert.equal(listResponse.result.structuredContent.workflows[0].name, "travel-guide");
  assert.equal(listResponse.result.structuredContent.workflows[0].description, "registry=/tmp/registry");

  const describeResponse = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 8,
      method: "tools/call",
      params: {
        name: "ultracode_describe_workflow",
        arguments: {
          workflowName: "travel-guide",
        },
      },
    },
    {
      resolveNamedWorkflow: (workflowName) => ({
        name: workflowName,
        description: "Create a reviewed travel guide.",
        workflowFile: "/tmp/registry/travel-guide/workflow.json",
        paramTemplateFile: "/tmp/registry/travel-guide/param.template.json",
        readmeFile: "/tmp/registry/travel-guide/README.md",
      }),
      readWorkflowReadme: () => "# travel-guide\n\nCreate a practical guide.\n",
    },
  );

  assert.equal(describeResponse.result.structuredContent.workflow.name, "travel-guide");
  assert.match(describeResponse.result.content[0].text, /Create a practical guide/);
});

test("handleMcpRequest returns ready-to-call execution for named workflow recommendations", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));

  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 9,
      method: "tools/call",
      params: {
        name: "ultracode_plan_dynamic",
        arguments: {
          cwd: "/repo/project",
          registryDir: "/tmp/registry",
          intent: "Create a relaxed Kyoto travel guide with rainy-day alternatives",
          params: {
            trip: {
              destination: "Kyoto, Japan",
              durationDays: 3,
            },
          },
          outputDir: ".ultracode/runs/kyoto-guide",
          runId: "kyoto-guide",
          worktreeDir: "../codex-ultracode.worktrees/kyoto-guide",
        },
      },
    },
    {
      listNamedWorkflows: () => [
        {
          name: "travel-guide",
          description: "Create a reviewed travel guide.",
          workflowFile: "/tmp/registry/travel-guide/workflow.json",
          paramTemplateFile: "/tmp/registry/travel-guide/param.template.json",
          writeStages: [],
          outputFiles: ["travel-guide.md", "travel-guide-review.md"],
          stagePlan: [
            {
              name: "plan-brief",
              mode: "read-only",
              outputFile: "travel-guide-brief.md",
              dependsOn: [],
            },
            {
              name: "draft-itinerary",
              mode: "read-only",
              outputFile: "travel-guide.md",
              dependsOn: ["plan-brief"],
            },
            {
              name: "review-itinerary",
              mode: "read-only",
              outputFile: "travel-guide-review.md",
              dependsOn: ["draft-itinerary"],
            },
          ],
        },
      ],
      writeDynamicPlanFile: (options) => {
        throw new Error(`named workflow recommendation should not write a plan file: ${options.planFile}`);
      },
    },
  );

  assert.equal(response.result.structuredContent.recommendedAction, "run_named");
  assert.equal(response.result.structuredContent.workflowName, "travel-guide");
  assert.equal(response.result.structuredContent.planFile, undefined);
  assert.equal(response.result.structuredContent.createdAt, undefined);
  assert.equal(response.result.structuredContent.workflow.name, "travel-guide");
  assert.equal(response.result.structuredContent.preview.template, "named-workflow");
  assert.deepEqual(
    response.result.structuredContent.workflow.stagePlan.map((stage) => [
      stage.name,
      stage.mode,
      stage.outputFile,
    ]),
    [
      ["plan-brief", "read-only", "travel-guide-brief.md"],
      ["draft-itinerary", "read-only", "travel-guide.md"],
      ["review-itinerary", "read-only", "travel-guide-review.md"],
    ],
  );
  assert.equal(response.result.structuredContent.preview.summary, "travel-guide is a registered named workflow with 3 stages.");
  assert.deepEqual(response.result.structuredContent.preview.writeStages, []);
  assert.deepEqual(response.result.structuredContent.preview.outputFiles, [
    "travel-guide.md",
    "travel-guide-review.md",
  ]);
  assert.equal(
    response.result.structuredContent.preview.confirmationPrompt,
    "No approval is required for this read-only named workflow. Call ultracode_run_named with execution.arguments when ready.",
  );
  assert.doesNotMatch(
    response.result.structuredContent.preview.confirmationPrompt,
    /executionAfterApproval|approve/i,
  );
  assert.deepEqual(response.result.structuredContent.execution, {
    tool: "ultracode_run_named",
    arguments: {
      cwd: "/repo/project",
      workflowName: "travel-guide",
      intent: "Create a relaxed Kyoto travel guide with rainy-day alternatives",
      params: {
        trip: {
          destination: "Kyoto, Japan",
          durationDays: 3,
        },
      },
      registryDir: "/tmp/registry",
      outputDir: ".ultracode/runs/kyoto-guide",
      runId: "kyoto-guide",
      worktreeDir: "../codex-ultracode.worktrees/kyoto-guide",
    },
    approvalRequired: false,
    reason: "The request matches the registered travel-guide workflow.",
  });
});

test("handleMcpRequest explains missing cwd for named workflow recommendations", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));

  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 9.5,
      method: "tools/call",
      params: {
        name: "ultracode_plan_dynamic",
        arguments: {
          registryDir: "/tmp/registry",
          intent: "Create a relaxed Kyoto travel guide with rainy-day alternatives",
        },
      },
    },
    {
      listNamedWorkflows: () => [
        {
          name: "travel-guide",
          description: "Create a reviewed travel guide.",
          workflowFile: "/tmp/registry/travel-guide/workflow.json",
          paramTemplateFile: "/tmp/registry/travel-guide/param.template.json",
          writeStages: [],
          outputFiles: ["travel-guide.md", "travel-guide-review.md"],
          stagePlan: [
            {
              name: "plan-brief",
              mode: "read-only",
              outputFile: "travel-guide-brief.md",
              dependsOn: [],
            },
          ],
        },
      ],
      writeDynamicPlanFile: (options) => {
        throw new Error(`named workflow recommendation should not write a plan file: ${options.planFile}`);
      },
    },
  );

  assert.equal(response.result.structuredContent.recommendedAction, "run_named");
  assert.equal(response.result.structuredContent.workflowName, "travel-guide");
  assert.equal(response.result.structuredContent.execution, undefined);
  assert.equal(response.result.structuredContent.executionAfterApproval, undefined);
  assert.equal(
    response.result.structuredContent.preview.confirmationPrompt,
    "No approval is required, but no ready-to-call execution arguments were returned because cwd was omitted. Re-run ultracode_plan_dynamic with cwd to get execution.arguments.",
  );
  assert.doesNotMatch(
    response.result.structuredContent.preview.confirmationPrompt,
    /Call ultracode_run_named with execution\.arguments when ready/,
  );
});

test("handleMcpRequest dispatches unmatched intents to a dynamic preview without running", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));
  let writtenPlan;

  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 17,
      method: "tools/call",
      params: {
        name: "ultracode_dispatch",
        arguments: {
          cwd: "/repo/project",
          intent: "Review the current implementation plan and produce a risk report",
        },
      },
    },
    {
      listNamedWorkflows: () => [],
      writeDynamicPlanFile: (options) => {
        writtenPlan = options;
        return {
          planFile: options.planFile,
          intent: options.intent,
          createdAt: "2026-01-01T00:00:00.000Z",
          plan: options.plan,
        };
      },
      runJsonWorkflow: async () => {
        throw new Error("dispatch must not run dynamic workflows before approval");
      },
    },
  );

  assert.equal(response.result.structuredContent.dispatch.action, "needs_confirmation");
  assert.equal(response.result.structuredContent.recommendedAction, "review_dynamic");
  assert.equal(response.result.structuredContent.requiresConfirmation, true);
  assert.equal(response.result.structuredContent.preview.template, "research");
  assert.equal(response.result.structuredContent.planFile, writtenPlan.planFile);
  assert.equal(writtenPlan.plan.preview.template, "research");
  assert.equal(response.result.structuredContent.executionAfterApproval.tool, "ultracode_run_dynamic");
});

test("handleMcpRequest preserves params and execution controls for dynamic dispatch approvals", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));
  let writtenPlan;

  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 17.5,
      method: "tools/call",
      params: {
        name: "ultracode_dispatch",
        arguments: {
          cwd: "/repo/project",
          intent: "Review the current implementation plan and produce a risk report",
          params: {
            scope: {
              paths: ["scripts/src/mcp.ts"],
            },
            audience: "maintainers",
          },
          outputDir: ".ultracode/runs/risk-review",
          runId: "risk-review",
          worktreeDir: "../codex-ultracode.worktrees/risk-review",
        },
      },
    },
    {
      listNamedWorkflows: () => [],
      writeDynamicPlanFile: (options) => {
        writtenPlan = options;
        return {
          planFile: options.planFile,
          intent: options.intent,
          createdAt: "2026-01-01T00:00:00.000Z",
          plan: options.plan,
        };
      },
      runJsonWorkflow: async () => {
        throw new Error("dispatch must not run dynamic workflows before approval");
      },
    },
  );

  assert.equal(response.result.structuredContent.dispatch.action, "needs_confirmation");
  assert.equal(response.result.structuredContent.planFile, writtenPlan.planFile);
  assert.deepEqual(response.result.structuredContent.executionAfterApproval, {
    tool: "ultracode_run_dynamic",
    arguments: {
      cwd: "/repo/project",
      approved: true,
      planFile: writtenPlan.planFile,
      params: {
        scope: {
          paths: ["scripts/src/mcp.ts"],
        },
        audience: "maintainers",
      },
      outputDir: ".ultracode/runs/risk-review",
      runId: "risk-review",
      worktreeDir: "../codex-ultracode.worktrees/risk-review",
    },
    confirmationGate: "Only call this after the user has approved the dynamic workflow preview.",
  });
});

test("handleMcpRequest dispatches write-capable named workflows to confirmation", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));
  let didRun = false;

  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 18,
      method: "tools/call",
      params: {
        name: "ultracode_dispatch",
        arguments: {
          cwd: "/repo/project",
          intent: "Modify the repository configuration",
          runId: "repo-change",
        },
      },
    },
    {
      listNamedWorkflows: () => [
        {
          name: "repo-change",
          description: "Make a scoped repository change.",
          keywords: ["modify", "repository", "configuration"],
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
      ],
      runJsonWorkflow: async () => {
        didRun = true;
        throw new Error("write-capable named workflows must not run before confirmation");
      },
    },
  );

  assert.equal(didRun, false);
  assert.equal(response.result.structuredContent.dispatch.action, "needs_confirmation");
  assert.equal(response.result.structuredContent.recommendedAction, "run_named");
  assert.equal(response.result.structuredContent.workflowName, "repo-change");
  assert.equal(response.result.structuredContent.workflow.name, "repo-change");
  assert.equal(response.result.structuredContent.workflow.description, "Make a scoped repository change.");
  assert.equal(response.result.structuredContent.preview.template, "named-workflow");
  assert.deepEqual(response.result.structuredContent.preview.writeStages, ["implement"]);
  assert.deepEqual(response.result.structuredContent.executionAfterApproval, {
    tool: "ultracode_run_named",
    arguments: {
      cwd: "/repo/project",
      workflowName: "repo-change",
      intent: "Modify the repository configuration",
      runId: "repo-change",
      approved: true,
    },
    confirmationGate: "Only call this after the user has approved the named workflow preview.",
  });
});

test("handleMcpRequest rejects unapproved write-capable named workflow execution", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));
  let didPrepare = false;
  let didRun = false;

  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 18.25,
      method: "tools/call",
      params: {
        name: "ultracode_run_named",
        arguments: {
          cwd: "/repo/project",
          workflowName: "repo-change",
          intent: "Modify the repository configuration",
        },
      },
    },
    {
      resolveNamedWorkflow: () => ({
        name: "repo-change",
        description: "Make a scoped repository change.",
        workflowFile: "/tmp/registry/repo-change/workflow.json",
        paramTemplateFile: "/tmp/registry/repo-change/param.template.json",
        writeStages: ["implement"],
      }),
      prepareRunWorktree: () => {
        didPrepare = true;
        return {
          worktreeRoot: "/repo/project.worktrees/repo-change",
          created: true,
          branch: "codex/ultracode-repo-change",
        };
      },
      runJsonWorkflow: async () => {
        didRun = true;
        throw new Error("unapproved write-capable named workflow must not run");
      },
    },
  );

  assert.equal(response.result.isError, true);
  assert.match(response.result.content[0].text, /requires approved=true/);
  assert.equal(didPrepare, false);
  assert.equal(didRun, false);
});

test("handleMcpRequest plans write-capable named workflows behind confirmation", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));

  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 18.5,
      method: "tools/call",
      params: {
        name: "ultracode_plan_dynamic",
        arguments: {
          cwd: "/repo/project",
          registryDir: "/tmp/registry",
          intent: "Modify the repository configuration",
          params: {
            change: {
              file: ".gitignore",
            },
          },
          outputDir: ".ultracode/runs/repo-change",
          runId: "repo-change",
          worktreeDir: "../codex-ultracode.worktrees/repo-change",
        },
      },
    },
    {
      listNamedWorkflows: () => [
        {
          name: "repo-change",
          description: "Make a scoped repository change.",
          keywords: ["modify", "repository", "configuration"],
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
      ],
      writeDynamicPlanFile: (options) => {
        throw new Error(`named workflow recommendation should not write a plan file: ${options.planFile}`);
      },
    },
  );

  assert.equal(response.result.structuredContent.recommendedAction, "run_named");
  assert.equal(response.result.structuredContent.workflowName, "repo-change");
  assert.equal(response.result.structuredContent.requiresConfirmation, true);
  assert.equal(response.result.structuredContent.execution, undefined);
  assert.equal(response.result.structuredContent.workflow.name, "repo-change");
  assert.equal(response.result.structuredContent.preview.template, "named-workflow");
  assert.deepEqual(response.result.structuredContent.preview.writeStages, ["implement"]);
  assert.deepEqual(response.result.structuredContent.executionAfterApproval, {
    tool: "ultracode_run_named",
    arguments: {
      cwd: "/repo/project",
      workflowName: "repo-change",
      intent: "Modify the repository configuration",
      params: {
        change: {
          file: ".gitignore",
        },
      },
      registryDir: "/tmp/registry",
      outputDir: ".ultracode/runs/repo-change",
      runId: "repo-change",
      worktreeDir: "../codex-ultracode.worktrees/repo-change",
      approved: true,
    },
    confirmationGate: "Only call this after the user has approved the named workflow preview.",
  });
});

test("handleMcpRequest plans a dynamic workflow without executing it", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));
  let writtenPlan;

  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 9,
      method: "tools/call",
      params: {
        name: "ultracode_plan_dynamic",
        arguments: {
          cwd: "/repo/project",
          intent: "Review the current implementation plan and produce a risk report",
          outputPlan: ".ultracode/plans/risk-report.plan.json",
        },
      },
    },
    {
      listNamedWorkflows: () => [],
      writeDynamicPlanFile: (options) => {
        writtenPlan = options;
        return {
          planFile: options.planFile,
          intent: options.intent,
          createdAt: "2026-01-01T00:00:00.000Z",
          plan: options.plan,
        };
      },
    },
  );

  assert.equal(response.result.structuredContent.recommendedAction, "review_dynamic");
  assert.equal(response.result.structuredContent.requiresConfirmation, true);
  assert.equal(response.result.structuredContent.workflow.stages.length, 3);
  assert.equal(
    writtenPlan.planFile,
    "/repo/project/.ultracode/plans/risk-report.plan.json",
  );
  assert.equal(writtenPlan.intent, "Review the current implementation plan and produce a risk report");
  assert.equal(
    response.result.structuredContent.planFile,
    "/repo/project/.ultracode/plans/risk-report.plan.json",
  );
  assert.deepEqual(response.result.structuredContent.executionAfterApproval, {
    tool: "ultracode_run_dynamic",
    arguments: {
      cwd: "/repo/project",
      approved: true,
      planFile: "/repo/project/.ultracode/plans/risk-report.plan.json",
    },
    confirmationGate: "Only call this after the user has approved the dynamic workflow preview.",
  });
});

test("handleMcpRequest does not invent cwd for dynamic execution previews", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));
  let writtenPlan;

  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 9.1,
      method: "tools/call",
      params: {
        name: "ultracode_plan_dynamic",
        arguments: {
          intent: "Review the current implementation plan and produce a risk report",
          outputPlan: "/tmp/risk-report.plan.json",
        },
      },
    },
    {
      listNamedWorkflows: () => [],
      writeDynamicPlanFile: (options) => {
        writtenPlan = options;
        return {
          planFile: options.planFile,
          intent: options.intent,
          createdAt: "2026-01-01T00:00:00.000Z",
          plan: options.plan,
        };
      },
    },
  );

  assert.equal(response.result.structuredContent.recommendedAction, "review_dynamic");
  assert.equal(response.result.structuredContent.requiresConfirmation, true);
  assert.equal(writtenPlan.planFile, "/tmp/risk-report.plan.json");
  assert.equal(response.result.structuredContent.planFile, "/tmp/risk-report.plan.json");
  assert.equal(response.result.structuredContent.executionAfterApproval, undefined);
  assert.equal(
    response.result.structuredContent.preview.confirmationPrompt,
    "Review this preview, then re-run ultracode_plan_dynamic with cwd before executing so the approved workflow runs in the intended workspace.",
  );
});

test("handleMcpRequest rejects relative dynamic output plans without cwd", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));

  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 9.2,
      method: "tools/call",
      params: {
        name: "ultracode_plan_dynamic",
        arguments: {
          intent: "Review the current implementation plan and produce a risk report",
          outputPlan: ".ultracode/plans/risk-report.plan.json",
        },
      },
    },
    {
      listNamedWorkflows: () => [],
      writeDynamicPlanFile: () => {
        throw new Error("relative outputPlan without cwd should be rejected before writing");
      },
    },
  );

  assert.equal(response.result.isError, true);
  assert.equal(response.result.structuredContent.error, "Provide cwd when outputPlan is relative.");
  assert.equal(response.result.content[0].text, "Provide cwd when outputPlan is relative.");
});

test("handleMcpRequest auto-saves a dynamic plan when cwd is provided", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));
  let writtenPlan;

  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 10,
      method: "tools/call",
      params: {
        name: "ultracode_plan_dynamic",
        arguments: {
          cwd: "/repo/project",
          intent: "Review the current implementation plan and produce a risk report",
        },
      },
    },
    {
      listNamedWorkflows: () => [],
      writeDynamicPlanFile: (options) => {
        writtenPlan = options;
        return {
          planFile: options.planFile,
          intent: options.intent,
          createdAt: "2026-01-01T00:00:00.000Z",
          plan: options.plan,
        };
      },
    },
  );

  assert.match(
    writtenPlan.planFile,
    /^\/repo\/project\/\.ultracode\/plans\/review-the-current-implementation-plan-and-produce-a-risk-report-.+\.plan\.json$/,
  );
  assert.equal(response.result.structuredContent.planFile, writtenPlan.planFile);
  assert.equal(response.result.structuredContent.createdAt, "2026-01-01T00:00:00.000Z");
});

test("handleMcpRequest keeps Chinese words in default dynamic plan filenames", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));
  let writtenPlan;

  await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 11,
      method: "tools/call",
      params: {
        name: "ultracode_plan_dynamic",
        arguments: {
          cwd: "/repo/project",
          intent: "为第一次去京都的两位成人做 3 天旅游攻略，包含雨天方案",
        },
      },
    },
    {
      listNamedWorkflows: () => [],
      writeDynamicPlanFile: (options) => {
        writtenPlan = options;
        return {
          planFile: options.planFile,
          intent: options.intent,
          createdAt: "2026-01-01T00:00:00.000Z",
          plan: options.plan,
        };
      },
    },
  );

  assert.match(
    writtenPlan.planFile,
    /^\/repo\/project\/\.ultracode\/plans\/为第一次去京都的两位成人做-3-天旅游攻略-包含雨天方案-.+\.plan\.json$/,
  );
});

test("handleMcpRequest rejects direct dynamic workflow execution without a plan file", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));
  let didRun = false;

  const dynamicWorkflow = {
    name: "dynamic-review-plan",
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
    ],
  };

  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 10,
      method: "tools/call",
      params: {
        name: "ultracode_run_dynamic",
        arguments: {
          cwd: "/repo/project",
          intent: "Review the plan",
          approved: true,
          workflow: dynamicWorkflow,
          params: {
            target: "docs/tasks/todo.md",
          },
          runId: "dynamic-review",
        },
      },
    },
    {
      runJsonWorkflow: async () => {
        didRun = true;
        throw new Error("direct dynamic workflow execution must not run");
      },
    },
  );

  assert.equal(didRun, false);
  assert.equal(response.result.isError, true);
  assert.match(response.result.content[0].text, /requires planFile/);
});

test("handleMcpRequest runs an approved dynamic workflow from a plan file", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));
  let generatedWorkflow;
  let generatedParams;
  let copiedPlan;

  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 10.5,
      method: "tools/call",
      params: {
        name: "ultracode_run_dynamic",
        arguments: {
          cwd: "/repo/project",
          approved: true,
          planFile: ".ultracode/plans/fix-tests.json",
          runId: "dynamic-from-plan",
        },
      },
    },
    {
      readDynamicPlanFile: (planFile) => ({
        planFile,
        intent: "Fix tests",
        createdAt: "2026-01-01T00:00:00.000Z",
        params: {
          target: "docs/tasks/todo.md",
        },
        plan: {
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
            name: "dynamic-from-plan",
            stages: [
              {
                name: "implement-change",
                type: "codex",
                input: {
                  intent: "${params.intent}",
                },
                prompt: ["Implement."],
                output: {
                  file: "implementation-summary.md",
                },
              },
            ],
          },
        },
      }),
      prepareRunWorktree: (_cwd, options) => ({
        worktreeRoot: "/repo/project.worktrees/dynamic-from-plan",
        created: true,
        branch: `codex/ultracode-${options.runId}`,
        status: {
          isGitRepository: true,
          isLinkedWorktree: false,
          isSubmodule: false,
          reason: "primary-checkout",
        },
      }),
      createDynamicWorkflowFiles: (options) => {
        generatedWorkflow = options.workflow;
        generatedParams = options.params;
        return {
          workflowFile: `${options.outputDir}/workflow.dynamic.json`,
          paramFile: `${options.outputDir}/param.dynamic.json`,
          validation: {
            valid: true,
            errors: [],
          },
        };
      },
      copyApprovedDynamicPlanFile: (options) => {
        copiedPlan = options;
        return {
          approvedPlanFile: `${options.outputDir}/approved-plan.json`,
          planFile: options.planFile,
          intent: "Fix tests",
          createdAt: "2026-01-01T00:00:00.000Z",
          plan: {
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
              name: "dynamic-from-plan",
              stages: [],
            },
          },
        };
      },
      runJsonWorkflow: async (options) => ({
        workflow: "dynamic-from-plan",
        status: "completed",
        outputDir: options.outputDir,
        stages: [],
      }),
      configureTraceOutput: () => {},
    },
  );

  assert.equal(generatedWorkflow.name, "dynamic-from-plan");
  assert.deepEqual(generatedParams, {
    target: "docs/tasks/todo.md",
  });
  assert.equal(
    copiedPlan.outputDir,
    "/repo/project.worktrees/dynamic-from-plan/.ultracode/runs/dynamic-from-plan",
  );
  assert.equal(response.result.structuredContent.plan.intent, "Fix tests");
  assert.equal(
    response.result.structuredContent.plan.approvedPlanFile,
    "/repo/project.worktrees/dynamic-from-plan/.ultracode/runs/dynamic-from-plan/approved-plan.json",
  );
  assert.equal(response.result.structuredContent.result.workflow, "dynamic-from-plan");
  assert.deepEqual(response.result.structuredContent.inspection, {
    runId: "dynamic-from-plan",
    outputDir: "/repo/project.worktrees/dynamic-from-plan/.ultracode/runs/dynamic-from-plan",
    approvedPlanFile:
      "/repo/project.worktrees/dynamic-from-plan/.ultracode/runs/dynamic-from-plan/approved-plan.json",
    status: {
      tool: "ultracode_status",
      arguments: {
        cwd: "/repo/project",
        runId: "dynamic-from-plan",
      },
    },
    tail: {
      tool: "ultracode_tail",
      arguments: {
        cwd: "/repo/project",
        runId: "dynamic-from-plan",
        limit: 20,
      },
    },
    report: {
      tool: "ultracode_report",
      arguments: {
        cwd: "/repo/project",
        runId: "dynamic-from-plan",
      },
    },
    artifact: {
      tool: "ultracode_artifact",
      arguments: {
        cwd: "/repo/project",
        runId: "dynamic-from-plan",
      },
    },
    restartStage: {
      tool: "ultracode_restart_stage",
      arguments: {
        cwd: "/repo/project",
        runId: "dynamic-from-plan",
        stageName: "<stage-name>",
      },
    },
    reworkStage: {
      tool: "ultracode_rework_stage",
      arguments: {
        cwd: "/repo/project",
        runId: "dynamic-from-plan",
        stageName: "<stage-name>",
        feedback: {
          comments: ["<feedback>"],
        },
      },
    },
    nextActions: [
      "Call ultracode_status with inspection.status.arguments to display run progress.",
      "Call ultracode_tail with inspection.tail.arguments when recent events are useful.",
      "Call ultracode_report with inspection.report.arguments when the run is completed.",
      "Call ultracode_artifact with inspection.artifact.arguments to preview the final artifact.",
      "Use inspection.restartStage.arguments as a template when a stage should be retried.",
      "Use inspection.reworkStage.arguments as a template when reviewer feedback should be applied.",
      "Use inspection.approvedPlanFile as the audit record for the approved dynamic plan.",
    ],
  });
});

test("handleMcpRequest restores dynamic execution controls from a plan file", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));
  let preparedOptions;
  let generatedOutputDir;

  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 10.6,
      method: "tools/call",
      params: {
        name: "ultracode_run_dynamic",
        arguments: {
          cwd: "/repo/project",
          approved: true,
          planFile: ".ultracode/plans/context.plan.json",
        },
      },
    },
    {
      readDynamicPlanFile: (planFile) => ({
        planFile,
        intent: "Review saved context",
        createdAt: "2026-01-01T00:00:00.000Z",
        execution: {
          outputDir: ".ultracode/runs/context-from-plan",
          runId: "context-from-plan",
          worktreeDir: "../worktrees/context-from-plan",
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
            name: "dynamic-context-from-plan",
            stages: [
              {
                name: "research",
                type: "codex",
                prompt: ["Research."],
                output: {
                  file: "research.md",
                },
              },
            ],
          },
        },
      }),
      prepareRunWorktree: (_cwd, options) => {
        preparedOptions = options;
        return {
          worktreeRoot: "/repo/project.worktrees/context-from-plan",
          created: true,
          branch: `codex/ultracode-${options.runId}`,
          status: {
            isGitRepository: true,
            isLinkedWorktree: false,
            isSubmodule: false,
            reason: "primary-checkout",
          },
        };
      },
      createDynamicWorkflowFiles: (options) => {
        generatedOutputDir = options.outputDir;
        return {
          workflowFile: `${options.outputDir}/workflow.dynamic.json`,
          paramFile: `${options.outputDir}/param.dynamic.json`,
          validation: {
            valid: true,
            errors: [],
          },
        };
      },
      copyApprovedDynamicPlanFile: (options) => ({
        approvedPlanFile: `${options.outputDir}/approved-plan.json`,
        planFile: options.planFile,
        intent: "Review saved context",
        createdAt: "2026-01-01T00:00:00.000Z",
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
            name: "dynamic-context-from-plan",
            stages: [],
          },
        },
      }),
      runJsonWorkflow: async (options) => ({
        workflow: "dynamic-context-from-plan",
        status: "completed",
        outputDir: options.outputDir,
        stages: [],
      }),
      configureTraceOutput: () => {},
    },
  );

  assert.deepEqual(preparedOptions, {
    runId: "context-from-plan",
    worktreeDir: "../worktrees/context-from-plan",
  });
  assert.equal(
    generatedOutputDir,
    "/repo/project.worktrees/context-from-plan/.ultracode/runs/context-from-plan",
  );
  assert.equal(response.result.structuredContent.inspection.runId, "context-from-plan");
  assert.equal(
    response.result.structuredContent.inspection.outputDir,
    "/repo/project.worktrees/context-from-plan/.ultracode/runs/context-from-plan",
  );
});

test("handleMcpRequest deep merges explicit dynamic params over plan file params", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));
  let generatedParams;
  let copiedPlan;

  await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 10.7,
      method: "tools/call",
      params: {
        name: "ultracode_run_dynamic",
        arguments: {
          cwd: "/repo/project",
          approved: true,
          planFile: ".ultracode/plans/params.plan.json",
          params: {
            scope: {
              details: {
                priority: "high",
              },
            },
            tags: ["explicit"],
          },
        },
      },
    },
    {
      readDynamicPlanFile: (planFile) => ({
        planFile,
        intent: "Review saved params",
        createdAt: "2026-01-01T00:00:00.000Z",
        params: {
          scope: {
            paths: ["scripts/src/mcp.ts"],
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
            name: "dynamic-params-from-plan",
            stages: [
              {
                name: "research",
                type: "codex",
                prompt: ["Research."],
                output: {
                  file: "research.md",
                },
              },
            ],
          },
        },
      }),
      prepareRunWorktree: (_cwd, options) => ({
        worktreeRoot: `/repo/project.worktrees/${options.runId}`,
        created: true,
        branch: `codex/ultracode-${options.runId}`,
        status: {
          isGitRepository: true,
          isLinkedWorktree: false,
          isSubmodule: false,
          reason: "primary-checkout",
        },
      }),
      createDynamicWorkflowFiles: (options) => {
        generatedParams = options.params;
        return {
          workflowFile: `${options.outputDir}/workflow.dynamic.json`,
          paramFile: `${options.outputDir}/param.dynamic.json`,
          validation: {
            valid: true,
            errors: [],
          },
        };
      },
      copyApprovedDynamicPlanFile: (options) => {
        copiedPlan = options;
        return {
          approvedPlanFile: `${options.outputDir}/approved-plan.json`,
          planFile: options.planFile,
          intent: "Review saved params",
          createdAt: "2026-01-01T00:00:00.000Z",
          params: options.params,
          execution: options.execution,
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
              name: "dynamic-params-from-plan",
              stages: [],
            },
          },
        };
      },
      runJsonWorkflow: async (options) => ({
        workflow: "dynamic-params-from-plan",
        status: "completed",
        outputDir: options.outputDir,
        stages: [],
      }),
      configureTraceOutput: () => {},
    },
  );

  assert.deepEqual(generatedParams, {
    scope: {
      paths: ["scripts/src/mcp.ts"],
      details: {
        owner: "maintainers",
        priority: "high",
      },
    },
    audience: "maintainers",
    tags: ["explicit"],
  });
  assert.deepEqual(copiedPlan.params, generatedParams);
  assert.equal(copiedPlan.execution.runId, copiedPlan.outputDir.split("/").at(-1));
  assert.match(copiedPlan.execution.outputDir, /^\.ultracode\/runs\/dynamic-/);
});

test("handleMcpRequest rejects unapproved dynamic workflow execution", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));

  const response = await handleMcpRequest({
    jsonrpc: "2.0",
    id: 11,
    method: "tools/call",
    params: {
      name: "ultracode_run_dynamic",
      arguments: {
        cwd: "/repo/project",
        approved: false,
        planFile: ".ultracode/plans/review-plan.json",
      },
    },
  });

  assert.equal(response.result.isError, true);
  assert.match(response.result.content[0].text, /requires approved=true/);
});

test("handleMcpRequest restarts and reworks workflow stages", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));

  const restartResponse = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 12,
      method: "tools/call",
      params: {
        name: "ultracode_restart_stage",
        arguments: {
          outputDir: "/repo/run",
          stageName: "draft",
          cascade: true,
        },
      },
    },
    {
      restartWorkflowStage: async (input) => ({
        workflow: "manual-flow",
        outputDir: input.outputDir,
        cascadedStages: input.cascade ? [] : ["unexpected"],
        stage: {
          stage: input.stageName,
          status: "passed",
          attempt: 2,
          outputFile: "/repo/run/stages/001-draft/attempts/002/draft.md",
        },
      }),
    },
  );

  assert.equal(restartResponse.result.structuredContent.stage.attempt, 2);
  assert.equal(restartResponse.result.structuredContent.stage.stage, "draft");
  assert.deepEqual(restartResponse.result.structuredContent.cascadedStages, []);

  const reworkResponse = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 13,
      method: "tools/call",
      params: {
        name: "ultracode_rework_stage",
        arguments: {
          outputDir: "/repo/run",
          stageName: "draft",
          feedback: {
            comments: ["Add risks"],
          },
          cascade: true,
        },
      },
    },
    {
      reworkWorkflowStage: async (input) => ({
        workflow: "manual-flow",
        outputDir: input.outputDir,
        cascadedStages: input.cascade ? [{ stage: "review", attempt: 2 }] : [],
        stage: {
          stage: input.stageName,
          status: "passed",
          attempt: 3,
          inputFile: "/repo/run/stages/001-draft/attempts/003/input.json",
        },
      }),
    },
  );

  assert.equal(reworkResponse.result.structuredContent.stage.attempt, 3);
  assert.equal(reworkResponse.result.structuredContent.cascadedStages[0].stage, "review");
});

test("handleMcpRequest restarts and reworks workflow stages by run id", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));
  const resolvedOutputDir = "/repo/project/.ultracode/runs/run-one";
  const resolverCalls = [];

  const dependencies = {
    resolveRunOutputDir: (input) => {
      resolverCalls.push(input);
      assert.equal(input.repoRoot, "/repo/project");
      assert.equal(input.target, "run-one");
      return resolvedOutputDir;
    },
    restartWorkflowStage: async (input) => ({
      workflow: "manual-flow",
      outputDir: input.outputDir,
      cascadedStages: input.cascade ? [{ stage: "review", attempt: 2 }] : [],
      stage: {
        stage: input.stageName,
        status: "passed",
        attempt: 2,
        outputFile: `${input.outputDir}/stages/001-draft/attempts/002/draft.md`,
      },
    }),
    reworkWorkflowStage: async (input) => ({
      workflow: "manual-flow",
      outputDir: input.outputDir,
      feedback: input.feedback,
      cascadedStages: input.cascade ? [{ stage: "review", attempt: 3 }] : [],
      stage: {
        stage: input.stageName,
        status: "passed",
        attempt: 3,
        outputFile: `${input.outputDir}/stages/001-draft/attempts/003/draft.md`,
      },
    }),
  };

  const restartResponse = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 131,
      method: "tools/call",
      params: {
        name: "ultracode_restart_stage",
        arguments: {
          cwd: "/repo/project",
          runId: "run-one",
          stageName: "draft",
          cascade: true,
        },
      },
    },
    dependencies,
  );

  assert.equal(restartResponse.result.structuredContent.outputDir, resolvedOutputDir);
  assert.equal(restartResponse.result.structuredContent.stage.attempt, 2);
  assert.deepEqual(restartResponse.result.structuredContent.inspection.report.arguments, {
    cwd: "/repo/project",
    runId: "run-one",
  });
  assert.equal(
    restartResponse.result.structuredContent.inspection.stages[0].artifact.outputFile,
    `${resolvedOutputDir}/stages/001-draft/attempts/002/draft.md`,
  );
  assert.deepEqual(
    restartResponse.result.structuredContent.inspection.stages[0].restartStage.arguments,
    {
      cwd: "/repo/project",
      runId: "run-one",
      stageName: "draft",
    },
  );

  const reworkResponse = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 132,
      method: "tools/call",
      params: {
        name: "ultracode_rework_stage",
        arguments: {
          cwd: "/repo/project",
          runId: "run-one",
          stageName: "draft",
          feedback: {
            comments: ["Add rollout risks"],
          },
          cascade: true,
        },
      },
    },
    dependencies,
  );

  assert.equal(reworkResponse.result.structuredContent.outputDir, resolvedOutputDir);
  assert.deepEqual(reworkResponse.result.structuredContent.feedback, {
    comments: ["Add rollout risks"],
  });
  assert.equal(
    reworkResponse.result.structuredContent.inspection.stages[0].artifact.outputFile,
    `${resolvedOutputDir}/stages/001-draft/attempts/003/draft.md`,
  );
  assert.deepEqual(reworkResponse.result.structuredContent.inspection.reworkStage.arguments, {
    cwd: "/repo/project",
    runId: "run-one",
    stageName: "<stage-name>",
    feedback: {
      comments: ["<feedback>"],
    },
  });
  assert.equal(resolverCalls.length, 2);
});

test("handleMcpRequest lists runs, returns artifacts, and prunes runs", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));

  const listResponse = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 14,
      method: "tools/call",
      params: {
        name: "ultracode_list_runs",
        arguments: {
          cwd: "/repo/project",
          limit: 1,
        },
      },
    },
    {
      listRuns: (input) => [
        {
          runId: "run-one",
          workflow: "doc-flow",
          outputDir: `${input.repoRoot}/.ultracode/runs/run-one`,
          status: "completed",
          updatedAt: "2026-06-05T00:00:00.000Z",
          source: "checkout",
        },
      ],
    },
  );

  assert.equal(listResponse.result.structuredContent.runs[0].runId, "run-one");

  const artifactResponse = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 15,
      method: "tools/call",
      params: {
        name: "ultracode_artifact",
        arguments: {
          cwd: "/repo/project",
          runId: "run-one",
        },
      },
    },
    {
      getRunArtifact: (input) => ({
        runId: input.runId,
        workflow: "doc-flow",
        outputDir: "/repo/project/.ultracode/runs/run-one",
        file: "/repo/project/.ultracode/runs/run-one/stages/001-final/attempts/001/final.md",
        preview: "final body",
      }),
    },
  );

  assert.match(artifactResponse.result.content[0].text, /final\.md/);
  assert.equal(artifactResponse.result.structuredContent.preview, "final body");

  const pruneResponse = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 16,
      method: "tools/call",
      params: {
        name: "ultracode_prune_runs",
        arguments: {
          cwd: "/repo/project",
          runIds: ["run-one"],
          removeWorktrees: true,
        },
      },
    },
    {
      pruneRuns: (input) => ({
        removed: input.runIds.map((runId) => ({
          runId,
          outputDir: `/repo/project/.ultracode/runs/${runId}`,
        })),
        removedWorktrees: input.removeWorktrees
          ? input.runIds.map((runId) => ({
              runId,
              worktreeRoot: `/repo/project.worktrees/${runId}`,
            }))
          : [],
        missing: [],
      }),
    },
  );

  assert.equal(pruneResponse.result.structuredContent.removed[0].runId, "run-one");
  assert.equal(
    pruneResponse.result.structuredContent.removedWorktrees[0].worktreeRoot,
    "/repo/project.worktrees/run-one",
  );
});

test("handleMcpRequest returns workflow status from inspector tools", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));

  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "ultracode_status",
        arguments: {
          outputDir: "/repo/project.worktrees/manual/.runs/manual",
        },
      },
    },
    {
      inspectWorkflowStatus: (outputDir) => ({
        workflow: "doc-flow",
        status: "completed",
        outputDir,
        stages: [],
        failedGates: [],
      }),
    },
  );

  assert.equal(response.result.structuredContent.workflow, "doc-flow");
  assert.equal(response.result.structuredContent.status, "completed");
});

test("handleMcpRequest returns workflow tail and report from inspector tools", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));

  const tailResponse = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "ultracode_tail",
        arguments: {
          outputDir: "/repo/run",
          limit: 1,
        },
      },
    },
    {
      inspectWorkflowTail: (outputDir, options) => ({
        outputDir,
        traceFile: `${outputDir}/trace.jsonl`,
        events: [{ type: "stage.completed", limit: options.limit }],
      }),
    },
  );

  assert.equal(tailResponse.result.structuredContent.events[0].type, "stage.completed");
  assert.equal(tailResponse.result.structuredContent.events[0].limit, 1);

  const reportResponse = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "ultracode_report",
        arguments: {
          outputDir: "/repo/run",
        },
      },
    },
    {
      inspectWorkflowReport: (outputDir) => ({
        workflow: "doc-flow",
        status: "completed",
        outputDir,
        stages: [],
        failedGates: [],
        summary: "Workflow doc-flow is completed.",
      }),
    },
  );

  assert.match(reportResponse.result.content[0].text, /doc-flow/);
  assert.equal(reportResponse.result.structuredContent.status, "completed");
});

test("handleMcpRequest inspects workflows by run id", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));
  const resolvedOutputDir = "/repo/project/.ultracode/runs/run-one";
  const resolvedTargets = [];

  const dependencies = {
    resolveRunOutputDir: (input) => {
      resolvedTargets.push(input);
      assert.equal(input.repoRoot, "/repo/project");
      assert.equal(input.target, "run-one");
      return resolvedOutputDir;
    },
    inspectWorkflowStatus: (outputDir) => ({
      workflow: "doc-flow",
      status: "completed",
      outputDir,
      stages: [],
      failedGates: [],
    }),
    inspectWorkflowTail: (outputDir, options) => ({
      outputDir,
      traceFile: `${outputDir}/trace.jsonl`,
      events: [{ type: "workflow.completed", limit: options.limit }],
    }),
    inspectWorkflowReport: (outputDir) => ({
      workflow: "doc-flow",
      status: "completed",
      outputDir,
      stages: [],
      failedGates: [],
      summary: "Workflow doc-flow is completed.",
    }),
  };

  const statusResponse = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 5.1,
      method: "tools/call",
      params: {
        name: "ultracode_status",
        arguments: {
          cwd: "/repo/project",
          runId: "run-one",
        },
      },
    },
    dependencies,
  );
  assert.equal(statusResponse.result.structuredContent.outputDir, resolvedOutputDir);

  const tailResponse = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 5.2,
      method: "tools/call",
      params: {
        name: "ultracode_tail",
        arguments: {
          cwd: "/repo/project",
          runId: "run-one",
          limit: 1,
        },
      },
    },
    dependencies,
  );
  assert.equal(tailResponse.result.structuredContent.events[0].type, "workflow.completed");
  assert.equal(tailResponse.result.structuredContent.events[0].limit, 1);

  const reportResponse = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 5.3,
      method: "tools/call",
      params: {
        name: "ultracode_report",
        arguments: {
          cwd: "/repo/project",
          runId: "run-one",
        },
      },
    },
    dependencies,
  );
  assert.equal(reportResponse.result.structuredContent.outputDir, resolvedOutputDir);
  assert.equal(resolvedTargets.length, 3);
});
