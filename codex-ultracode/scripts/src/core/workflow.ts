import type { WorkflowContext, WorkflowMode } from "./schema.js";

export type { WorkflowContext } from "./schema.js";

export function createWorkflowContext(input: {
  repoRoot: string;
  workflow: string;
  goal?: string;
  target?: string;
  mode: WorkflowMode;
  outputDir: string;
}): WorkflowContext {
  return {
    repoRoot: input.repoRoot,
    workflow: input.workflow,
    goal: input.goal,
    target: input.target,
    mode: input.mode,
    outputDir: input.outputDir,
  };
}
