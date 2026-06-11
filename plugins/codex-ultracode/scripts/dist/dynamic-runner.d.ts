import type { JsonValue } from "./core/stage.js";
import type { DynamicWorkflow } from "./dynamic-planner.js";
type JsonRecord = Record<string, JsonValue>;
export type DynamicWorkflowValidation = {
    valid: boolean;
    errors: string[];
};
export type CreateDynamicWorkflowFilesOptions = {
    outputDir: string;
    intent: string;
    workflow: DynamicWorkflow;
    params?: JsonRecord;
};
export type CreatedDynamicWorkflowFiles = {
    workflowFile: string;
    paramFile: string;
    validation: DynamicWorkflowValidation;
};
export declare function validateDynamicWorkflow(workflow: unknown): DynamicWorkflowValidation;
export declare function createDynamicWorkflowFiles(options: CreateDynamicWorkflowFilesOptions): CreatedDynamicWorkflowFiles;
export {};
