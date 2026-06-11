import type { AgentRunner } from "./core/codex.js";
import { type WorkflowStatus } from "./core/inspector.js";
import { type JsonValue, type StageResult } from "./core/stage.js";
type JsonRecord = Record<string, JsonValue>;
export type WorkflowStageActionOptions = {
    outputDir: string;
    stageName: string;
    cascade?: boolean;
    repoRoot?: string;
    runAgent?: AgentRunner;
};
export type WorkflowStageReworkOptions = WorkflowStageActionOptions & {
    feedback: JsonRecord;
};
export type WorkflowStageActionResult = {
    workflow: string;
    outputDir: string;
    stage: StageResult & {
        input?: JsonRecord;
    };
    cascadedStages: Array<StageResult & {
        input?: JsonRecord;
    }>;
    status: WorkflowStatus;
};
export declare function restartWorkflowStage(options: WorkflowStageActionOptions): Promise<WorkflowStageActionResult>;
export declare function reworkWorkflowStage(options: WorkflowStageReworkOptions): Promise<WorkflowStageActionResult>;
export {};
