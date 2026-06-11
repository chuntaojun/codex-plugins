import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function defaultPluginRoot(): string {
  return path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
}

export function defaultRegistryDir(): string {
  return path.join(defaultPluginRoot(), "skills/ultracode/workflows");
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function isPlainObject(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function readNestedString(value: JsonRecord, keys: string[]): string {
  let current: unknown = value;
  for (const key of keys) {
    if (!isPlainObject(current)) {
      return "";
    }
    current = current[key];
  }
  return typeof current === "string" ? current : "";
}

function stagePreviewFromWorkflow(workflow: {
  stages?: unknown;
}): NamedWorkflowStagePreview[] {
  if (!Array.isArray(workflow.stages)) {
    return [];
  }

  return workflow.stages
    .filter((stage): stage is JsonRecord => isPlainObject(stage))
    .map((stage, index) => {
      const name = typeof stage.name === "string" && stage.name.trim()
        ? stage.name
        : `stage-${index + 1}`;
      const agent = isPlainObject(stage.agent) ? stage.agent : {};
      const mode = agent.mode === "write" ? "write" : "read-only";
      return {
        name,
        mode,
        outputFile: readNestedString(stage, ["output", "file"]),
        dependsOn: stringArray(stage.dependsOn),
      };
    });
}

function deepMerge(base: JsonValue, override: JsonValue): JsonValue {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override;
  }

  const merged: JsonRecord = { ...base };
  for (const [key, value] of Object.entries(override)) {
    merged[key] =
      key in merged ? deepMerge(merged[key] as JsonValue, value as JsonValue) : (value as JsonValue);
  }
  return merged;
}

function hasEntries(value: object | undefined): boolean {
  return value !== undefined && Object.keys(value).length > 0;
}

function cleanExecution(
  execution: NamedWorkflowApprovalExecutionContext | undefined,
): NamedWorkflowApprovalExecutionContext | undefined {
  if (!execution) {
    return undefined;
  }
  const cleaned: NamedWorkflowApprovalExecutionContext = {};
  if (execution.outputDir !== undefined) {
    cleaned.outputDir = execution.outputDir;
  }
  if (execution.runId !== undefined) {
    cleaned.runId = execution.runId;
  }
  if (execution.worktreeDir !== undefined) {
    cleaned.worktreeDir = execution.worktreeDir;
  }
  return hasEntries(cleaned) ? cleaned : undefined;
}

function workflowSummaryFromDir(workflowDir: string): NamedWorkflowSummary | null {
  const workflowFile = path.join(workflowDir, "workflow.json");
  const paramTemplateFile = path.join(workflowDir, "param.template.json");
  if (!fs.existsSync(workflowFile) || !fs.existsSync(paramTemplateFile)) {
    return null;
  }

  const workflow = readJsonFile<{
    name?: string;
    description?: string;
    keywords?: unknown;
    stages?: unknown;
  }>(workflowFile);
  const name = workflow.name || path.basename(workflowDir);
  const readmeFile = path.join(workflowDir, "README.md");
  const keywords = Array.isArray(workflow.keywords)
    ? workflow.keywords.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()))
    : undefined;
  const stagePlan = stagePreviewFromWorkflow(workflow);
  return {
    name,
    description: workflow.description,
    keywords,
    stagePlan,
    writeStages: stagePlan.filter((stage) => stage.mode === "write").map((stage) => stage.name),
    outputFiles: stagePlan.map((stage) => stage.outputFile).filter(Boolean),
    workflowFile,
    paramTemplateFile,
    readmeFile: fs.existsSync(readmeFile) ? readmeFile : undefined,
  };
}

export function listNamedWorkflows(
  options: ResolveNamedWorkflowOptions = {},
): NamedWorkflowSummary[] {
  const registryDir = options.registryDir ?? defaultRegistryDir();
  if (!fs.existsSync(registryDir)) {
    return [];
  }

  return fs
    .readdirSync(registryDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => workflowSummaryFromDir(path.join(registryDir, entry.name)))
    .filter((entry): entry is NamedWorkflowSummary => entry !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function resolveNamedWorkflow(
  workflowName: string,
  options: ResolveNamedWorkflowOptions = {},
): NamedWorkflowSummary {
  const workflows = listNamedWorkflows(options);
  const workflow = workflows.find((entry) => entry.name === workflowName);
  if (!workflow) {
    const names = workflows.map((entry) => entry.name).join(", ") || "<none>";
    throw new Error(`Unknown Ultracode workflow "${workflowName}". Available workflows: ${names}`);
  }
  return workflow;
}

export function readWorkflowReadme(workflow: NamedWorkflowSummary): string | undefined {
  if (!workflow.readmeFile || !fs.existsSync(workflow.readmeFile)) {
    return undefined;
  }
  return fs.readFileSync(workflow.readmeFile, "utf8");
}

export function createParamFileFromTemplate(options: CreateParamFileOptions): CreatedParamFile {
  const template = readJsonFile<JsonRecord>(options.templateFile);
  const userParams = options.params ?? {};
  const merged = deepMerge(template, userParams) as JsonRecord;
  if (options.intent?.trim()) {
    merged.intent = options.intent;
    merged.goal = options.intent;
  }

  const paramFile = path.join(options.outputDir, "param.generated.json");
  fs.mkdirSync(path.dirname(paramFile), { recursive: true });
  fs.writeFileSync(paramFile, `${JSON.stringify(merged, null, 2)}\n`);
  return { paramFile, params: merged };
}

export function writeApprovedNamedWorkflowFile(options: {
  outputDir: string;
  workflowName: string;
  workflowFile: string;
  paramFile: string;
  intent?: string;
  params?: JsonRecord;
  execution?: NamedWorkflowApprovalExecutionContext;
  createdAt?: string;
}): ApprovedNamedWorkflowFile {
  const approvedNamedWorkflowFile = path.join(options.outputDir, "approved-named-workflow.json");
  const execution = cleanExecution(options.execution);
  const payload = {
    workflowName: options.workflowName,
    workflowFile: options.workflowFile,
    paramFile: options.paramFile,
    ...(options.intent?.trim() ? { intent: options.intent } : {}),
    createdAt: options.createdAt ?? new Date().toISOString(),
    ...(hasEntries(options.params) ? { params: options.params } : {}),
    ...(execution ? { execution } : {}),
  };
  fs.mkdirSync(options.outputDir, { recursive: true });
  fs.writeFileSync(approvedNamedWorkflowFile, `${JSON.stringify(payload, null, 2)}\n`);
  return {
    approvedNamedWorkflowFile,
    ...payload,
  };
}
