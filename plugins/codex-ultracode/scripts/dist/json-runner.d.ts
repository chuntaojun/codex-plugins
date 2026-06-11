import type { AgentRunner } from "./core/codex.js";
import { type JsonValue, type StageResult } from "./core/stage.js";
type JsonRecord = Record<string, JsonValue>;
export type JsonWorkflowStageRun = StageResult & {
    input: JsonRecord;
};
export type JsonWorkflowRunResult = {
    workflow: string;
    status: "completed";
    outputDir: string;
    stages: JsonWorkflowStageRun[];
};
export type RunJsonWorkflowOptions = {
    repoRoot: string;
    workflowFile: string;
    paramFile: string;
    outputDir: string;
    runAgent?: AgentRunner;
};
export declare function runJsonWorkflow(options: RunJsonWorkflowOptions): Promise<JsonWorkflowRunResult>;
export {};
