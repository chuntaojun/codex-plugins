import type { NamedWorkflowSummary } from "./named-workflows.js";
export type DynamicWorkflowStage = {
    name: string;
    type: "codex";
    dependsOn?: string[];
    input: Record<string, string>;
    prompt: string[];
    agent?: {
        mode?: "read-only" | "write";
    };
    output: {
        file: string;
    };
};
export type DynamicWorkflow = {
    name: string;
    description: string;
    stages: DynamicWorkflowStage[];
};
export type DynamicWorkflowStagePreview = {
    name: string;
    mode: "read-only" | "write";
    outputFile: string;
    dependsOn: string[];
};
export type DynamicWorkflowTemplate = "debug-fix" | "code-change" | "research" | "content-deliverable" | "generic";
export type DynamicWorkflowPreview = {
    template: DynamicWorkflowTemplate;
    summary: string;
    stageCount: number;
    writeStages: string[];
    outputFiles: string[];
    stagePlan: DynamicWorkflowStagePreview[];
    risks: string[];
    confirmationPrompt: string;
};
export type DynamicWorkflowPlan = {
    recommendedAction: "run_named";
    requiresConfirmation: false;
    workflowName: string;
    reason: string;
    workflow?: never;
} | {
    recommendedAction: "review_dynamic";
    requiresConfirmation: true;
    reason: string;
    workflow: DynamicWorkflow;
    preview: DynamicWorkflowPreview;
    workflowName?: never;
};
export type PlanDynamicWorkflowOptions = {
    intent: string;
    availableWorkflows?: NamedWorkflowSummary[];
};
export declare function planDynamicWorkflow(options: PlanDynamicWorkflowOptions): DynamicWorkflowPlan;
