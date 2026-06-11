import fs from "node:fs";
import path from "node:path";

import type { AgentRunner } from "./core/codex.js";
import {
  writeWorkflowStatus,
  writeWorkflowStatusSnapshot,
  type WorkflowStatus,
} from "./core/inspector.js";
import {
  runAgentStage,
  type AgentStageDefinition,
  type JsonValue,
  type StageResult,
} from "./core/stage.js";
import { createWorkflowContext } from "./core/workflow.js";
import type { WorkflowMode } from "./core/schema.js";
import { orderStagesByDependencies } from "./workflow-deps.js";

type JsonRecord = Record<string, JsonValue>;

type JsonWorkflowStage = {
  name: string;
  type: "codex";
  dependsOn?: string[];
  input?: JsonRecord;
  prompt?: string | string[];
  promptFile?: string;
  output: {
    file: string;
    schema?: string;
  };
  gate?: AgentStageDefinition["gate"];
  agent?: {
    label?: string;
    mode?: WorkflowMode;
    outputSchema?: string;
  };
};

type JsonWorkflow = {
  name: string;
  stages: JsonWorkflowStage[];
};

export type JsonWorkflowStageRun = StageResult & {
  input: JsonRecord;
};

export type JsonWorkflowRunResult = {
  workflow: string;
  status: "completed";
  outputDir: string;
  stages: JsonWorkflowStageRun[];
};

export type RunJsonWorkflowOptions = {
  repoRoot: string;
  workflowFile: string;
  paramFile: string;
  outputDir: string;
  runAgent?: AgentRunner;
};

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJsonFile(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function resolvePath(value: string, context: Record<string, unknown>): unknown {
  return value.split(".").reduce<unknown>((current, segment) => {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }
    return (current as Record<string, unknown>)[segment];
  }, context);
}

function renderString(value: string, context: Record<string, unknown>): JsonValue {
  const exact = value.match(/^\$\{([^}]+)\}$/);
  if (exact) {
    const resolved = resolvePath(exact[1], context);
    return resolved === undefined ? value : (resolved as JsonValue);
  }

  return value.replace(/\$\{([^}]+)\}/g, (_match, expression: string) => {
    const resolved = resolvePath(expression, context);
    return resolved === undefined ? _match : String(resolved);
  });
}

function renderValue(value: JsonValue, context: Record<string, unknown>): JsonValue {
  if (typeof value === "string") {
    return renderString(value, context);
  }
  if (Array.isArray(value)) {
    return value.map((item) => renderValue(item, context));
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, renderValue(item, context)]),
    );
  }
  return value;
}

function renderPrompt(
  stage: JsonWorkflowStage,
  workflowDir: string,
  context: Record<string, unknown>,
): string | string[] {
  if (stage.promptFile) {
    const promptPath = path.resolve(workflowDir, stage.promptFile);
    return renderString(fs.readFileSync(promptPath, "utf8"), context) as string;
  }
  if (!stage.prompt) {
    throw new Error(`Stage ${stage.name} must define prompt or promptFile`);
  }
  if (Array.isArray(stage.prompt)) {
    return stage.prompt.map((line) => renderString(line, context) as string);
  }
  return renderString(stage.prompt, context) as string;
}

export async function runJsonWorkflow(
  options: RunJsonWorkflowOptions,
): Promise<JsonWorkflowRunResult> {
  const workflowPath = path.resolve(options.repoRoot, options.workflowFile);
  const paramPath = path.resolve(options.repoRoot, options.paramFile);
  const workflow = readJsonFile<JsonWorkflow>(workflowPath);
  const params = readJsonFile<Record<string, JsonValue>>(paramPath);
  const outputDir = path.resolve(options.repoRoot, options.outputDir);
  const workflowDir = path.dirname(workflowPath);
  const orderedStages = orderStagesByDependencies(workflow.stages);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.copyFileSync(workflowPath, path.join(outputDir, "workflow.json"));
  fs.copyFileSync(paramPath, path.join(outputDir, "param.json"));

  const ctx = createWorkflowContext({
    repoRoot: options.repoRoot,
    workflow: workflow.name,
    goal: typeof params.goal === "string" ? params.goal : workflow.name,
    target: typeof params.target === "string" ? params.target : undefined,
    mode: params.mode === "write" ? "write" : "read-only",
    outputDir,
  });

  const stages: JsonWorkflowStageRun[] = [];
  const stageContext: Record<string, unknown> = {};
  const stageStatuses: WorkflowStatus["stages"] = orderedStages.map((stage, index) => ({
    index: index + 1,
    name: stage.name,
    status: "pending",
  }));
  const failedGates: WorkflowStatus["failedGates"] = [];
  const writeLiveStatus = (status: WorkflowStatus["status"]) => {
    const effectiveStatus = stageStatuses.some((stage) => stage.status === "failed")
      ? "failed"
      : status;
    writeWorkflowStatusSnapshot(outputDir, {
      workflow: workflow.name,
      status: effectiveStatus,
      outputDir,
      stages: stageStatuses,
      currentStage:
        stageStatuses.find((stage) => stage.status === "running") ??
        [...stageStatuses].reverse().find((stage) => stage.status === "failed") ??
        stageStatuses.find((stage) => stage.status === "pending") ??
        stageStatuses.at(-1),
      failedGates,
    });
  };
  writeLiveStatus("running");

  for (const [index, stage] of orderedStages.entries()) {
    if (stage.type !== "codex") {
      throw new Error(`Unsupported stage type: ${stage.type}`);
    }
    const context = {
      params,
      stages: stageContext,
    };
    const input = (stage.input
      ? renderValue(stage.input, context)
      : {}) as JsonRecord;
    const renderedStage: AgentStageDefinition = {
      index: index + 1,
      name: stage.name,
      input,
      prompt: renderPrompt(stage, workflowDir, context),
      agent: {
        label: stage.agent?.label ?? stage.name,
        mode: stage.agent?.mode ?? ctx.mode,
        outputFile: stage.output.file,
        outputSchema: stage.agent?.outputSchema ?? stage.output.schema,
      },
      gate: stage.gate,
    };

    stageStatuses[index] = {
      ...stageStatuses[index],
      status: "running",
    };
    writeLiveStatus("running");
    const result = await runAgentStage({
      ctx,
      stage: renderedStage,
      runAgent: options.runAgent,
    });
    const stageRun = {
      ...result,
      input,
    };
    stages.push(stageRun);
    stageStatuses[index] = {
      ...stageStatuses[index],
      status: result.status,
      attempt: result.attempt,
      sessionId: result.sessionId,
      outputFile: result.outputFile,
      resultFile: result.resultFile,
    };
    if (result.gate?.status === "failed") {
      for (const command of result.gate.commands.filter((item) => item.exitCode !== 0)) {
        failedGates.push({
          stage: result.stage,
          command: command.command,
          exitCode: command.exitCode,
        });
      }
    }
    writeLiveStatus(result.status === "failed" ? "failed" : "running");
    stageContext[stage.name] = {
      latest: result,
    };
  }

  const result: JsonWorkflowRunResult = {
    workflow: workflow.name,
    status: "completed",
    outputDir,
    stages,
  };
  writeJsonFile(path.join(outputDir, "workflow-result.json"), result);
  writeWorkflowStatus(outputDir);
  return result;
}
