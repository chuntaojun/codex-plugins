import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.resolve(__dirname, "../dist");

test("buildCodexArgs maps read-only agent mode to codex exec sandbox flags", async () => {
  const { buildCodexArgs } = await import(path.join(distRoot, "core/codex.js"));

  const args = buildCodexArgs({
    label: "bug-reviewer",
    prompt: "Review the diff",
    cwd: "/repo",
    mode: "read-only",
    outputSchema: "/schema.json",
    outputFile: "/out/bug-review.json",
  });

  assert.deepEqual(args, [
    "exec",
    "Review the diff",
    "--cd",
    "/repo",
    "--json",
    "--output-last-message",
    "/out/bug-review.json",
    "--sandbox",
    "read-only",
    "--output-schema",
    "/schema.json",
  ]);
});

test("buildCodexArgs maps write mode to workspace-write sandbox", async () => {
  const { buildCodexArgs } = await import(path.join(distRoot, "core/codex.js"));

  const args = buildCodexArgs({
    label: "writer",
    prompt: "Fix issue",
    cwd: "/repo",
    mode: "write",
    outputFile: "/out/write.json",
  });

  assert.equal(args.at(-1), "workspace-write");
});

test("consumeCodexJsonChunk preserves JSONL boundaries across stdout chunks", async () => {
  const { createCodexJsonlState, consumeCodexJsonChunk, flushCodexJsonBuffer } =
    await import(path.join(distRoot, "core/codex.js"));
  const state = createCodexJsonlState();
  const lines = [];

  consumeCodexJsonChunk(
    state,
    '{"type":"session.started","session_id":"session-1"',
    (line) => lines.push(line),
  );
  assert.deepEqual(lines, []);
  assert.equal(state.sessionId, undefined);

  consumeCodexJsonChunk(
    state,
    '}\n{"type":"agent_message","message":"thinking"}\n{"type":"partial"',
    (line) => lines.push(line),
  );
  assert.deepEqual(lines, [
    '{"type":"session.started","session_id":"session-1"}',
    '{"type":"agent_message","message":"thinking"}',
  ]);
  assert.equal(state.sessionId, "session-1");

  flushCodexJsonBuffer(state, (line) => lines.push(line));
  assert.equal(lines.length, 2);

  consumeCodexJsonChunk(
    state,
    '{"type":"session.updated","session":{"id":"session-2"}}',
    (line) => lines.push(line),
  );
  flushCodexJsonBuffer(state, (line) => lines.push(line));

  assert.equal(lines.at(-1), '{"type":"session.updated","session":{"id":"session-2"}}');
  assert.equal(state.sessionId, "session-2");
});
