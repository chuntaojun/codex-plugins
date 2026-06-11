export type RunSummary = {
    runId: string;
    workflow: string;
    outputDir: string;
    status: string;
    updatedAt: string;
    source: "checkout" | "worktree";
    worktreeRoot?: string;
};
export type ListRunsOptions = {
    repoRoot: string;
    limit?: number;
};
export type RunArtifact = {
    runId: string;
    workflow: string;
    outputDir: string;
    file: string;
    preview: string;
};
export type GetRunArtifactOptions = {
    repoRoot: string;
    runId: string;
};
export type ResolveRunOutputDirOptions = {
    repoRoot: string;
    target: string;
};
export type PruneRunsOptions = {
    repoRoot: string;
    runIds: string[];
    removeWorktrees?: boolean;
    removeWorktree?: RemoveRunWorktree;
};
export type PruneRunsResult = {
    removed: Array<{
        runId: string;
        outputDir: string;
    }>;
    removedWorktrees: Array<{
        runId: string;
        worktreeRoot: string;
    }>;
    missing: string[];
};
export type RemoveRunWorktree = (input: {
    repoRoot: string;
    runId: string;
    worktreeRoot: string;
    isLinkedWorktree: boolean;
}) => void;
export declare function listRuns(options: ListRunsOptions): RunSummary[];
export declare function resolveRunOutputDir(options: ResolveRunOutputDirOptions): string;
export declare function getRunArtifact(options: GetRunArtifactOptions): RunArtifact;
export declare function pruneRuns(options: PruneRunsOptions): PruneRunsResult;
