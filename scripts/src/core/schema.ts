export const modes = ["read-only", "write"] as const;

export type WorkflowMode = (typeof modes)[number];

export type WorkflowContext = {
  repoRoot: string;
  workflow: string;
  goal?: string;
  target?: string;
  mode: WorkflowMode;
  outputDir: string;
};
