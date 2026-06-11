import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { inspectWorkflowReport, inspectWorkflowStatus } from "./core/inspector.js";
function runRootFor(repoRoot) {
    return path.join(repoRoot, ".ultracode/runs");
}
function siblingWorktreesRoot(repoRoot) {
    return path.join(path.dirname(repoRoot), `${path.basename(repoRoot)}.worktrees`);
}
function hasWorkflowResult(outputDir) {
    return fs.existsSync(path.join(outputDir, "workflow-result.json"));
}
function isLinkedGitWorktreeDirectory(worktreeRoot) {
    return fs.existsSync(path.join(worktreeRoot, ".git"));
}
const defaultRemoveRunWorktree = (input) => {
    if (input.isLinkedWorktree) {
        execFileSync("git", ["worktree", "remove", "--force", input.worktreeRoot], {
            cwd: input.repoRoot,
            stdio: ["ignore", "pipe", "pipe"],
        });
        return;
    }
    fs.rmSync(input.worktreeRoot, { recursive: true, force: true });
};
function collectRunDirs(repoRoot) {
    const candidates = [];
    const checkoutRuns = runRootFor(repoRoot);
    if (fs.existsSync(checkoutRuns)) {
        for (const entry of fs.readdirSync(checkoutRuns, { withFileTypes: true })) {
            if (entry.isDirectory()) {
                candidates.push({
                    outputDir: path.join(checkoutRuns, entry.name),
                    source: "checkout",
                });
            }
        }
    }
    const worktreesRoot = siblingWorktreesRoot(repoRoot);
    if (fs.existsSync(worktreesRoot)) {
        for (const worktree of fs.readdirSync(worktreesRoot, { withFileTypes: true })) {
            if (!worktree.isDirectory()) {
                continue;
            }
            const worktreeRuns = path.join(worktreesRoot, worktree.name, ".ultracode/runs");
            if (!fs.existsSync(worktreeRuns)) {
                continue;
            }
            for (const run of fs.readdirSync(worktreeRuns, { withFileTypes: true })) {
                if (run.isDirectory()) {
                    candidates.push({
                        outputDir: path.join(worktreeRuns, run.name),
                        source: "worktree",
                        worktreeRoot: path.join(worktreesRoot, worktree.name),
                    });
                }
            }
        }
    }
    return candidates.filter((candidate) => hasWorkflowResult(candidate.outputDir));
}
export function listRuns(options) {
    const repoRoot = path.resolve(options.repoRoot);
    const runs = collectRunDirs(repoRoot).map(({ outputDir, source, worktreeRoot }) => {
        const status = inspectWorkflowStatus(outputDir);
        return {
            runId: path.basename(outputDir),
            workflow: status.workflow,
            outputDir,
            status: status.status,
            updatedAt: fs.statSync(outputDir).mtime.toISOString(),
            source,
            worktreeRoot,
        };
    });
    return runs
        .sort((a, b) => {
        const updatedAtDiff = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
        if (updatedAtDiff !== 0) {
            return updatedAtDiff;
        }
        const runIdDiff = b.runId.localeCompare(a.runId);
        if (runIdDiff !== 0) {
            return runIdDiff;
        }
        return b.outputDir.localeCompare(a.outputDir);
    })
        .slice(0, options.limit ?? 20);
}
function findRun(options) {
    const run = listRuns({ repoRoot: options.repoRoot, limit: Number.MAX_SAFE_INTEGER }).find((item) => item.runId === options.runId);
    if (!run) {
        throw new Error(`Unknown run id: ${options.runId}`);
    }
    return run;
}
export function resolveRunOutputDir(options) {
    const outputDir = path.resolve(options.repoRoot, options.target);
    if (fs.existsSync(path.join(outputDir, "workflow-result.json")) ||
        fs.existsSync(path.join(outputDir, "status.json"))) {
        return outputDir;
    }
    return findRun({ repoRoot: options.repoRoot, runId: options.target }).outputDir;
}
export function getRunArtifact(options) {
    const run = findRun(options);
    const report = inspectWorkflowReport(run.outputDir);
    if (!report.finalArtifact?.file) {
        throw new Error(`Run has no final artifact: ${options.runId}`);
    }
    return {
        runId: run.runId,
        workflow: run.workflow,
        outputDir: run.outputDir,
        file: report.finalArtifact.file,
        preview: report.finalArtifact.text,
    };
}
export function pruneRuns(options) {
    const removed = [];
    const removedWorktrees = [];
    const missing = [];
    for (const runId of options.runIds) {
        const run = listRuns({ repoRoot: options.repoRoot, limit: Number.MAX_SAFE_INTEGER }).find((item) => item.runId === runId);
        if (!run) {
            missing.push(runId);
            continue;
        }
        fs.rmSync(run.outputDir, { recursive: true, force: true });
        removed.push({ runId, outputDir: run.outputDir });
        if (options.removeWorktrees && run.source === "worktree" && run.worktreeRoot) {
            const removeWorktree = options.removeWorktree ?? defaultRemoveRunWorktree;
            removeWorktree({
                repoRoot: options.repoRoot,
                runId,
                worktreeRoot: run.worktreeRoot,
                isLinkedWorktree: isLinkedGitWorktreeDirectory(run.worktreeRoot),
            });
            removedWorktrees.push({ runId, worktreeRoot: run.worktreeRoot });
        }
    }
    return { removed, removedWorktrees, missing };
}
