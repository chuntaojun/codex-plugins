import { execFileSync } from "node:child_process";
import path from "node:path";

export type RunGit = (args: string[], cwd: string) => string;

export type GitWorktreeStatus = {
  isGitRepository: boolean;
  isLinkedWorktree: boolean;
  isSubmodule: boolean;
  gitDir?: string;
  gitCommonDir?: string;
  superproject?: string;
  reason:
    | "linked-worktree"
    | "primary-checkout"
    | "submodule"
    | "not-git";
};

export type GitWorktreeOptions = {
  runGit?: RunGit;
};

export type PrepareRunWorktreeOptions = GitWorktreeOptions & {
  runId?: string;
  worktreeDir?: string;
};

export type PreparedRunWorktree = {
  worktreeRoot: string;
  created: boolean;
  branch?: string;
  status: GitWorktreeStatus;
};

const defaultRunGit: RunGit = (args, cwd) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

function normalizeGitPath(repoRoot: string, value: string): string {
  return path.resolve(repoRoot, value.trim());
}

function sanitizeRunId(value: string): string {
  const sanitized = value.replace(/[^A-Za-z0-9._-]/g, "-").replace(/^-+|-+$/g, "");
  return sanitized || "run";
}

export function getGitWorktreeStatus(
  repoRoot: string,
  options: GitWorktreeOptions = {},
): GitWorktreeStatus {
  const runGit = options.runGit ?? defaultRunGit;

  try {
    const gitDir = normalizeGitPath(
      repoRoot,
      runGit(["rev-parse", "--git-dir"], repoRoot),
    );
    const gitCommonDir = normalizeGitPath(
      repoRoot,
      runGit(["rev-parse", "--git-common-dir"], repoRoot),
    );
    const superproject = runGit(
      ["rev-parse", "--show-superproject-working-tree"],
      repoRoot,
    ).trim();
    const isSubmodule = Boolean(superproject);
    const isLinkedWorktree = gitDir !== gitCommonDir && !isSubmodule;

    return {
      isGitRepository: true,
      isLinkedWorktree,
      isSubmodule,
      gitDir,
      gitCommonDir,
      superproject: superproject || undefined,
      reason: isSubmodule
        ? "submodule"
        : isLinkedWorktree
          ? "linked-worktree"
          : "primary-checkout",
    };
  } catch {
    return {
      isGitRepository: false,
      isLinkedWorktree: false,
      isSubmodule: false,
      reason: "not-git",
    };
  }
}

export function prepareRunWorktree(
  repoRoot: string,
  options: PrepareRunWorktreeOptions = {},
): PreparedRunWorktree {
  const runGit = options.runGit ?? defaultRunGit;
  const status = getGitWorktreeStatus(repoRoot, { runGit });

  if (!status.isGitRepository) {
    throw new Error(
      "harness-cli run must start inside a git repository so it can create an isolated run worktree.",
    );
  }
  if (status.isSubmodule) {
    throw new Error(
      "harness-cli run cannot create a run worktree from a git submodule. Start from the superproject checkout instead.",
    );
  }
  if (status.isLinkedWorktree) {
    return {
      worktreeRoot: repoRoot,
      created: false,
      status,
    };
  }

  const topLevel = normalizeGitPath(
    repoRoot,
    runGit(["rev-parse", "--show-toplevel"], repoRoot),
  );
  const runId = sanitizeRunId(
    options.runId ?? new Date().toISOString().replace(/[:.]/g, "-"),
  );
  const branch = `codex/harness-${runId}`;
  const worktreeRoot = options.worktreeDir
    ? path.resolve(repoRoot, options.worktreeDir)
    : path.join(path.dirname(topLevel), `${path.basename(topLevel)}.worktrees`, runId);

  runGit(["worktree", "add", "-b", branch, worktreeRoot], topLevel);

  return {
    worktreeRoot,
    created: true,
    branch,
    status,
  };
}
