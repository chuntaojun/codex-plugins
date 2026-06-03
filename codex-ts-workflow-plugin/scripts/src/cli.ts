import path from "node:path";

import { configureTraceOutput, emitEvent } from "./core/events.js";
import { prepareRunWorktree } from "./core/git-worktree.js";
import {
  inspectWorkflowReport,
  inspectWorkflowStatus,
  inspectWorkflowTail,
  type WorkflowReport,
  type WorkflowStatus,
  type WorkflowTail,
} from "./core/inspector.js";
import { runJsonWorkflow, type JsonWorkflowRunResult } from "./json-runner.js";

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export type CliInput =
  | {
      command: "run-json";
      workflowFile: string;
      paramFile: string;
      outputDir: string;
      runId: string;
      worktreeDir?: string;
    }
  | {
      command: "status" | "report" | "watch";
      outputDir: string;
      json: boolean;
    }
  | {
      command: "tail";
      outputDir: string;
      limit: number;
      json: boolean;
    };

function usageError(): Error {
  return new Error(
    "Usage: harness-cli run <workflow.json> <param.json> [--outputDir <dir>] [--worktreeDir <dir>] | harness-cli status|tail|report|watch <outputDir>",
  );
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

export function parseCliArgs(argv: string[]): CliInput {
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

  if (argv[0] !== "run") {
    throw usageError();
  }

  const workflowFile = argv[1];
  const paramFile = argv[2];
  if (!workflowFile || workflowFile.startsWith("--")) {
    throw usageError();
  }
  if (!paramFile || paramFile.startsWith("--")) {
    throw usageError();
  }

  const options = parseOptionArgs(argv.slice(3));
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
      `.codex-workflows/runs/${options.runId ?? options["run-id"] ?? runId}`,
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

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const input = parseCliArgs(argv);
  if (input.command === "status") {
    const status = inspectWorkflowStatus(path.resolve(process.cwd(), input.outputDir));
    input.json ? printJson(status) : console.log(formatWorkflowStatus(status));
    return;
  }
  if (input.command === "tail") {
    const tail = inspectWorkflowTail(path.resolve(process.cwd(), input.outputDir), {
      limit: input.limit,
    });
    input.json ? printJson(tail) : console.log(formatWorkflowTail(tail));
    return;
  }
  if (input.command === "report") {
    const report = inspectWorkflowReport(path.resolve(process.cwd(), input.outputDir));
    input.json ? printJson(report) : console.log(formatWorkflowReport(report));
    return;
  }
  if (input.command === "watch") {
    const outputDir = path.resolve(process.cwd(), input.outputDir);
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
  if (input.command !== "run-json") {
    return;
  }

  const invocationRoot = process.cwd();
  const workflowFile = path.resolve(invocationRoot, input.workflowFile);
  const paramFile = path.resolve(invocationRoot, input.paramFile);
  const prepared = prepareRunWorktree(invocationRoot, {
    runId: input.runId,
    worktreeDir: input.worktreeDir,
  });
  const repoRoot = prepared.worktreeRoot;
  const outputDir = path.resolve(repoRoot, input.outputDir);

  configureTraceOutput(path.join(outputDir, "trace.jsonl"));
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
}
