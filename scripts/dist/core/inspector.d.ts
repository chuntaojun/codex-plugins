export type WorkflowStageStatus = {
    index: number;
    name: string;
    status: "passed" | "failed" | "running" | "pending";
    attempt?: number;
    sessionId?: string;
    outputFile?: string;
    resultFile?: string;
};
export type WorkflowGateFailure = {
    stage: string;
    command: string;
    exitCode: number;
};
export type WorkflowStatus = {
    workflow: string;
    status: "completed" | "failed" | "running" | "unknown";
    outputDir: string;
    stages: WorkflowStageStatus[];
    currentStage?: WorkflowStageStatus;
    failedGates: WorkflowGateFailure[];
};
export type WorkflowTail = {
    outputDir: string;
    traceFile: string;
    events: Array<Record<string, unknown>>;
};
export type WorkflowReport = WorkflowStatus & {
    finalStage?: WorkflowStageStatus;
    finalArtifact?: {
        file: string;
        text: string;
    };
    summary: string;
};
export declare function inspectWorkflowStatus(outputDir: string): WorkflowStatus;
export declare function inspectWorkflowTail(outputDir: string, options?: {
    limit?: number;
}): WorkflowTail;
export declare function inspectWorkflowReport(outputDir: string): WorkflowReport;
export declare function writeWorkflowStatus(outputDir: string): WorkflowStatus;
export declare function writeWorkflowStatusSnapshot(outputDir: string, status: WorkflowStatus): WorkflowStatus;
