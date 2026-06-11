import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.resolve(__dirname, "../dist");

function gitResponder(outputs) {
  return (args) => {
    const key = args.join(" ");
    if (key in outputs) {
      return outputs[key];
    }
    throw new Error(`unexpected git command: ${key}`);
  };
}

function recordingGitResponder(outputs) {
  const calls = [];
  const runGit = (args) => {
    calls.push(args);
    const key = args.join(" ");
    if (key in outputs) {
      return outputs[key];
    }
    throw new Error(`unexpected git command: ${key}`);
  };
  return { runGit, calls };
}

test("getGitWorktreeStatus detects a linked worktree", async () => {
  const { getGitWorktreeStatus } = await import(
    path.join(distRoot, "core/git-worktree.js")
  );

  const status = getGitWorktreeStatus("/repo/worktrees/run-1", {
    runGit: gitResponder({
      "rev-parse --git-dir": "/repo/.git/worktrees/run-1",
      "rev-parse --git-common-dir": "/repo/.git",
      "rev-parse --show-superproject-working-tree": "",
    }),
  });

  assert.equal(status.isLinkedWorktree, true);
  assert.equal(status.reason, "linked-worktree");
});

test("prepareRunWorktree rejects submodules even when git dir differs", async () => {
  const { prepareRunWorktree } = await import(
    path.join(distRoot, "core/git-worktree.js")
  );

  assert.throws(
    () =>
      prepareRunWorktree("/repo/submodule", {
        runGit: gitResponder({
          "rev-parse --git-dir": "/repo/.git/modules/submodule",
          "rev-parse --git-common-dir": "/repo/.git/modules/submodule",
          "rev-parse --show-superproject-working-tree": "/repo",
        }),
      }),
    /submodule/,
  );
});

test("prepareRunWorktree rejects non-git directories", async () => {
  const { prepareRunWorktree } = await import(
    path.join(distRoot, "core/git-worktree.js")
  );

  assert.throws(
    () =>
      prepareRunWorktree("/tmp/no-git", {
        runGit: () => {
          throw new Error("not a git repository");
        },
      }),
    /must start inside a git repository/,
  );
});

test("prepareRunWorktree reuses the current directory when already isolated", async () => {
  const { prepareRunWorktree } = await import(
    path.join(distRoot, "core/git-worktree.js")
  );

  const prepared = prepareRunWorktree("/repo/project.worktrees/run-1", {
    runId: "run-1",
    runGit: gitResponder({
      "rev-parse --git-dir": "/repo/.git/worktrees/run-1",
      "rev-parse --git-common-dir": "/repo/.git",
      "rev-parse --show-superproject-working-tree": "",
      "rev-parse --show-toplevel": "/repo/project.worktrees/run-1",
    }),
  });

  assert.equal(prepared.created, false);
  assert.equal(prepared.worktreeRoot, "/repo/project.worktrees/run-1");
});

test("prepareRunWorktree creates a sibling worktree from the primary checkout", async () => {
  const { prepareRunWorktree } = await import(
    path.join(distRoot, "core/git-worktree.js")
  );
  const { runGit, calls } = recordingGitResponder({
    "rev-parse --git-dir": "/repo/project/.git",
    "rev-parse --git-common-dir": "/repo/project/.git",
    "rev-parse --show-superproject-working-tree": "",
    "rev-parse --show-toplevel": "/repo/project",
    "worktree add -b codex/ultracode-run-1 /repo/project.worktrees/run-1": "",
  });

  const prepared = prepareRunWorktree("/repo/project", {
    runId: "run-1",
    runGit,
  });

  assert.equal(prepared.created, true);
  assert.equal(prepared.worktreeRoot, "/repo/project.worktrees/run-1");
  assert.equal(prepared.branch, "codex/ultracode-run-1");
  assert.deepEqual(calls.at(-1), [
    "worktree",
    "add",
    "-b",
    "codex/ultracode-run-1",
    "/repo/project.worktrees/run-1",
  ]);
});

test("prepareRunWorktree uses an explicit worktree directory when provided", async () => {
  const { prepareRunWorktree } = await import(
    path.join(distRoot, "core/git-worktree.js")
  );
  const { runGit } = recordingGitResponder({
    "rev-parse --git-dir": "/repo/project/.git",
    "rev-parse --git-common-dir": "/repo/project/.git",
    "rev-parse --show-superproject-working-tree": "",
    "rev-parse --show-toplevel": "/repo/project",
    "worktree add -b codex/ultracode-run-2 /tmp/ultracode-run-2": "",
  });

  const prepared = prepareRunWorktree("/repo/project", {
    runId: "run-2",
    worktreeDir: "/tmp/ultracode-run-2",
    runGit,
  });

  assert.equal(prepared.worktreeRoot, "/tmp/ultracode-run-2");
});
