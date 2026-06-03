import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { agent, type AgentOptions, type AgentRunner } from "./codex.js";
import { emitEvent } from "./events.js";
import type { WorkflowContext, WorkflowMode } from "./schema.js";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

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

export type RunCommand = (
  command: string,
  options: { cwd: string },
) => Promise<{
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

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function stageFolderName(stage: AgentStageDefinition): string {
  return `${String(stage.index).padStart(3, "0")}-${slugify(stage.name)}`;
}

function attemptFolderName(attempt: number): string {
  return String(attempt).padStart(3, "0");
}

function renderPrompt(prompt: string | string[]): string {
  return Array.isArray(prompt) ? prompt.join("\n") : prompt;
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function resolveStageDir(
  outputDir: string,
  stage: AgentStageDefinition,
): string {
  return path.join(outputDir, "stages", stageFolderName(stage));
}

export function loadLatestStageResult(
  outputDir: string,
  stage: AgentStageDefinition,
): StageResult {
  const resultFile = path.join(resolveStageDir(outputDir, stage), "latest-result.json");
  if (!fs.existsSync(resultFile)) {
    throw new Error(`No latest result found for stage ${stage.name}`);
  }
  return JSON.parse(fs.readFileSync(resultFile, "utf8")) as StageResult;
}

export function resolveAttemptPaths(
  outputDir: string,
  stage: AgentStageDefinition,
  attempt: number,
): {
  stageDir: string;
  attemptDir: string;
  inputFile: string;
  promptFile: string;
  outputFile: string;
  resultFile: string;
} {
  const stageDir = resolveStageDir(outputDir, stage);
  const attemptDir = path.join(stageDir, "attempts", attemptFolderName(attempt));
  return {
    stageDir,
    attemptDir,
    inputFile: path.join(attemptDir, "input.json"),
    promptFile: path.join(attemptDir, "prompt.md"),
    outputFile: path.join(attemptDir, stage.agent.outputFile),
    resultFile: path.join(attemptDir, "result.json"),
  };
}

export const runShellCommand: RunCommand = (command, options) =>
  new Promise((resolve) => {
    const child = spawn(command, {
      cwd: options.cwd,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (buf: Buffer) => {
      stdout += buf.toString();
    });
    child.stderr.on("data", (buf: Buffer) => {
      stderr += buf.toString();
    });
    child.on("error", (error) => {
      resolve({
        command,
        exitCode: 1,
        stdout,
        stderr: stderr + error.message,
      });
    });
    child.on("close", (code) => {
      resolve({
        command,
        exitCode: code ?? 1,
        stdout,
        stderr,
      });
    });
  });

export async function runCommandGate(options: {
  gate: CommandGate;
  cwd: string;
  attemptDir: string;
  runCommand?: RunCommand;
}): Promise<CommandGateResult> {
  const execute = options.runCommand ?? runShellCommand;
  const commands = [];

  for (const command of options.gate.commands) {
    emitEvent({ type: "gate.command.started", command });
    const result = await execute(command, { cwd: options.cwd });
    emitEvent({
      type: "gate.command.completed",
      command,
      exitCode: result.exitCode,
    });
    commands.push(result);
    if (result.exitCode !== 0) {
      break;
    }
  }

  const gateResult: CommandGateResult = {
    type: "command",
    status: commands.every((command) => command.exitCode === 0)
      ? "passed"
      : "failed",
    commands,
  };
  writeJson(path.join(options.attemptDir, "gate-result.json"), gateResult);
  return gateResult;
}

export async function runAgentStage(
  options: RunAgentStageOptions,
): Promise<StageResult> {
  const runAgent = options.runAgent ?? agent;
  const attempt = options.attempt ?? 1;
  const input = options.inputOverride ?? options.stage.input;
  const paths = resolveAttemptPaths(options.ctx.outputDir, options.stage, attempt);
  const eventFile = path.join(paths.attemptDir, "codex-events.jsonl");
  const stdoutFile = path.join(paths.attemptDir, "codex-stdout.log");
  const stderrFile = path.join(paths.attemptDir, "codex-stderr.log");
  const sessionFile = path.join(paths.attemptDir, "session.json");
  fs.mkdirSync(paths.attemptDir, { recursive: true });

  writeJson(path.join(paths.attemptDir, "stage.json"), options.stage);
  writeJson(paths.inputFile, input);
  fs.writeFileSync(paths.promptFile, renderPrompt(options.stage.prompt));

  emitEvent({
    type: "stage.started",
    stage: options.stage.name,
    attempt,
    attemptDir: paths.attemptDir,
  });

  const agentOptions: AgentOptions = {
    label: options.stage.agent.label,
    cwd: options.ctx.repoRoot,
    mode: options.stage.agent.mode ?? options.ctx.mode,
    outputSchema: options.stage.agent.outputSchema,
    outputFile: paths.outputFile,
    eventFile,
    stdoutFile,
    stderrFile,
    sessionFile,
    prompt: [
      "<stage-input>",
      JSON.stringify(input, null, 2),
      "</stage-input>",
      "",
      "<stage-prompt>",
      renderPrompt(options.stage.prompt),
      "</stage-prompt>",
    ].join("\n"),
  };

  const agentResult = await runAgent(agentOptions);
  const outputFile =
    typeof agentResult === "string" ? agentResult : agentResult.outputFile;
  const sessionId =
    typeof agentResult === "string" ? undefined : agentResult.sessionId;

  const gate = options.stage.gate
    ? await runCommandGate({
        gate: options.stage.gate,
        cwd: options.ctx.repoRoot,
        attemptDir: paths.attemptDir,
        runCommand: options.runCommand,
      })
    : undefined;

  const result: StageResult = {
    stage: options.stage.name,
    status: gate?.status === "failed" ? "failed" : "passed",
    attempt,
    ...paths,
    outputFile,
    eventFile,
    stdoutFile,
    stderrFile,
    sessionFile,
    sessionId,
    gate,
  };
  writeJson(paths.resultFile, result);
  writeJson(path.join(paths.stageDir, "latest-result.json"), result);

  emitEvent({
    type: "stage.completed",
    stage: options.stage.name,
    attempt,
    status: result.status,
  });

  return result;
}

export async function restartStage(
  options: RestartStageOptions,
): Promise<StageResult> {
  const input = JSON.parse(fs.readFileSync(options.previousResult.inputFile, "utf8")) as Record<
    string,
    JsonValue
  >;

  return runAgentStage({
    ...options,
    attempt: options.previousResult.attempt + 1,
    inputOverride: input,
  });
}

export async function reworkStage(
  options: ReworkStageOptions,
): Promise<StageResult> {
  const previousInput = JSON.parse(
    fs.readFileSync(options.previousResult.inputFile, "utf8"),
  ) as Record<string, JsonValue>;
  const nextInput: Record<string, JsonValue> = {
    ...previousInput,
    rework: {
      feedback: options.feedback,
      previousAttempt: {
        attempt: options.previousResult.attempt,
        outputFile: options.previousResult.outputFile,
        resultFile: options.previousResult.resultFile,
      },
    },
  };

  return runAgentStage({
    ...options,
    attempt: options.previousResult.attempt + 1,
    inputOverride: nextInput,
  });
}
