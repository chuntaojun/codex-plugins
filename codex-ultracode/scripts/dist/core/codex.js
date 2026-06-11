import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { appendTrace, emitEvent } from "./events.js";
export function createCodexJsonlState() {
    return {
        buffer: "",
    };
}
export function extractSessionId(event) {
    if (typeof event !== "object" || event === null) {
        return undefined;
    }
    const payload = event;
    const candidate = payload.session_id ??
        payload.sessionId ??
        payload.sessionID ??
        (typeof payload.session === "object" && payload.session !== null
            ? payload.session.id
            : undefined);
    return typeof candidate === "string" && candidate.trim()
        ? candidate
        : undefined;
}
function consumeCodexJsonLine(state, rawLine, onJsonLine) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
        return;
    }
    try {
        const event = JSON.parse(line);
        state.sessionId = extractSessionId(event) ?? state.sessionId;
        onJsonLine(line);
    }
    catch {
        // Ignore malformed event lines here; raw stdout is preserved separately.
    }
}
export function consumeCodexJsonChunk(state, data, onJsonLine) {
    const chunks = (state.buffer + data).split(/\r?\n/);
    state.buffer = chunks.pop() ?? "";
    for (const line of chunks) {
        consumeCodexJsonLine(state, line, onJsonLine);
    }
}
export function flushCodexJsonBuffer(state, onJsonLine) {
    consumeCodexJsonLine(state, state.buffer, onJsonLine);
    state.buffer = "";
}
export function buildCodexArgs(options) {
    const args = [
        "exec",
        options.prompt,
        "--cd",
        options.cwd,
        "--json",
        "--output-last-message",
        options.outputFile,
        "--sandbox",
        options.mode === "write" ? "workspace-write" : "read-only",
    ];
    if (options.outputSchema) {
        args.push("--output-schema", options.outputSchema);
    }
    return args;
}
export const agent = (options) => {
    const args = buildCodexArgs(options);
    return new Promise((resolve, reject) => {
        for (const filePath of [
            options.eventFile,
            options.stdoutFile,
            options.stderrFile,
            options.sessionFile,
        ]) {
            if (filePath) {
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                fs.writeFileSync(filePath, "");
            }
        }
        const child = spawn("codex", args, {
            cwd: options.cwd,
            stdio: ["ignore", "pipe", "pipe"],
        });
        const jsonlState = createCodexJsonlState();
        child.stdout.on("data", (buf) => {
            const data = buf.toString();
            if (options.stdoutFile) {
                fs.appendFileSync(options.stdoutFile, data);
            }
            if (options.eventFile) {
                consumeCodexJsonChunk(jsonlState, data, (line) => {
                    fs.appendFileSync(options.eventFile, `${line}\n`);
                });
            }
            emitEvent({
                type: "agent.event",
                label: options.label,
                data,
            });
        });
        child.stderr.on("data", (buf) => {
            const data = buf.toString();
            if (options.stderrFile) {
                fs.appendFileSync(options.stderrFile, data);
            }
            const event = {
                type: "agent.stderr",
                label: options.label,
                data,
            };
            process.stderr.write(`${JSON.stringify(event)}\n`);
            appendTrace(event);
        });
        child.on("error", reject);
        child.on("close", (code) => {
            if (options.eventFile) {
                flushCodexJsonBuffer(jsonlState, (line) => {
                    fs.appendFileSync(options.eventFile, `${line}\n`);
                });
            }
            if (options.sessionFile) {
                fs.writeFileSync(options.sessionFile, `${JSON.stringify({
                    label: options.label,
                    codexSessionId: jsonlState.sessionId,
                    status: code === 0 ? "completed" : "failed",
                    exitCode: code ?? 1,
                    outputFile: options.outputFile,
                    eventFile: options.eventFile,
                    stdoutFile: options.stdoutFile,
                    stderrFile: options.stderrFile,
                }, null, 2)}\n`);
            }
            if (code === 0) {
                resolve({ outputFile: options.outputFile, sessionId: jsonlState.sessionId });
                return;
            }
            reject(new Error(`Agent ${options.label} exited with code ${code}`));
        });
    });
};
