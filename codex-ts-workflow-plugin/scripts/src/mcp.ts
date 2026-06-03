import path from "node:path";
import readline from "node:readline";

import { configureTraceOutput } from "./core/events.js";
import {
  prepareRunWorktree,
  type PreparedRunWorktree,
  type PrepareRunWorktreeOptions,
} from "./core/git-worktree.js";
import {
  inspectWorkflowReport,
  inspectWorkflowStatus,
  inspectWorkflowTail,
} from "./core/inspector.js";
import {
  runJsonWorkflow,
  type JsonWorkflowRunResult,
  type RunJsonWorkflowOptions,
} from "./json-runner.js";

type JsonRpcId = string | number | null;
type JsonRpcRequest = {
  jsonrpc?: "2.0";
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
};

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: Record<string, unknown>;
  isError?: boolean;
};

type RunWorkflowInput = {
  cwd: string;
  workflowFile: string;
  paramFile: string;
  outputDir?: string;
  runId?: string;
  worktreeDir?: string;
};

type McpDependencies = {
  prepareRunWorktree?: (
    repoRoot: string,
    options?: PrepareRunWorktreeOptions,
  ) => PreparedRunWorktree;
  runJsonWorkflow?: (options: RunJsonWorkflowOptions) => Promise<JsonWorkflowRunResult>;
  configureTraceOutput?: typeof configureTraceOutput;
  inspectWorkflowStatus?: typeof inspectWorkflowStatus;
  inspectWorkflowTail?: typeof inspectWorkflowTail;
  inspectWorkflowReport?: typeof inspectWorkflowReport;
};

const SUPPORTED_PROTOCOL_VERSIONS = new Set([
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
]);
const DEFAULT_PROTOCOL_VERSION = "2025-11-25";

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

const RUN_WORKFLOW_TOOL = {
  name: "run_workflow",
  description:
    "Run a JSON-defined Codex workflow through harness-cli's runtime in an isolated git worktree.",
  inputSchema: {
    type: "object",
    properties: {
      cwd: {
        type: "string",
        description: "Repository checkout directory to start from. Pass the current Codex workspace root.",
      },
      workflowFile: {
        type: "string",
        description: "Workflow JSON path, resolved relative to cwd unless absolute.",
      },
      paramFile: {
        type: "string",
        description: "Parameter JSON path, resolved relative to cwd unless absolute.",
      },
      outputDir: {
        type: "string",
        description:
          "Optional artifact directory, resolved inside the prepared run worktree. Defaults to .codex-workflows/runs/<run-id>.",
      },
      runId: {
        type: "string",
        description: "Optional stable run id used for the branch, worktree directory, and default outputDir.",
      },
      worktreeDir: {
        type: "string",
        description: "Optional explicit run worktree directory.",
      },
    },
    required: ["cwd", "workflowFile", "paramFile"],
    additionalProperties: false,
  },
};

const WORKFLOW_STATUS_TOOL = {
  name: "workflow_status",
  description: "Read a workflow run status summary from its artifact directory.",
  inputSchema: {
    type: "object",
    properties: {
      outputDir: {
        type: "string",
        description: "Workflow run artifact directory containing workflow-result.json.",
      },
    },
    required: ["outputDir"],
    additionalProperties: false,
  },
};

const WORKFLOW_TAIL_TOOL = {
  name: "workflow_tail",
  description: "Read recent workflow trace events from a run artifact directory.",
  inputSchema: {
    type: "object",
    properties: {
      outputDir: {
        type: "string",
        description: "Workflow run artifact directory containing trace.jsonl.",
      },
      limit: {
        type: "number",
        description: "Maximum number of recent events to return. Defaults to 20.",
      },
    },
    required: ["outputDir"],
    additionalProperties: false,
  },
};

const WORKFLOW_REPORT_TOOL = {
  name: "workflow_report",
  description: "Read a concise final workflow report from its artifact directory.",
  inputSchema: {
    type: "object",
    properties: {
      outputDir: {
        type: "string",
        description: "Workflow run artifact directory containing workflow-result.json.",
      },
    },
    required: ["outputDir"],
    additionalProperties: false,
  },
};

const TOOLS = [
  RUN_WORKFLOW_TOOL,
  WORKFLOW_STATUS_TOOL,
  WORKFLOW_TAIL_TOOL,
  WORKFLOW_REPORT_TOOL,
];

function contentResult(
  text: string,
  structuredContent: Record<string, unknown> = {},
  isError = false,
): ToolResult {
  return {
    content: [{ type: "text", text }],
    structuredContent,
    isError,
  };
}

function errorResponse(id: JsonRpcId, code: number, message: string): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message },
  };
}

function handleInitialize(params: Record<string, unknown> = {}): Record<string, unknown> {
  const requestedVersion =
    typeof params.protocolVersion === "string" && SUPPORTED_PROTOCOL_VERSIONS.has(params.protocolVersion)
      ? params.protocolVersion
      : DEFAULT_PROTOCOL_VERSION;

  return {
    protocolVersion: requestedVersion,
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: "harness-workflow",
      version: "0.1.0",
    },
  };
}

