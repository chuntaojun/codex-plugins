import path from "node:path";

import { configureTraceOutput, emitEvent } from "./core/events.js";
import { prepareRunWorktree, type PreparedRunWorktree } from "./core/git-worktree.js";
import {
  inspectWorkflowReport,
  inspectWorkflowStatus,
  inspectWorkflowTail,
  type WorkflowReport,
  type WorkflowStatus,
  type WorkflowTail,
} from "./core/inspector.js";
import type { JsonValue } from "./core/stage.js";
import {
  planDynamicWorkflow,
  type DynamicWorkflow,
  type DynamicWorkflowPlan,
} from "./dynamic-planner.js";
import {
  copyApprovedDynamicPlanFile,
  readDynamicPlanFile,
  resolveDynamicRunExecutionContext,
  resolveDynamicRunParams,
  writeDynamicPlanFile,
  type WrittenDynamicPlanFile,
} from "./dynamic-plan-file.js";
import { createDynamicWorkflowFiles } from "./dynamic-runner.js";
import { runJsonWorkflow, type JsonWorkflowRunResult } from "./json-runner.js";
import {
  createParamFileFromTemplate,
  listNamedWorkflows,
  readWorkflowReadme,
  resolveNamedWorkflow,
  writeApprovedNamedWorkflowFile,
  type ApprovedNamedWorkflowFile,
  type NamedWorkflowSummary,
} from "./named-workflows.js";
import {
  restartWorkflowStage,
  reworkWorkflowStage,
  type WorkflowStageActionResult,
} from "./workflow-actions.js";
import {
  getRunArtifact,
  listRuns,
  pruneRuns,
  resolveRunOutputDir,
  type PruneRunsResult,
  type RunArtifact,
  type RunSummary,
} from "./run-registry.js";

type JsonRecord = Record<string, JsonValue>;

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function slugifyPlanIntent(intent: string): string {
  return (
    intent
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "dynamic-workflow"
  );
}

function defaultDispatchPlanPath(intent: string): string {
  return path.join(".ultracode", "plans", `${slugifyPlanIntent(intent)}-${timestamp()}.plan.json`);
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:=@+-]+$/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, "'\"'\"'")}'`;
}

export type RunFollowUpEvent = {
  type: "workflow.next_actions";
  runId: string;
  commands: {
    report: string;
    status: string;
    tail: string;
    restartStage: string;
    reworkStage: string;
  };
};

export function buildRunFollowUpEvent(runId: string): RunFollowUpEvent {
  const target = shellQuote(runId);
  return {
    type: "workflow.next_actions",
    runId,
    commands: {
      report: `ultracode report ${target}`,
      status: `ultracode status ${target}`,
      tail: `ultracode tail ${target} --limit 20`,
      restartStage: `ultracode restart-stage ${target} <stage-name>`,
      reworkStage: `ultracode rework-stage ${target} <stage-name> --feedback '<json object>'`,
    },
  };
}

function emitRunFollowUp(runId: string): void {
  emitEvent(buildRunFollowUpEvent(runId));
}

type CliRunInspection = {
  runId: string;
  outputDir: string;
  commands: RunFollowUpEvent["commands"];
  approvedNamedWorkflowFile?: string;
  approvedPlanFile?: string;
};

type CliNamedWorkflowRunPayload = {
  workflow: NamedWorkflowSummary & {
    paramFile: string;
    approvedNamedWorkflowFile?: string;
  };
  worktree: {
    root: string;
    created: boolean;
    branch?: string;
  };
  inspection: CliRunInspection;
  result: JsonWorkflowRunResult;
  followUp: RunFollowUpEvent;
  approvedNamedWorkflowFile?: string;
};

type CliDynamicWorkflowRunPayload = {
  workflow: DynamicWorkflow & {
    workflowFile: string;
    paramFile: string;
  };
  worktree: {
    root: string;
    created: boolean;
    branch?: string;
  };
  inspection: CliRunInspection;
  result: JsonWorkflowRunResult;
  followUp: RunFollowUpEvent;
  approvedPlanFile?: string;
};

function createCliRunInspection(options: {
  runId: string;
  outputDir: string;
  followUp: RunFollowUpEvent;
  approvedNamedWorkflowFile?: string;
  approvedPlanFile?: string;
}): CliRunInspection {
  return {
    runId: options.runId,
    outputDir: options.outputDir,
    commands: options.followUp.commands,
    ...(options.approvedNamedWorkflowFile
      ? { approvedNamedWorkflowFile: options.approvedNamedWorkflowFile }
      : {}),
    ...(options.approvedPlanFile ? { approvedPlanFile: options.approvedPlanFile } : {}),
  };
}

function createCliWorktreePayload(prepared: PreparedRunWorktree): CliNamedWorkflowRunPayload["worktree"] {
  return {
    root: prepared.worktreeRoot,
    created: prepared.created,
    ...(prepared.branch ? { branch: prepared.branch } : {}),
  };
}

export type CliInput =
  | {
      command: "help";
    }
  | {
      command: "run-json";
      workflowFile: string;
      paramFile: string;
      outputDir: string;
      runId: string;
      worktreeDir?: string;
      json: boolean;
    }
  | {
      command: "run-named";
      workflowName: string;
      intent?: string;
      params: JsonRecord;
      outputDir: string;
      runId: string;
      worktreeDir?: string;
      registryDir?: string;
      approved?: boolean;
      json: boolean;
    }
  | {
      command: "status" | "report" | "watch";
      outputDir: string;
      json: boolean;
    }
  | {
      command: "list-workflows";
      registryDir?: string;
      json: boolean;
    }
  | {
      command: "describe-workflow";
      workflowName: string;
      registryDir?: string;
      json: boolean;
    }
  | {
      command: "plan-dynamic";
      intent: string;
      params: JsonRecord;
      outputPlan?: string;
      outputDir?: string;
      runId?: string;
      worktreeDir?: string;
      registryDir?: string;
      json: boolean;
    }
  | {
      command: "dispatch";
      intent: string;
      params: JsonRecord;
      outputPlan?: string;
      outputDir?: string;
      runId?: string;
      worktreeDir?: string;
      registryDir?: string;
      json: boolean;
    }
  | {
      command: "run-dynamic";
      planFile: string;
      approved: boolean;
      params: JsonRecord;
      outputDir?: string;
      runId?: string;
      worktreeDir?: string;
      registryDir?: string;
      json: boolean;
    }
  | {
      command: "tail";
      outputDir: string;
      limit: number;
      json: boolean;
    }
  | {
      command: "restart-stage";
      outputDir: string;
      stageName: string;
      cascade: boolean;
      json: boolean;
    }
  | {
      command: "rework-stage";
      outputDir: string;
      stageName: string;
      feedback: JsonRecord;
      cascade: boolean;
      json: boolean;
    }
  | {
      command: "list-runs";
      limit: number;
      json: boolean;
    }
  | {
      command: "artifact";
      runId: string;
      json: boolean;
    }
  | {
      command: "prune-runs";
      runIds: string[];
      removeWorktrees: boolean;
      json: boolean;
    };

