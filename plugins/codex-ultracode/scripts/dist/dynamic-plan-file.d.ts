import type { JsonValue } from "./core/stage.js";
import type { DynamicWorkflowPlan } from "./dynamic-planner.js";
type JsonRecord = Record<string, JsonValue>;
export type DynamicPlanExecutionContext = {
    outputDir?: string;
    runId?: string;
    worktreeDir?: string;
};
export type DynamicPlanFile = {
    intent: string;
    createdAt: string;
    params?: JsonRecord;
    execution?: DynamicPlanExecutionContext;
    plan: DynamicWorkflowPlan;
};
export type WriteDynamicPlanFileOptions = {
    planFile: string;
    intent: string;
    plan: DynamicWorkflowPlan;
    params?: JsonRecord;
    execution?: DynamicPlanExecutionContext;
    createdAt?: string;
};
export type WrittenDynamicPlanFile = DynamicPlanFile & {
    planFile: string;
};
export type ApprovedDynamicPlanFile = WrittenDynamicPlanFile & {
    approvedPlanFile: string;
};
export type DynamicRunExecutionContextInput = {
    outputDir?: string;
    runId?: string;
    worktreeDir?: string;
};
export type DynamicRunExecutionContext = {
    outputDir: string;
    runId: string;
    worktreeDir?: string;
};
export declare function writeDynamicPlanFile(options: WriteDynamicPlanFileOptions): WrittenDynamicPlanFile;
export declare function readDynamicPlanFile(planFile: string): WrittenDynamicPlanFile;
export declare function resolveDynamicRunExecutionContext(options: {
    input: DynamicRunExecutionContextInput;
    planFile?: WrittenDynamicPlanFile;
    defaultRunId: string;
}): DynamicRunExecutionContext;
export declare function resolveDynamicRunParams(options: {
    inputParams?: JsonRecord;
    planFile?: WrittenDynamicPlanFile;
}): JsonRecord;
export declare function copyApprovedDynamicPlanFile(options: {
    planFile: string;
    outputDir: string;
    params?: JsonRecord;
    execution?: DynamicPlanExecutionContext;
}): ApprovedDynamicPlanFile;
export {};