function requireString(input: Record<string, unknown>, key: keyof RunWorkflowInput): string {
  const value = input[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} must be a non-empty string.`);
  }
  return value;
}

function optionalString(
  input: Record<string, unknown>,
  key: keyof RunWorkflowInput,
): string | undefined {
  const value = input[key];
  if (value == null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`${key} must be a string.`);
  }
  return value;
}

function buildRunWorkflowInput(input: Record<string, unknown>): RunWorkflowInput {
  return {
    cwd: path.resolve(requireString(input, "cwd")),
    workflowFile: requireString(input, "workflowFile"),
    paramFile: requireString(input, "paramFile"),
    outputDir: optionalString(input, "outputDir"),
    runId: optionalString(input, "runId"),
    worktreeDir: optionalString(input, "worktreeDir"),
  };
}

async function handleRunWorkflowTool(
  rawInput: Record<string, unknown>,
  dependencies: McpDependencies,
): Promise<ToolResult> {
  let input: RunWorkflowInput;
  try {
    input = buildRunWorkflowInput(rawInput);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return contentResult(message, { error: message }, true);
  }

  const prepare = dependencies.prepareRunWorktree ?? prepareRunWorktree;
  const runWorkflow = dependencies.runJsonWorkflow ?? runJsonWorkflow;
  const configureTrace = dependencies.configureTraceOutput ?? configureTraceOutput;

  try {
    const workflowFile = path.resolve(input.cwd, input.workflowFile);
    const paramFile = path.resolve(input.cwd, input.paramFile);
    const runId = input.runId ?? `${path.basename(input.workflowFile, ".json")}-${timestamp()}`;
    const prepared = prepare(input.cwd, {
      runId,
      worktreeDir: input.worktreeDir,
    });
    const outputDir = path.resolve(
      prepared.worktreeRoot,
      input.outputDir ?? `.codex-workflows/runs/${runId}`,
    );

    configureTrace(path.join(outputDir, "trace.jsonl"), { silent: true });
    const result = await runWorkflow({
      repoRoot: prepared.worktreeRoot,
      workflowFile,
      paramFile,
      outputDir,
    });

    const payload = {
      worktree: {
        root: prepared.worktreeRoot,
        created: prepared.created,
        branch: prepared.branch,
      },
      result,
    };
    return contentResult(JSON.stringify(payload, null, 2), payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return contentResult(message, { error: message }, true);
  }
}

async function handleToolCall(
  params: Record<string, unknown> = {},
  dependencies: McpDependencies = {},
): Promise<ToolResult> {
  const name = params.name;
  const input = params.arguments ?? {};
  if (typeof name !== "string") {
    return contentResult("Tool name must be a string.", {}, true);
  }
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return contentResult("Tool arguments must be an object.", {}, true);
  }
  if (name === RUN_WORKFLOW_TOOL.name) {
    return handleRunWorkflowTool(input as Record<string, unknown>, dependencies);
  }
  if (name === WORKFLOW_STATUS_TOOL.name) {
    return handleInspectTool(input as Record<string, unknown>, "status", dependencies);
  }
  if (name === WORKFLOW_TAIL_TOOL.name) {
    return handleInspectTool(input as Record<string, unknown>, "tail", dependencies);
  }
  if (name === WORKFLOW_REPORT_TOOL.name) {
    return handleInspectTool(input as Record<string, unknown>, "report", dependencies);
  }
  return contentResult(`Unknown tool: ${name}`, {}, true);
}

function requireOutputDir(input: Record<string, unknown>): string {
  return path.resolve(requireString(input, "outputDir" as keyof RunWorkflowInput));
}

function optionalNumber(input: Record<string, unknown>, key: string): number | undefined {
  const value = input[key];
  if (value == null) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${key} must be a number.`);
  }
  return value;
}

function handleInspectTool(
  rawInput: Record<string, unknown>,
  kind: "status" | "tail" | "report",
  dependencies: McpDependencies,
): ToolResult {
  try {
    const outputDir = requireOutputDir(rawInput);
    const payload =
      kind === "status"
        ? (dependencies.inspectWorkflowStatus ?? inspectWorkflowStatus)(outputDir)
        : kind === "tail"
          ? (dependencies.inspectWorkflowTail ?? inspectWorkflowTail)(outputDir, {
              limit: optionalNumber(rawInput, "limit"),
            })
          : (dependencies.inspectWorkflowReport ?? inspectWorkflowReport)(outputDir);
    return contentResult(JSON.stringify(payload, null, 2), payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return contentResult(message, { error: message }, true);
  }
}

export async function handleMcpRequest(
  message: JsonRpcRequest,
  dependencies: McpDependencies = {},
): Promise<JsonRpcResponse | null> {
  if (!("id" in message)) {
    return null;
  }

  const id = message.id ?? null;
  switch (message.method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: handleInitialize(message.params),
      };
    case "ping":
      return {
        jsonrpc: "2.0",
        id,
        result: {},
      };
    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: { tools: TOOLS },
      };
    case "tools/call":
      return {
        jsonrpc: "2.0",
        id,
        result: await handleToolCall(message.params, dependencies),
      };
    default:
      return errorResponse(id, -32601, `Method not found: ${message.method ?? "<missing>"}`);
  }
}

function send(message: JsonRpcResponse): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

export function startMcpServer(): void {
  const rl = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  });

  rl.on("line", (line) => {
    if (!line.trim()) {
      return;
    }
    void (async () => {
      try {
        const message = JSON.parse(line) as JsonRpcRequest;
        const response = await handleMcpRequest(message);
        if (response) {
          send(response);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        send(errorResponse(null, -32700, message));
      }
    })();
  });
}