export function formatCliHelp(): string {
  return [
    "Usage:",
    '  ultracode "<task intent>"',
    '  ultracode <workflow-name> "<task intent>" [--params <json>]',
    "  ultracode run <workflow.json> <param.json>",
    "",
    "Common commands:",
    '  ultracode "Review the current implementation plan and produce a risk report"',
    '  ultracode travel-guide "Create a relaxed 3-day Kyoto guide"',
    '  ultracode dispatch --intent "<task intent>" [--params <json>]',
    '  ultracode plan-dynamic --intent "<task intent>" [--output-plan <file>]',
    "  ultracode run-dynamic --plan-file <reviewed-plan-file> --approved true",
    "  ultracode status <runId-or-outputDir>",
    "  ultracode tail <runId-or-outputDir> --limit 20",
    "  ultracode report <runId-or-outputDir>",
    "  ultracode restart-stage <runId-or-outputDir> <stageName>",
    "  ultracode rework-stage <runId-or-outputDir> <stageName> --feedback '<json object>'",
    "  ultracode list-runs",
    "  ultracode artifact <runId>",
    "  ultracode prune-runs <runId>[,<runId>] [--worktrees true]",
    "",
    "Notes:",
    "  runId, outputDir, and worktreeDir are optional advanced controls.",
    "  Use --json on supported commands when another tool needs structured output.",
    "  Write-capable named workflows require --approved true after preview approval.",
    "  Dynamic workflows require review before run-dynamic executes them.",
  ].join("\n");
}

function usageError(): Error {
  return new Error(formatCliHelp());
}

function parseOptionArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};

  for (let i = 0; i < argv.length; i += 2) {
    const rawKey = argv[i];
    const value = argv[i + 1];
    if (!rawKey?.startsWith("--") || !value) {
      throw new Error(`Invalid argument near ${rawKey ?? "<end>"}`);
    }
    args[rawKey.replace(/^--/, "")] = value;
  }

  return args;
}

function parseJsonObjectOption(options: Record<string, string>, key: string): JsonRecord {
  const parsed = options[key] ? JSON.parse(options[key]) : {};
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`--${key} must be a JSON object.`);
  }
  return parsed as JsonRecord;
}

