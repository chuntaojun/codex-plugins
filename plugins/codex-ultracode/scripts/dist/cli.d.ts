import { type WorkflowReport, type WorkflowStatus, type WorkflowTail } from "./core/inspector.js";
import type { JsonValue } from "./core/stage.js";
import { type DynamicWorkflowPlan } from "./dynamic-planner.js";
import { type NamedWorkflowSummary } from "./named-workflows.js";
import { type WorkflowStageActionResult } from "./workflow-actions.js";
import { type PruneRunsResult, type RunArtifact, type RunSummary } from "./run-registry.js";
type JsonRecord = Record<string, JsonValue>;
export type RunFollowUpEvent = {
    type: "workflow.next_actions";
    runId: string;
    commands: {
        report: string;
        status: string;
        tail: string;
        restartStage: string;
        reworkStage: string;
    };
};
export declare function buildRunFollowUpEvent(runId: string): RunFollowUpEvent;
export type CliInput = {
    command: "help";
} | {
    command: "run-json";
    workflowFile: string;
    paramFile: string;
    outputDir: string;
    runId: string;
    worktreeDir?: string;
    json: boolean;
} | {
    command: "run-named";
    workflowName: string;
    intent?: string;
    params: JsonRecord;
    outputDir: string;
    runId: string;
    worktreeDir?: string;
    registryDir?: string;
    approved?: boolean;
    json: boolean;
} | {
    command: "status" | "report" | "watch";
    outputDir: string;
    json: boolean;
} | {
    command: "list-workflows";
    registryDir?: string;
    json: boolean;
} | {
    command: "describe-workflow";
    workflowName: string;
    registryDir?: string;
    json: boolean;
} | {
    command: "plan-dynamic";
    intent: string;
    params: JsonRecord;
    outputPlan?: string;
    outputDir?: string;
    runId?: string;
    worktreeDir?: string;
    registryDir?: string;
    json: boolean;
} | {
    command: "dispatch";
    intent: string;
    params: JsonRecord;
    outputPlan?: string;
    outputDir?: string;
    runId?: string;
    worktreeDir?: string;
    registryDir?: string;
    json: boolean;
} | {
    command: "run-dynamic";
    planFile: string;
    approved: boolean;
    params: JsonRecord;
    outputDir?: string;
    runId?: string;
    worktreeDir?: string;
    registryDir?: string;
    json: boolean;
} | {
    command: "tail";
    outputDir: string;
    limit: number;
    json: boolean;
} | {
    command: "restart-stage";
    outputDir: string;
    stageName: string;
    cascade: boolean;
    json: boolean;
} | {
    command: "rework-stage";
    outputDir: string;
    stageName: string;
    feedback: JsonRecord;
    cascade: boolean;
    json: boolean;
} | {
    command: "list-runs";
    limit: number;
    json: boolean;
} | {
    command: "artifact";
    runId: string;
    json: boolean;
} | {
    command: "prune-runs";
    runIds: string[];
    removeWorktrees: boolean;
    json: boolean;
};
export declare function formatCliHelp(): string;
export declare function parseCliArgs(argv: string[]): CliInput;
export declare function formatWorkflowStatus(status: WorkflowStatus): string;
export declare function formatWorkflowTail(tail: WorkflowTail): string;
export declare function formatWorkflowReport(report: WorkflowReport): string;
export declare function formatNamedWorkflowList(workflows: NamedWorkflowSummary[]): string;
export declare function formatNamedWorkflowDescription(workflow: NamedWorkflowSummary, readme?: string): string;
export declare function formatNamedWorkflowConfirmation(options: {
    workflow: NamedWorkflowSummary;
    intent: string;
    reason: string;
    nextCommand: string;
}): string;
export declare function formatDynamicDispatchConfirmation(options: {
    plan: Extract<DynamicWorkflowPlan, {
        recommendedAction: "review_dynamic";
    }>;
    planFile: string;
    nextCommand: string;
}): string;
export declare function formatDynamicWorkflowPlan(plan: DynamicWorkflowPlan): string;
export declare function formatNamedWorkflowRecommendation(options: {
    workflow: NamedWorkflowSummary;
    reason: string;
    nextCommand: string;
}): string;
export declare function formatWorkflowStageAction(result: WorkflowStageActionResult): string;
export declare function formatRunList(runs: RunSummary[]): string;
export declare function formatRunArtifact(artifact: RunArtifact): string;
export declare function formatPruneRuns(result: PruneRunsResult): string;
export declare function main(argv?: string[]): Promise<void>;
export {};
