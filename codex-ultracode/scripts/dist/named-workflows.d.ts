import type { JsonValue } from "./core/stage.js";
type JsonRecord = Record<string, JsonValue>;
export type NamedWorkflowSummary = {
    name: string;
    description?: string;
    keywords?: string[];
    stagePlan: NamedWorkflowStagePreview[];
    writeStages: string[];
    outputFiles: string[];
    workflowFile: string;
    paramTemplateFile: string;
    readmeFile?: string;
};
export type NamedWorkflowStagePreview = {
    name: string;
    mode: "read-only" | "write";
    outputFile: string;
    dependsOn: string[];
};
export type ResolveNamedWorkflowOptions = {
    registryDir?: string;
};
export type CreateParamFileOptions = {
    templateFile: string;
    outputDir: string;
    workflowName: string;
    intent?: string;
    params?: JsonRecord;
};
export type CreatedParamFile = {
    paramFile: string;
    params: JsonRecord;
};
export type NamedWorkflowApprovalExecutionContext = {
    outputDir?: string;
    runId?: string;
    worktreeDir?: string;
};
export type ApprovedNamedWorkflowFile = {
    approvedNamedWorkflowFile: string;
    workflowName: string;
    workflowFile: string;
    paramFile: string;
    intent?: string;
    createdAt: string;
    params?: JsonRecord;
    execution?: NamedWorkflowApprovalExecutionContext;
};
export declare function defaultRegistryDir(): string;
export declare function listNamedWorkflows(options?: ResolveNamedWorkflowOptions): NamedWorkflowSummary[];
export declare function resolveNamedWorkflow(workflowName: string, options?: ResolveNamedWorkflowOptions): NamedWorkflowSummary;
export declare function readWorkflowReadme(workflow: NamedWorkflowSummary): string | undefined;
export declare function createParamFileFromTemplate(options: CreateParamFileOptions): CreatedParamFile;
export declare function writeApprovedNamedWorkflowFile(options: {
    outputDir: string;
    workflowName: string;
    workflowFile: string;
    paramFile: string;
    intent?: string;
    params?: JsonRecord;
    execution?: NamedWorkflowApprovalExecutionContext;
    createdAt?: string;
}): ApprovedNamedWorkflowFile;
export {};
