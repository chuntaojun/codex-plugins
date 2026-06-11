export type RunGit = (args: string[], cwd: string) => string;
export type GitWorktreeStatus = {
    isGitRepository: boolean;
    isLinkedWorktree: boolean;
    isSubmodule: boolean;
    gitDir?: string;
    gitCommonDir?: string;
    superproject?: string;
    reason: "linked-worktree" | "primary-checkout" | "submodule" | "not-git";
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
export declare function getGitWorktreeStatus(repoRoot: string, options?: GitWorktreeOptions): GitWorktreeStatus;
export declare function prepareRunWorktree(repoRoot: string, options?: PrepareRunWorktreeOptions): PreparedRunWorktree;
