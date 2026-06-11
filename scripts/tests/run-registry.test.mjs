import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.resolve(__dirname, "../dist");

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createRun(root, runId, workflow, outputText) {
  const outputDir = path.join(root, ".ultracode/runs", runId);
  const artifact = path.join(outputDir, "stages/001-final/attempts/001/final.md");
  fs.mkdirSync(path.dirname(artifact), { recursive: true });
  fs.writeFileSync(artifact, outputText);
  writeJson(path.join(outputDir, "workflow-result.json"), {
    workflow,
    status: "completed",
    outputDir,
    stages: [
      {
        stage: "final",
        status: "passed",
        attempt: 1,
        stageDir: path.join(outputDir, "stages/001-final"),
        attemptDir: path.dirname(artifact),
        inputFile: path.join(path.dirname(artifact), "input.json"),
        promptFile: path.join(path.dirname(artifact), "prompt.md"),
        outputFile: artifact,
        resultFile: path.join(path.dirname(artifact), "result.json"),
      },
    ],
  });
  return outputDir;
}

test("listRuns discovers current checkout and sibling worktree runs", async () => {
  const { listRuns } = await import(path.join(distRoot, "run-registry.js"));
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-runs-parent-"));
  const repoRoot = path.join(parent, "project");
  const worktreeRoot = path.join(parent, "project.worktrees/run-two");
  fs.mkdirSync(repoRoot, { recursive: true });
  fs.mkdirSync(worktreeRoot, { recursive: true });
  const runOneOutputDir = createRun(repoRoot, "run-one", "doc-flow", "one");
  const runTwoOutputDir = createRun(worktreeRoot, "run-two", "travel-guide", "two");
  const sameUpdatedAt = new Date("2026-01-01T00:00:00.000Z");
  fs.utimesSync(runOneOutputDir, sameUpdatedAt, sameUpdatedAt);
  fs.utimesSync(runTwoOutputDir, sameUpdatedAt, sameUpdatedAt);

  const runs = listRuns({ repoRoot, limit: 10 });

  assert.deepEqual(
    runs.map((run) => [run.runId, run.workflow]),
    [
      ["run-two", "travel-guide"],
      ["run-one", "doc-flow"],
    ],
  );
  assert.equal(runs[0].source, "worktree");
  assert.equal(runs[1].source, "checkout");
});

test("getRunArtifact returns the final artifact path and preview", async () => {
  const { getRunArtifact } = await import(path.join(distRoot, "run-registry.js"));
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-artifact-"));
  const repoRoot = path.join(parent, "project");
  fs.mkdirSync(repoRoot, { recursive: true });
  createRun(repoRoot, "run-one", "doc-flow", "final artifact body");

  const artifact = getRunArtifact({ repoRoot, runId: "run-one" });

  assert.equal(artifact.runId, "run-one");
  assert.match(artifact.file, /final\.md$/);
  assert.equal(artifact.preview, "final artifact body");
});

test("pruneRuns removes matching run directories", async () => {
  const { pruneRuns } = await import(path.join(distRoot, "run-registry.js"));
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-prune-"));
  const repoRoot = path.join(parent, "project");
  fs.mkdirSync(repoRoot, { recursive: true });
  const outputDir = createRun(repoRoot, "run-one", "doc-flow", "body");

  const result = pruneRuns({ repoRoot, runIds: ["run-one"] });

  assert.equal(result.removed.length, 1);
  assert.equal(result.removed[0].runId, "run-one");
  assert.equal(fs.existsSync(outputDir), false);
});

test("pruneRuns can explicitly remove sibling worktree directories", async () => {
  const { pruneRuns } = await import(path.join(distRoot, "run-registry.js"));
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-prune-worktree-"));
  const repoRoot = path.join(parent, "project");
  const worktreeRoot = path.join(parent, "project.worktrees/run-two");
  fs.mkdirSync(repoRoot, { recursive: true });
  fs.mkdirSync(worktreeRoot, { recursive: true });
  const outputDir = createRun(worktreeRoot, "run-two", "travel-guide", "body");

  const artifactOnly = pruneRuns({ repoRoot, runIds: ["run-two"] });

  assert.equal(artifactOnly.removed[0].runId, "run-two");
  assert.equal(fs.existsSync(outputDir), false);
  assert.equal(fs.existsSync(worktreeRoot), true);
  assert.deepEqual(artifactOnly.removedWorktrees, []);

  createRun(worktreeRoot, "run-two", "travel-guide", "body");

  const withWorktree = pruneRuns({
    repoRoot,
    runIds: ["run-two"],
    removeWorktrees: true,
  });

  assert.deepEqual(withWorktree.removedWorktrees, [
    {
      runId: "run-two",
      worktreeRoot,
    },
  ]);
  assert.equal(fs.existsSync(worktreeRoot), false);
});

test("pruneRuns removes linked git worktrees through a worktree remover", async () => {
  const { pruneRuns } = await import(path.join(distRoot, "run-registry.js"));
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-prune-git-worktree-"));
  const repoRoot = path.join(parent, "project");
  const worktreeRoot = path.join(parent, "project.worktrees/run-three");
  fs.mkdirSync(repoRoot, { recursive: true });
  fs.mkdirSync(worktreeRoot, { recursive: true });
  fs.writeFileSync(path.join(worktreeRoot, ".git"), "gitdir: ../.git/worktrees/run-three\n");
  createRun(worktreeRoot, "run-three", "travel-guide", "body");
  const calls = [];

  const result = pruneRuns({
    repoRoot,
    runIds: ["run-three"],
    removeWorktrees: true,
    removeWorktree: (input) => {
      calls.push(input);
      fs.rmSync(input.worktreeRoot, { recursive: true, force: true });
    },
  });

  assert.deepEqual(calls, [
    {
      repoRoot,
      runId: "run-three",
      worktreeRoot,
      isLinkedWorktree: true,
    },
  ]);
  assert.deepEqual(result.removedWorktrees, [
    {
      runId: "run-three",
      worktreeRoot,
    },
  ]);
  assert.equal(fs.existsSync(worktreeRoot), false);
});
