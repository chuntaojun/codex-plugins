import { configureTraceOutput } from "./core/events.js";
import { type PreparedRunWorktree, type PrepareRunWorktreeOptions } from "./core/git-worktree.js";
import { inspectWorkflowReport, inspectWorkflowStatus, inspectWorkflowTail } from "./core/inspector.js";
import { type JsonWorkflowRunResult, type RunJsonWorkflowOptions } from "./json-runner.js";
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
type McpDependencies = {
    prepareRunWorktree?: (repoRoot: string, options?: PrepareRunWorktreeOptions) => PreparedRunWorktree;
    runJsonWorkflow?: (options: RunJsonWorkflowOptions) => Promise<JsonWorkflowRunResult>;
    configureTraceOutput?: typeof configureTraceOutput;
    inspectWorkflowStatus?: typeof inspectWorkflowStatus;
    inspectWorkflowTail?: typeof inspectWorkflowTail;
    inspectWorkflowReport?: typeof inspectWorkflowReport;
};
export declare function handleMcpRequest(message: JsonRpcRequest, dependencies?: McpDependencies): Promise<JsonRpcResponse | null>;
export declare function startMcpServer(): void;
export {};
