import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.resolve(__dirname, "../dist");

test("configureTraceOutput can append to an existing trace for restart and rework", async () => {
  const { configureTraceOutput, emitEvent } = await import(
    path.join(distRoot, "core/events.js")
  );
  const tracePath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "codex-trace-test-")),
    "trace.jsonl",
  );

  configureTraceOutput(tracePath);
  emitEvent({ type: "first" });
  configureTraceOutput(tracePath, { append: true });
  emitEvent({ type: "second" });

  const lines = fs.readFileSync(tracePath, "utf8").trim().split("\n");
  assert.deepEqual(
    lines.map((line) => JSON.parse(line).type),
    ["first", "second"],
  );
});

test("emitEvent can write trace without logging to stdout", async (t) => {
  const { configureTraceOutput, emitEvent } = await import(
    path.join(distRoot, "core/events.js")
  );
  const tracePath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "codex-trace-silent-test-")),
    "trace.jsonl",
  );
  const logs = [];
  const originalLog = console.log;
  t.after(() => {
    console.log = originalLog;
  });
  console.log = (value) => {
    logs.push(value);
  };

  configureTraceOutput(tracePath, { silent: true });
  emitEvent({ type: "silent" });

  assert.deepEqual(logs, []);
  const lines = fs.readFileSync(tracePath, "utf8").trim().split("\n");
  assert.deepEqual(
    lines.map((line) => JSON.parse(line).type),
    ["silent"],
  );
});
