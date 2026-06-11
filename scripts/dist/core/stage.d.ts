import { type AgentRunner } from "./codex.js";
import type { WorkflowContext, WorkflowMode } from "./schema.js";
export type JsonValue = string | number | boolean | null | JsonValue[] | {
    [key: string]: JsonValue;
};
export type CommandGate = {
    type: "command";
    commands: string[];
};
export type CommandGateResult = {
    type: "command";
    status: "passed" | "failed";
    commands: Array<{
        command: string;
        exitCode: number;
        stdout: string;
        stderr: string;
    }>;
};
export type AgentStageDefinition = {
    index: number;
    name: string;
    input: Record<string, JsonValue>;
    prompt: string | string[];
    agent: {
        label: string;
        mode?: WorkflowMode;
        outputFile: string;
        outputSchema?: string;
    };
    gate?: CommandGate;
};
export type StageResult = {
    stage: string;
    status: "passed" | "failed";
    attempt: number;
    stageDir: string;
    attemptDir: string;
    inputFile: string;
    promptFile: string;
    outputFile: string;
    resultFile: string;
    eventFile?: string;
    stdoutFile?: string;
    stderrFile?: string;
    sessionFile?: string;
    sessionId?: string;
    gate?: CommandGateResult;
};
export type RunCommand = (command: string, options: {
    cwd: string;
}) => Promise<{
    command: string;
    exitCode: number;
    stdout: string;
    stderr: string;
}>;
export type RunAgentStageOptions = {
    ctx: WorkflowContext;
    stage: AgentStageDefinition;
    runAgent?: AgentRunner;
    runCommand?: RunCommand;
    attempt?: number;
    inputOverride?: Record<string, JsonValue>;
};
export type RestartStageOptions = RunAgentStageOptions & {
    previousResult: StageResult;
};
export type ReworkStageOptions = RunAgentStageOptions & {
    previousResult: StageResult;
    feedback: Record<string, JsonValue>;
};
export declare function resolveStageDir(outputDir: string, stage: AgentStageDefinition): string;
export declare function loadLatestStageResult(outputDir: string, stage: AgentStageDefinition): StageResult;
export declare function resolveAttemptPaths(outputDir: string, stage: AgentStageDefinition, attempt: number): {
    stageDir: string;
    attemptDir: string;
    inputFile: string;
    promptFile: string;
    outputFile: string;
    resultFile: string;
};
export declare const runShellCommand: RunCommand;
export declare function runCommandGate(options: {
    gate: CommandGate;
    cwd: string;
    attemptDir: string;
    runCommand?: RunCommand;
}): Promise<CommandGateResult>;
export declare function runAgentStage(options: RunAgentStageOptions): Promise<StageResult>;
export declare function restartStage(options: RestartStageOptions): Promise<StageResult>;
export declare function reworkStage(options: ReworkStageOptions): Promise<StageResult>;
