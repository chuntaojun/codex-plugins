import fs from "node:fs";
import path from "node:path";
let tracePath;
let silentStdout = false;
export function configureTraceOutput(filePath, options = {}) {
    tracePath = filePath;
    silentStdout = options.silent ?? false;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (!options.append) {
        fs.writeFileSync(filePath, "");
        return;
    }
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, "");
    }
}
export function appendTrace(event) {
    if (!tracePath) {
        return;
    }
    fs.appendFileSync(tracePath, `${JSON.stringify(event)}\n`);
}
export function emitEvent(event) {
    const line = JSON.stringify(event);
    if (!silentStdout) {
        console.log(line);
    }
    appendTrace(event);
}
