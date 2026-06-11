import type { WorkflowMode } from "./schema.js";
export type AgentOptions = {
    label: string;
    prompt: string;
    cwd: string;
    mode: WorkflowMode;
    outputSchema?: string;
    outputFile: string;
    eventFile?: string;
    stdoutFile?: string;
    stderrFile?: string;
    sessionFile?: string;
};
export type AgentRunResult = string | {
    outputFile: string;
    sessionId?: string;
};
export type AgentRunner = (options: AgentOptions) => Promise<AgentRunResult>;
export type CodexJsonlState = {
    buffer: string;
    sessionId?: string;
};
export declare function createCodexJsonlState(): CodexJsonlState;
export declare function extractSessionId(event: unknown): string | undefined;
export declare function consumeCodexJsonChunk(state: CodexJsonlState, data: string, onJsonLine: (line: string) => void): void;
export declare function flushCodexJsonBuffer(state: CodexJsonlState, onJsonLine: (line: string) => void): void;
export declare function buildCodexArgs(options: AgentOptions): string[];
export declare const agent: AgentRunner;
