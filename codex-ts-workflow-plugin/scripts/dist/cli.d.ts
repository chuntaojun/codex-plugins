import { type WorkflowReport, type WorkflowStatus, type WorkflowTail } from "./core/inspector.js";
export type CliInput = {
    command: "run-json";
    workflowFile: string;
    paramFile: string;
    outputDir: string;
    runId: string;
    worktreeDir?: string;
} | {
    command: "status" | "report" | "watch";
    outputDir: string;
    json: boolean;
} | {
    command: "tail";
    outputDir: string;
    limit: number;
    json: boolean;
};
export declare function parseCliArgs(argv: string[]): CliInput;
export declare function formatWorkflowStatus(status: WorkflowStatus): string;
export declare function formatWorkflowTail(tail: WorkflowTail): string;
export declare function formatWorkflowReport(report: WorkflowReport): string;
export declare function main(argv?: string[]): Promise<void>;
