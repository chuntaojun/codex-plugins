import { execFileSync } from "node:child_process";
import path from "node:path";
const defaultRunGit = (args, cwd) => execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
}).trim();
function normalizeGitPath(repoRoot, value) {
    return path.resolve(repoRoot, value.trim());
}
function sanitizeRunId(value) {
    const sanitized = value.replace(/[^A-Za-z0-9._-]/g, "-").replace(/^-+|-+$/g, "");
    return sanitized || "run";
}
export function getGitWorktreeStatus(repoRoot, options = {}) {
    const runGit = options.runGit ?? defaultRunGit;
    try {
        const gitDir = normalizeGitPath(repoRoot, runGit(["rev-parse", "--git-dir"], repoRoot));
        const gitCommonDir = normalizeGitPath(repoRoot, runGit(["rev-parse", "--git-common-dir"], repoRoot));
        const superproject = runGit(["rev-parse", "--show-superproject-working-tree"], repoRoot).trim();
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
    }
    catch {
        return {
            isGitRepository: false,
            isLinkedWorktree: false,
            isSubmodule: false,
            reason: "not-git",
        };
    }
}
export function prepareRunWorktree(repoRoot, options = {}) {
    const runGit = options.runGit ?? defaultRunGit;
    const status = getGitWorktreeStatus(repoRoot, { runGit });
    if (!status.isGitRepository) {
        throw new Error("harness-cli run must start inside a git repository so it can create an isolated run worktree.");
    }
    if (status.isSubmodule) {
        throw new Error("harness-cli run cannot create a run worktree from a git submodule. Start from the superproject checkout instead.");
    }
    if (status.isLinkedWorktree) {
        return {
            worktreeRoot: repoRoot,
            created: false,
            status,
        };
    }
    const topLevel = normalizeGitPath(repoRoot, runGit(["rev-parse", "--show-toplevel"], repoRoot));
    const runId = sanitizeRunId(options.runId ?? new Date().toISOString().replace(/[:.]/g, "-"));
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
