import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.resolve(__dirname, "../dist");

test("handleMcpRequest lists the run_workflow tool", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));

  const response = await handleMcpRequest({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
  });

  assert.equal(response.jsonrpc, "2.0");
  assert.equal(response.id, 1);
  assert.equal(response.result.tools[0].name, "run_workflow");
  assert(response.result.tools.some((tool) => tool.name === "workflow_status"));
  assert(response.result.tools.some((tool) => tool.name === "workflow_tail"));
  assert(response.result.tools.some((tool) => tool.name === "workflow_report"));
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
        name: "run_workflow",
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
        branch: `codex/harness-${options.runId}`,
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
          stages: [],
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
  assert.equal(payload.worktree.branch, "codex/harness-manual");
  assert.equal(payload.result.workflow, "doc-flow");
});

test("handleMcpRequest returns workflow status from inspector tools", async () => {
  const { handleMcpRequest } = await import(path.join(distRoot, "mcp.js"));

  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "workflow_status",
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
        name: "workflow_tail",
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
        name: "workflow_report",
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
