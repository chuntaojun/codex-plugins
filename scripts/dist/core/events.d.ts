export type WorkflowEvent = {
    type: string;
    [key: string]: unknown;
};
export declare function configureTraceOutput(filePath: string, options?: {
    append?: boolean;
    silent?: boolean;
}): void;
export declare function appendTrace(event: WorkflowEvent): void;
export declare function emitEvent(event: WorkflowEvent): void;