function parseBooleanOption(
  options: Record<string, string>,
  key: string,
  defaultValue = false,
): boolean {
  const value = options[key];
  if (value === undefined) {
    return defaultValue;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error(`--${key} must be true or false.`);
}

function splitShortcutArgs(argv: string[]): {
  positionals: string[];
  options: Record<string, string>;
  json: boolean;
} {
  const optionStart = argv.findIndex((arg) => arg.startsWith("--"));
  const positionalArgs = optionStart === -1 ? argv : argv.slice(0, optionStart);
  const optionArgs = optionStart === -1 ? [] : argv.slice(optionStart);
  return {
    positionals: positionalArgs.filter(Boolean),
    options: parseOptionArgs(optionArgs.filter((arg) => arg !== "--json")),
    json: argv.includes("--json"),
  };
}

export function parseCliArgs(argv: string[]): CliInput {
  if (argv.length === 0 || argv[0] === "help" || argv[0] === "--help" || argv[0] === "-h") {
    return {
      command: "help",
    };
  }

  if (argv[0] === "dispatch") {
    const options = parseOptionArgs(argv.slice(1).filter((arg) => arg !== "--json"));
    const intent = options.intent;
    if (!intent) {
      throw usageError();
    }
    const params = parseJsonObjectOption(options, "params");
    return {
      command: "dispatch",
      intent,
      params: params as JsonRecord,
      outputPlan: options.outputPlan ?? options["output-plan"],
      outputDir: options.outputDir ?? options.output,
      runId: options.runId ?? options["run-id"],
      worktreeDir: options.worktreeDir ?? options["worktree-dir"],
      registryDir: options.registryDir ?? options["registry-dir"],
      json: argv.includes("--json"),
    };
  }

  if (argv[0] === "restart-stage") {
    const outputDir = argv[1];
    const stageName = argv[2];
    if (!outputDir || outputDir.startsWith("--") || !stageName || stageName.startsWith("--")) {
      throw usageError();
    }
    const options = parseOptionArgs(argv.slice(3).filter((arg) => arg !== "--json"));
    return {
      command: "restart-stage",
      outputDir,
      stageName,
      cascade: options.cascade === "true",
      json: argv.includes("--json"),
    };
  }

  if (argv[0] === "list-runs") {
    const options = parseOptionArgs(argv.slice(1).filter((arg) => arg !== "--json"));
    return {
      command: "list-runs",
      limit: Number(options.limit ?? 20),
      json: argv.includes("--json"),
    };
  }

  if (argv[0] === "artifact") {
    const runId = argv[1];
    if (!runId || runId.startsWith("--")) {
      throw usageError();
    }
    return {
      command: "artifact",
      runId,
      json: argv.includes("--json"),
    };
  }

  if (argv[0] === "prune-runs") {
    const runIds = argv[1];
    if (!runIds || runIds.startsWith("--")) {
      throw usageError();
    }
    const options = parseOptionArgs(argv.slice(2).filter((arg) => arg !== "--json"));
    return {
      command: "prune-runs",
      runIds: runIds.split(",").map((runId) => runId.trim()).filter(Boolean),
      removeWorktrees: parseBooleanOption(options, "worktrees"),
      json: argv.includes("--json"),
    };
  }

  if (argv[0] === "rework-stage") {
    const outputDir = argv[1];
    const stageName = argv[2];
    if (!outputDir || outputDir.startsWith("--") || !stageName || stageName.startsWith("--")) {
      throw usageError();
    }
    const options = parseOptionArgs(argv.slice(3).filter((arg) => arg !== "--json"));
    const feedback = options.feedback ? JSON.parse(options.feedback) : {};
    if (typeof feedback !== "object" || feedback === null || Array.isArray(feedback)) {
      throw new Error("--feedback must be a JSON object.");
    }
    return {
      command: "rework-stage",
      outputDir,
      stageName,
      feedback: feedback as JsonRecord,
      cascade: options.cascade === "true",
      json: argv.includes("--json"),
    };
  }

  if (argv[0] === "run-dynamic") {
    const options = parseOptionArgs(argv.slice(1).filter((arg) => arg !== "--json"));
    const planFile = options.planFile ?? options["plan-file"];
    if (!planFile) {
      throw new Error("run-dynamic requires --plan-file so execution uses a reviewed dynamic plan.");
    }
    const params = parseJsonObjectOption(options, "params");
    return {
      command: "run-dynamic",
      planFile,
      approved: options.approved === "true",
      params: params as JsonRecord,
      runId: options.runId ?? options["run-id"],
      worktreeDir: options.worktreeDir ?? options["worktree-dir"],
      registryDir: options.registryDir ?? options["registry-dir"],
      outputDir: options.outputDir ?? options.output,
      json: argv.includes("--json"),
    };
  }

  if (argv[0] === "plan-dynamic") {
    const options = parseOptionArgs(argv.slice(1).filter((arg) => arg !== "--json"));
    const intent = options.intent;
    if (!intent) {
      throw usageError();
    }
    return {
      command: "plan-dynamic",
      intent,
      params: parseJsonObjectOption(options, "params") as JsonRecord,
      outputPlan: options.outputPlan ?? options["output-plan"],
      outputDir: options.outputDir ?? options.output,
      runId: options.runId ?? options["run-id"],
      worktreeDir: options.worktreeDir ?? options["worktree-dir"],
      registryDir: options.registryDir ?? options["registry-dir"],
      json: argv.includes("--json"),
    };
  }

  if (argv[0] === "list-workflows") {
    const options = parseOptionArgs(argv.slice(1).filter((arg) => arg !== "--json"));
    return {
      command: "list-workflows",
      registryDir: options.registryDir ?? options["registry-dir"],
      json: argv.includes("--json"),
    };
  }

  if (argv[0] === "describe-workflow") {
    const workflowName = argv[1];
    if (!workflowName || workflowName.startsWith("--")) {
      throw usageError();
    }
    const options = parseOptionArgs(argv.slice(2).filter((arg) => arg !== "--json"));
    return {
      command: "describe-workflow",
      workflowName,
      registryDir: options.registryDir ?? options["registry-dir"],
      json: argv.includes("--json"),
    };
  }

  if (argv[0] === "status" || argv[0] === "report" || argv[0] === "watch") {
    const outputDir = argv[1];
    if (!outputDir || outputDir.startsWith("--")) {
      throw usageError();
    }
    const options = parseOptionArgs(argv.slice(2).filter((arg) => arg !== "--json"));
    return {
      command: argv[0],
      outputDir,
      json: options.json === "true" || argv.includes("--json"),
    };
  }

  if (argv[0] === "tail") {
    const outputDir = argv[1];
    if (!outputDir || outputDir.startsWith("--")) {
      throw usageError();
    }
    const options = parseOptionArgs(argv.slice(2).filter((arg) => arg !== "--json"));
    return {
      command: "tail",
      outputDir,
      limit: Number(options.limit ?? 20),
      json: argv.includes("--json"),
    };
  }

  if (argv[0] === "run-name") {
    const workflowName = argv[1];
    if (!workflowName || workflowName.startsWith("--")) {
      throw usageError();
    }

    const options = parseOptionArgs(argv.slice(2).filter((arg) => arg !== "--json"));
    const params = parseJsonObjectOption(options, "params");
    const runId = options.runId ?? options["run-id"] ?? `${workflowName}-${timestamp()}`;
    return {
      command: "run-named",
      workflowName,
      intent: options.intent,
      params: params as JsonRecord,
      runId,
      worktreeDir: options.worktreeDir ?? options["worktree-dir"],
      registryDir: options.registryDir ?? options["registry-dir"],
      outputDir: options.outputDir ?? options.output ?? `.ultracode/runs/${runId}`,
      approved: parseBooleanOption(options, "approved"),
      json: argv.includes("--json"),
    };
  }

  if (argv[0] !== "run") {
    if (!argv[0] || argv[0].startsWith("--")) {
      throw usageError();
    }
    const shortcut = splitShortcutArgs(argv);
    if (shortcut.positionals.length === 0) {
      throw usageError();
    }
    if (shortcut.positionals.length === 1) {
      return {
        command: "dispatch",
        intent: shortcut.positionals[0],
        params: parseJsonObjectOption(shortcut.options, "params"),
        outputPlan: shortcut.options.outputPlan ?? shortcut.options["output-plan"],
        outputDir: shortcut.options.outputDir ?? shortcut.options.output,
        runId: shortcut.options.runId ?? shortcut.options["run-id"],
        worktreeDir: shortcut.options.worktreeDir ?? shortcut.options["worktree-dir"],
        registryDir: shortcut.options.registryDir ?? shortcut.options["registry-dir"],
        json: shortcut.json,
      };
    }
    const workflowName = shortcut.positionals[0];
    const intent = shortcut.positionals.slice(1).join(" ");
    const runId = shortcut.options.runId ?? shortcut.options["run-id"] ?? `${workflowName}-${timestamp()}`;
    return {
      command: "run-named",
      workflowName,
      intent,
      params: parseJsonObjectOption(shortcut.options, "params"),
      runId,
      worktreeDir: shortcut.options.worktreeDir ?? shortcut.options["worktree-dir"],
      registryDir: shortcut.options.registryDir ?? shortcut.options["registry-dir"],
      outputDir: shortcut.options.outputDir ?? shortcut.options.output ?? `.ultracode/runs/${runId}`,
      approved: parseBooleanOption(shortcut.options, "approved"),
      json: shortcut.json,
    };
  }

  const workflowFile = argv[1];
  const paramFile = argv[2];
  if (!workflowFile || workflowFile.startsWith("--")) {
    throw usageError();
  }
  if (!paramFile || paramFile.startsWith("--")) {
    throw usageError();
  }

  const options = parseOptionArgs(argv.slice(3).filter((arg) => arg !== "--json"));
  const runId = `${path.basename(workflowFile, ".json")}-${timestamp()}`;
  return {
    command: "run-json",
    workflowFile,
    paramFile,
    runId: options.runId ?? options["run-id"] ?? runId,
    worktreeDir: options.worktreeDir ?? options["worktree-dir"],
    outputDir:
      options.outputDir ??
      options.output ??
      `.ultracode/runs/${options.runId ?? options["run-id"] ?? runId}`,
    json: argv.includes("--json"),
  };
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function formatWorkflowStatus(status: WorkflowStatus): string {
  const lines = [
    `Workflow: ${status.workflow}`,
    `Status: ${status.status}`,
    `Output: ${status.outputDir}`,
    "",
    "Stages:",
    ...status.stages.map((stage) => {
      const session = stage.sessionId ? ` session: ${stage.sessionId}` : "";
      const attempt = stage.attempt ? ` attempt: ${stage.attempt}` : "";
      return `[${stage.index}] ${stage.name.padEnd(18)} ${stage.status}${session}${attempt}`;
    }),
  ];
  if (status.failedGates.length > 0) {
    lines.push("", "Failed gates:");
    lines.push(
      ...status.failedGates.map(
        (gate) => `- ${gate.stage}: ${gate.command} exited ${gate.exitCode}`,
      ),
    );
  }
  return lines.join("\n");
}

export function formatWorkflowTail(tail: WorkflowTail): string {
  if (tail.events.length === 0) {
    return `No events found in ${tail.traceFile}`;
  }
  return tail.events.map((event) => JSON.stringify(event)).join("\n");
}

export function formatWorkflowReport(report: WorkflowReport): string {
  const lines = [report.summary];
  if (report.finalArtifact?.file) {
    lines.push("", `Final artifact: ${report.finalArtifact.file}`);
  }
  return lines.join("\n");
}

export function formatNamedWorkflowList(workflows: NamedWorkflowSummary[]): string {
  if (workflows.length === 0) {
    return "No registered Ultracode workflows found.";
  }
  return workflows
    .map((workflow) =>
      workflow.description ? `${workflow.name}: ${workflow.description}` : workflow.name,
    )
    .join("\n");
}

export function formatNamedWorkflowDescription(
  workflow: NamedWorkflowSummary,
  readme?: string,
): string {
  const lines = [
    `Workflow: ${workflow.name}`,
    workflow.description ? `Description: ${workflow.description}` : undefined,
    `Workflow file: ${workflow.workflowFile}`,
    `Param template: ${workflow.paramTemplateFile}`,
  ].filter((line): line is string => Boolean(line));
  if (readme?.trim()) {
    lines.push("", readme.trim());
  }
  return lines.join("\n");
}

function formatStagePlan(
  stagePlan: Array<{
    name: string;
    mode: "read-only" | "write";
    outputFile: string;
    dependsOn: string[];
  }>,
): string[] {
  if (stagePlan.length === 0) {
    return ["Stage plan: none"];
  }
  return [
    "Stage plan:",
    ...stagePlan.map(
      (stage) =>
        `- ${stage.name} [${stage.mode}] -> ${stage.outputFile} (depends on: ${
          stage.dependsOn.length > 0 ? stage.dependsOn.join(", ") : "none"
        })`,
    ),
  ];
}

function createCliNamedWorkflowPreview(
  workflow: NamedWorkflowSummary,
  options: { requiresConfirmation: boolean },
): Record<string, unknown> {
  const stagePlan = workflow.stagePlan ?? [];
  const writeStages = workflow.writeStages ?? [];
  const outputFiles =
    workflow.outputFiles ?? stagePlan.map((stage) => stage.outputFile).filter(Boolean);
  return {
    template: "named-workflow",
    summary: `${workflow.name} is a registered named workflow with ${stagePlan.length} stage${
      stagePlan.length === 1 ? "" : "s"
    }.`,
    description: workflow.description,
    stageCount: stagePlan.length,
    writeStages,
    outputFiles,
    stagePlan,
    risks: [
      writeStages.length > 0
        ? "Includes write-mode stages. Review the requested repository changes before approving execution."
        : "No write-mode stages were detected in the registered workflow.",
      "Registered workflow preview. Confirm the workflow name, stages, and expected outputs before execution.",
    ],
    confirmationPrompt: options.requiresConfirmation
      ? "Approve this named workflow preview before running executionAfterApproval.nextCommand."
      : "No approval is required for this read-only named workflow. Run execution.nextCommand when ready.",
  };
}

export function formatNamedWorkflowConfirmation(options: {
  workflow: NamedWorkflowSummary;
  intent: string;
  reason: string;
  nextCommand: string;
}): string {
  const writeStages = options.workflow.writeStages ?? [];
  const outputFiles = options.workflow.outputFiles ?? [];
  return [
    "Recommended action: confirm named workflow",
    `Workflow: ${options.workflow.name}`,
    options.workflow.description ? `Description: ${options.workflow.description}` : undefined,
    `Reason: ${options.reason}`,
    "Approval required: yes",
    "",
    ...formatStagePlan(options.workflow.stagePlan ?? []),
    `Write stages: ${writeStages.length > 0 ? writeStages.join(", ") : "none"}`,
    `Output files: ${outputFiles.length > 0 ? outputFiles.join(", ") : "none"}`,
    "",
    "Next command after approval:",
    options.nextCommand,
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");
}

export function formatDynamicDispatchConfirmation(options: {
  plan: Extract<DynamicWorkflowPlan, { recommendedAction: "review_dynamic" }>;
  planFile: string;
  nextCommand: string;
}): string {
  return [
    formatDynamicWorkflowPlan(options.plan),
    "",
    `Plan file: ${options.planFile}`,
    "Next command after approval:",
    options.nextCommand,
  ].join("\n");
}

export function formatDynamicWorkflowPlan(plan: DynamicWorkflowPlan): string {
  if (plan.recommendedAction === "run_named") {
    return [
      `Recommended action: run named workflow`,
      `Workflow: ${plan.workflowName}`,
      `Reason: ${plan.reason}`,
    ].join("\n");
  }

  const stagePlan = plan.preview.stagePlan ? formatStagePlan(plan.preview.stagePlan) : [];

  return [
    "Recommended action: review dynamic workflow",
    `Reason: ${plan.reason}`,
    "Approval required: yes",
    "",
    "Preview:",
    `Template: ${plan.preview.template}`,
    plan.preview.summary,
    `Stages: ${plan.preview.stageCount}`,
    ...stagePlan,
    `Write stages: ${plan.preview.writeStages.length > 0 ? plan.preview.writeStages.join(", ") : "none"}`,
    `Output files: ${plan.preview.outputFiles.join(", ")}`,
    "Risks:",
    ...plan.preview.risks.map((risk) => `- ${risk}`),
    `Confirmation: ${plan.preview.confirmationPrompt}`,
    "",
    "Full workflow JSON:",
    JSON.stringify(plan.workflow, null, 2),
  ].join("\n");
}

export function formatNamedWorkflowRecommendation(options: {
  workflow: NamedWorkflowSummary;
  reason: string;
  nextCommand: string;
}): string {
  const writeStages = options.workflow.writeStages ?? [];
  const outputFiles = options.workflow.outputFiles ?? [];
  return [
    "Recommended action: run named workflow",
    `Workflow: ${options.workflow.name}`,
    options.workflow.description ? `Description: ${options.workflow.description}` : undefined,
    `Reason: ${options.reason}`,
    "Approval required: no",
    "",
    ...formatStagePlan(options.workflow.stagePlan ?? []),
    `Write stages: ${writeStages.length > 0 ? writeStages.join(", ") : "none"}`,
    `Output files: ${outputFiles.length > 0 ? outputFiles.join(", ") : "none"}`,
    "",
    "Next command:",
    options.nextCommand,
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");
}

function resolveDynamicPlanForRun(input: Extract<CliInput, { command: "run-dynamic" }>): {
  intent: string;
  plan: DynamicWorkflowPlan;
  planFile: WrittenDynamicPlanFile;
} {
  const planFile = readDynamicPlanFile(path.resolve(process.cwd(), input.planFile));
  return {
    intent: planFile.intent,
    plan: planFile.plan,
    planFile,
  };
}

function buildRunNameCommand(options: {
  workflowName: string;
  intent: string;
  params?: JsonRecord;
  outputDir?: string;
  runId?: string;
  worktreeDir?: string;
  registryDir?: string;
  approved?: boolean;
}): string {
  const parts = [
    "ultracode",
    shellQuote(options.workflowName),
    shellQuote(options.intent),
  ];
  if (options.approved) {
    parts.push("--approved", "true");
  }
  if (options.params && Object.keys(options.params).length > 0) {
    parts.push("--params", shellQuote(JSON.stringify(options.params)));
  }
  if (options.outputDir) {
    parts.push("--outputDir", shellQuote(options.outputDir));
  }
  if (options.runId) {
    parts.push("--run-id", shellQuote(options.runId));
  }
  if (options.worktreeDir) {
    parts.push("--worktree-dir", shellQuote(options.worktreeDir));
  }
  if (options.registryDir) {
    parts.push("--registry-dir", shellQuote(options.registryDir));
  }
  return parts.join(" ");
}

function buildRunDynamicPlanCommand(options: {
  planFile: string;
  params?: JsonRecord;
  outputDir?: string;
  runId?: string;
  worktreeDir?: string;
}): string {
  const parts = [
    "ultracode",
    "run-dynamic",
    "--plan-file",
    shellQuote(options.planFile),
    "--approved",
    "true",
  ];
  if (options.params && Object.keys(options.params).length > 0) {
    parts.push("--params", shellQuote(JSON.stringify(options.params)));
  }
  if (options.outputDir) {
    parts.push("--outputDir", shellQuote(options.outputDir));
  }
  if (options.runId) {
    parts.push("--run-id", shellQuote(options.runId));
  }
  if (options.worktreeDir) {
    parts.push("--worktree-dir", shellQuote(options.worktreeDir));
  }
  return parts.join(" ");
}

function createCliExecutionAfterApproval(
  nextCommand: string,
  workflowKind: "dynamic" | "named",
): { nextCommand: string; confirmationGate: string } {
  return {
    nextCommand,
    confirmationGate: `Only run this command after the user has approved the ${workflowKind} workflow preview.`,
  };
}

function createCliExecution(nextCommand: string): { nextCommand: string; approvalRequired: false } {
  return {
    nextCommand,
    approvalRequired: false,
  };
}

async function runNamedWorkflowFromCli(
  input: Extract<CliInput, { command: "run-named" }>,
  invocationRoot: string,
  options: { silent?: boolean } = {},
): Promise<CliNamedWorkflowRunPayload> {
  const workflow = resolveNamedWorkflow(input.workflowName, {
    registryDir: input.registryDir,
  });
  if ((workflow.writeStages ?? []).length > 0 && !input.approved) {
    throw new Error("Write-capable named workflow execution requires --approved true.");
  }
  const prepared = prepareRunWorktree(invocationRoot, {
    runId: input.runId,
    worktreeDir: input.worktreeDir,
  });
  const outputDir = path.resolve(prepared.worktreeRoot, input.outputDir);
  const generated = createParamFileFromTemplate({
    templateFile: workflow.paramTemplateFile,
    outputDir,
    workflowName: input.workflowName,
    intent: input.intent,
    params: input.params,
  });
  let approvedNamedWorkflow: ApprovedNamedWorkflowFile | undefined;
  if ((workflow.writeStages ?? []).length > 0 && input.approved) {
    approvedNamedWorkflow = writeApprovedNamedWorkflowFile({
      outputDir,
      workflowName: workflow.name,
      workflowFile: workflow.workflowFile,
      paramFile: generated.paramFile,
      intent: input.intent,
      params: generated.params,
      execution: {
        runId: input.runId,
        outputDir: input.outputDir,
        worktreeDir: input.worktreeDir,
      },
    });
  }

  configureTraceOutput(path.join(outputDir, "trace.jsonl"), {
    silent: options.silent ?? false,
  });
  emitEvent({
    type: "worktree.ready",
    worktreeRoot: prepared.worktreeRoot,
    created: prepared.created,
    branch: prepared.branch,
  });
  const result: JsonWorkflowRunResult = await runJsonWorkflow({
    repoRoot: prepared.worktreeRoot,
    workflowFile: workflow.workflowFile,
    paramFile: generated.paramFile,
    outputDir,
  });
  emitEvent({ type: "workflow.completed", result });
  const followUp = buildRunFollowUpEvent(input.runId);
  emitEvent(followUp);
  const approvedNamedWorkflowFile = approvedNamedWorkflow?.approvedNamedWorkflowFile;
  return {
    workflow: {
      ...workflow,
      paramFile: generated.paramFile,
      ...(approvedNamedWorkflowFile ? { approvedNamedWorkflowFile } : {}),
    },
    worktree: createCliWorktreePayload(prepared),
    inspection: createCliRunInspection({
      runId: input.runId,
      outputDir,
      followUp,
      approvedNamedWorkflowFile,
    }),
    result,
    followUp,
    ...(approvedNamedWorkflowFile ? { approvedNamedWorkflowFile } : {}),
  };
}

export function formatWorkflowStageAction(result: WorkflowStageActionResult): string {
  return [
    `Workflow: ${result.workflow}`,
    `Stage: ${result.stage.stage}`,
    `Status: ${result.stage.status}`,
    `Attempt: ${result.stage.attempt}`,
    `Output: ${result.stage.outputFile}`,
  ].join("\n");
}

function createWorkflowStageActionPayload(
  result: WorkflowStageActionResult,
  target: string,
): Record<string, unknown> {
  return {
    ...result,
    followUp: buildRunFollowUpEvent(target),
  };
}

export function formatRunList(runs: RunSummary[]): string {
  if (runs.length === 0) {
    return "No Ultracode runs found.";
  }
  return runs
    .map(
      (run) =>
        `${run.runId} ${run.workflow} ${run.status} ${run.source} ${run.updatedAt}\n  ${run.outputDir}`,
    )
    .join("\n");
}

export function formatRunArtifact(artifact: RunArtifact): string {
  return [
    `Run: ${artifact.runId}`,
    `Workflow: ${artifact.workflow}`,
    `Artifact: ${artifact.file}`,
    "",
    artifact.preview,
  ].join("\n");
}

export function formatPruneRuns(result: PruneRunsResult): string {
  const lines = [
    ...result.removed.map((run) => `Removed ${run.runId}: ${run.outputDir}`),
    ...result.removedWorktrees.map(
      (worktree) => `Removed worktree ${worktree.runId}: ${worktree.worktreeRoot}`,
    ),
    ...result.missing.map((runId) => `Missing ${runId}`),
  ];
  return lines.length > 0 ? lines.join("\n") : "No runs removed.";
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const input = parseCliArgs(argv);
  const invocationRoot = process.cwd();
  if (input.command === "help") {
    console.log(formatCliHelp());
    return;
  }
  if (input.command === "list-runs") {
    const runs = listRuns({ repoRoot: invocationRoot, limit: input.limit });
    input.json ? printJson({ runs }) : console.log(formatRunList(runs));
    return;
  }
  if (input.command === "artifact") {
    const artifact = getRunArtifact({ repoRoot: invocationRoot, runId: input.runId });
    input.json ? printJson(artifact) : console.log(formatRunArtifact(artifact));
    return;
  }
  if (input.command === "prune-runs") {
    const result = pruneRuns({
      repoRoot: invocationRoot,
      runIds: input.runIds,
      removeWorktrees: input.removeWorktrees,
    });
    input.json ? printJson(result) : console.log(formatPruneRuns(result));
    return;
  }
  if (input.command === "restart-stage") {
    const outputDir = resolveRunOutputDir({ repoRoot: invocationRoot, target: input.outputDir });
    configureTraceOutput(path.join(outputDir, "trace.jsonl"), {
      append: true,
      silent: input.json,
    });
    const result = await restartWorkflowStage({
      outputDir,
      stageName: input.stageName,
      cascade: input.cascade,
    });
    if (input.json) {
      printJson(createWorkflowStageActionPayload(result, input.outputDir));
    } else {
      console.log(formatWorkflowStageAction(result));
      emitRunFollowUp(input.outputDir);
    }
    return;
  }
  if (input.command === "rework-stage") {
    const outputDir = resolveRunOutputDir({ repoRoot: invocationRoot, target: input.outputDir });
    configureTraceOutput(path.join(outputDir, "trace.jsonl"), {
      append: true,
      silent: input.json,
    });
    const result = await reworkWorkflowStage({
      outputDir,
      stageName: input.stageName,
      feedback: input.feedback,
      cascade: input.cascade,
    });
    if (input.json) {
      printJson(createWorkflowStageActionPayload(result, input.outputDir));
    } else {
      console.log(formatWorkflowStageAction(result));
      emitRunFollowUp(input.outputDir);
    }
    return;
  }
  if (input.command === "plan-dynamic") {
    const availableWorkflows = listNamedWorkflows({ registryDir: input.registryDir });
    const plan = planDynamicWorkflow({
      intent: input.intent,
      availableWorkflows,
    });
    if (plan.recommendedAction === "run_named") {
      const workflow =
        availableWorkflows.find((entry) => entry.name === plan.workflowName) ??
        resolveNamedWorkflow(plan.workflowName, {
          registryDir: input.registryDir,
        });
      const requiresConfirmation = (workflow.writeStages ?? []).length > 0;
      const nextCommand = buildRunNameCommand({
        workflowName: plan.workflowName,
        intent: input.intent,
        params: input.params,
        outputDir: input.outputDir,
        runId: input.runId,
        worktreeDir: input.worktreeDir,
        registryDir: input.registryDir,
        approved: requiresConfirmation,
      });
      const output = requiresConfirmation
        ? {
            ...plan,
            workflow,
            preview: createCliNamedWorkflowPreview(workflow, { requiresConfirmation }),
            requiresConfirmation: true,
            executionAfterApproval: createCliExecutionAfterApproval(nextCommand, "named"),
          }
        : {
            ...plan,
            workflow,
            preview: createCliNamedWorkflowPreview(workflow, { requiresConfirmation }),
            nextCommand,
            execution: createCliExecution(nextCommand),
          };
      input.json
        ? printJson(output)
        : console.log(
            requiresConfirmation
              ? formatNamedWorkflowConfirmation({
                  workflow,
                  intent: input.intent,
                  reason: plan.reason,
                  nextCommand,
                })
              : formatNamedWorkflowRecommendation({
                  workflow,
                  reason: plan.reason,
                  nextCommand,
                }),
          );
      return;
    }

    const planFile =
      writeDynamicPlanFile({
        planFile: path.resolve(
          process.cwd(),
          input.outputPlan ?? defaultDispatchPlanPath(input.intent),
        ),
        intent: input.intent,
        plan,
        params: input.params,
        execution: {
          outputDir: input.outputDir,
          runId: input.runId,
          worktreeDir: input.worktreeDir,
        },
      });
    const nextCommand = buildRunDynamicPlanCommand({
      planFile: planFile.planFile,
      params: input.params,
      outputDir: input.outputDir,
      runId: input.runId,
      worktreeDir: input.worktreeDir,
    });
    const output = {
      ...plan,
      planFile: planFile.planFile,
      nextCommand,
      executionAfterApproval: createCliExecutionAfterApproval(nextCommand, "dynamic"),
    };
    input.json ? printJson(output) : console.log(formatDynamicWorkflowPlan(plan));
    if (!input.json && planFile) {
      console.log(`\nPlan file: ${planFile.planFile}`);
      console.log("Next command after approval:");
      console.log(nextCommand);
    }
    return;
  }
  if (input.command === "dispatch") {
    const availableWorkflows = listNamedWorkflows({ registryDir: input.registryDir });
    const plan = planDynamicWorkflow({
      intent: input.intent,
      availableWorkflows,
    });

    if (plan.recommendedAction === "run_named") {
      const workflow =
        availableWorkflows.find((entry) => entry.name === plan.workflowName) ??
        resolveNamedWorkflow(plan.workflowName, {
          registryDir: input.registryDir,
        });
      const writeStages = workflow.writeStages ?? [];
      if (writeStages.length > 0) {
        const nextCommand = buildRunNameCommand({
          workflowName: plan.workflowName,
          intent: input.intent,
          params: input.params,
          outputDir: input.outputDir,
          runId: input.runId,
          worktreeDir: input.worktreeDir,
          registryDir: input.registryDir,
          approved: true,
        });
        const payload = {
          dispatch: {
            action: "needs_confirmation",
            tool: "ultracode_run_named",
          },
          ...plan,
          requiresConfirmation: true,
          workflow,
          preview: createCliNamedWorkflowPreview(workflow, { requiresConfirmation: true }),
          nextCommand,
          executionAfterApproval: createCliExecutionAfterApproval(nextCommand, "named"),
        };
        input.json
          ? printJson(payload)
          : console.log(
              formatNamedWorkflowConfirmation({
                workflow,
                intent: input.intent,
                reason: plan.reason,
                nextCommand,
              }),
            );
        return;
      }

      const runId = input.runId ?? `${plan.workflowName}-${timestamp()}`;
      const runPayload = await runNamedWorkflowFromCli(
        {
          command: "run-named",
          workflowName: plan.workflowName,
          intent: input.intent,
          params: input.params,
          outputDir: input.outputDir ?? `.ultracode/runs/${runId}`,
          runId,
          worktreeDir: input.worktreeDir,
          registryDir: input.registryDir,
          json: input.json,
        },
        invocationRoot,
        { silent: input.json },
      );
      if (input.json) {
        printJson({
          dispatch: {
            action: "ran_named",
            tool: "ultracode_run_named",
          },
          ...plan,
          ...runPayload,
        });
      }
      return;
    }

    const planFile = writeDynamicPlanFile({
      planFile: path.resolve(invocationRoot, input.outputPlan ?? defaultDispatchPlanPath(input.intent)),
      intent: input.intent,
      plan,
      params: input.params,
      execution: {
        outputDir: input.outputDir,
        runId: input.runId,
        worktreeDir: input.worktreeDir,
      },
    });
    const nextCommand = buildRunDynamicPlanCommand({
      planFile: planFile.planFile,
      params: input.params,
      outputDir: input.outputDir,
      runId: input.runId,
      worktreeDir: input.worktreeDir,
    });
    const payload = {
      dispatch: {
        action: "needs_confirmation",
        tool: "ultracode_run_dynamic",
      },
      ...plan,
      planFile: planFile.planFile,
      createdAt: planFile.createdAt,
      nextCommand,
      executionAfterApproval: createCliExecutionAfterApproval(nextCommand, "dynamic"),
    };
    input.json
      ? printJson(payload)
      : console.log(
          formatDynamicDispatchConfirmation({
            plan,
            planFile: planFile.planFile,
            nextCommand,
          }),
        );
    return;
  }
  if (input.command === "list-workflows") {
    const workflows = listNamedWorkflows({ registryDir: input.registryDir });
    input.json ? printJson({ workflows }) : console.log(formatNamedWorkflowList(workflows));
    return;
  }
  if (input.command === "describe-workflow") {
    const workflow = resolveNamedWorkflow(input.workflowName, {
      registryDir: input.registryDir,
    });
    const readme = readWorkflowReadme(workflow);
    input.json
      ? printJson({ workflow, readme })
      : console.log(formatNamedWorkflowDescription(workflow, readme));
    return;
  }
  if (input.command === "run-dynamic") {
    if (!input.approved) {
      throw new Error("Dynamic workflow execution requires --approved true.");
    }

    const resolvedPlan = resolveDynamicPlanForRun(input);
    const effectiveParams = resolveDynamicRunParams({
      inputParams: input.params,
      planFile: resolvedPlan.planFile,
    });
    const execution = resolveDynamicRunExecutionContext({
      input,
      planFile: resolvedPlan.planFile,
      defaultRunId: `dynamic-${timestamp()}`,
    });
    const { plan } = resolvedPlan;
    if (plan.recommendedAction === "run_named") {
      const runPayload = await runNamedWorkflowFromCli(
        {
          command: "run-named",
          workflowName: plan.workflowName,
          intent: resolvedPlan.intent,
          params: effectiveParams,
          outputDir: execution.outputDir,
          runId: execution.runId,
          worktreeDir: execution.worktreeDir,
          registryDir: input.registryDir,
          approved: true,
          json: input.json,
        },
        invocationRoot,
        { silent: input.json },
      );
      if (input.json) {
        printJson({
          ...(resolvedPlan.planFile ? { planFile: resolvedPlan.planFile.planFile } : {}),
          ...runPayload,
        });
      }
      return;
    }

    const prepared = prepareRunWorktree(invocationRoot, {
      runId: execution.runId,
      worktreeDir: execution.worktreeDir,
    });
    const outputDir = path.resolve(prepared.worktreeRoot, execution.outputDir);
    const generated = createDynamicWorkflowFiles({
      outputDir,
      intent: resolvedPlan.intent,
      workflow: plan.workflow,
      params: effectiveParams,
    });
    let approvedPlanFile: string | undefined;
    if (resolvedPlan.planFile) {
      approvedPlanFile = copyApprovedDynamicPlanFile({
        planFile: resolvedPlan.planFile.planFile,
        outputDir,
        params: effectiveParams,
        execution,
      }).approvedPlanFile;
    }
    configureTraceOutput(path.join(outputDir, "trace.jsonl"), {
      silent: input.json,
    });
    emitEvent({
      type: "worktree.ready",
      worktreeRoot: prepared.worktreeRoot,
      created: prepared.created,
      branch: prepared.branch,
    });
    const result: JsonWorkflowRunResult = await runJsonWorkflow({
      repoRoot: prepared.worktreeRoot,
      workflowFile: generated.workflowFile,
      paramFile: generated.paramFile,
      outputDir,
    });
    emitEvent({ type: "workflow.completed", result });
    const followUp = buildRunFollowUpEvent(execution.runId);
    emitEvent(followUp);
    if (input.json) {
      const payload: CliDynamicWorkflowRunPayload = {
        workflow: {
          ...plan.workflow,
          workflowFile: generated.workflowFile,
          paramFile: generated.paramFile,
        },
        worktree: createCliWorktreePayload(prepared),
        inspection: createCliRunInspection({
          runId: execution.runId,
          outputDir,
          followUp,
          approvedPlanFile,
        }),
        result,
        followUp,
        ...(approvedPlanFile ? { approvedPlanFile } : {}),
      };
      printJson(payload);
    }
    return;
  }
  if (input.command === "status") {
    const outputDir = resolveRunOutputDir({ repoRoot: invocationRoot, target: input.outputDir });
    const status = inspectWorkflowStatus(outputDir);
    input.json ? printJson(status) : console.log(formatWorkflowStatus(status));
    return;
  }
  if (input.command === "tail") {
    const outputDir = resolveRunOutputDir({ repoRoot: invocationRoot, target: input.outputDir });
    const tail = inspectWorkflowTail(outputDir, {
      limit: input.limit,
    });
    input.json ? printJson(tail) : console.log(formatWorkflowTail(tail));
    return;
  }
  if (input.command === "report") {
    const outputDir = resolveRunOutputDir({ repoRoot: invocationRoot, target: input.outputDir });
    const report = inspectWorkflowReport(outputDir);
    input.json ? printJson(report) : console.log(formatWorkflowReport(report));
    return;
  }
  if (input.command === "watch") {
    const outputDir = resolveRunOutputDir({ repoRoot: invocationRoot, target: input.outputDir });
    if (input.json) {
      printJson(inspectWorkflowStatus(outputDir));
      return;
    }
    for (;;) {
      const status = inspectWorkflowStatus(outputDir);
      process.stdout.write("\x1Bc");
      console.log(formatWorkflowStatus(status));
      if (status.status === "completed" || status.status === "failed" || status.status === "unknown") {
        return;
      }
      await sleep(2000);
    }
    return;
  }
  if (input.command === "run-named") {
    const runPayload = await runNamedWorkflowFromCli(input, invocationRoot, {
      silent: input.json,
    });
    if (input.json) {
      printJson(runPayload);
    }
    return;
  }

  if (input.command !== "run-json") {
    return;
  }

  const workflowFile = path.resolve(invocationRoot, input.workflowFile);
  const paramFile = path.resolve(invocationRoot, input.paramFile);
  const prepared = prepareRunWorktree(invocationRoot, {
    runId: input.runId,
    worktreeDir: input.worktreeDir,
  });
  const repoRoot = prepared.worktreeRoot;
  const outputDir = path.resolve(repoRoot, input.outputDir);

  configureTraceOutput(path.join(outputDir, "trace.jsonl"), {
    silent: input.json,
  });
  emitEvent({
    type: "worktree.ready",
    worktreeRoot: repoRoot,
    created: prepared.created,
    branch: prepared.branch,
  });
  const result: JsonWorkflowRunResult = await runJsonWorkflow({
    repoRoot,
    workflowFile,
    paramFile,
    outputDir,
  });
  emitEvent({ type: "workflow.completed", result });
  const followUp = buildRunFollowUpEvent(input.runId);
  emitEvent(followUp);
  if (input.json) {
    printJson({
      workflow: {
        name: result.workflow,
        workflowFile,
        paramFile,
      },
      worktree: createCliWorktreePayload(prepared),
      inspection: createCliRunInspection({
        runId: input.runId,
        outputDir,
        followUp,
      }),
      result,
      followUp,
    });
  }
}
