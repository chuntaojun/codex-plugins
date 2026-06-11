import type { WorkflowContext, WorkflowMode } from "./schema.js";
export type { WorkflowContext } from "./schema.js";
export declare function createWorkflowContext(input: {
    repoRoot: string;
    workflow: string;
    goal?: string;
    target?: string;
    mode: WorkflowMode;
    outputDir: string;
}): WorkflowContext;
