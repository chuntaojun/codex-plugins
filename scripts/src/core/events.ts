import fs from "node:fs";
import path from "node:path";

let tracePath: string | undefined;
let silentStdout = false;

export type WorkflowEvent = {
  type: string;
  [key: string]: unknown;
};

export function configureTraceOutput(
  filePath: string,
  options: { append?: boolean; silent?: boolean } = {},
): void {
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

export function appendTrace(event: WorkflowEvent): void {
  if (!tracePath) {
    return;
  }
  fs.appendFileSync(tracePath, `${JSON.stringify(event)}\n`);
}

export function emitEvent(event: WorkflowEvent): void {
  const line = JSON.stringify(event);
  if (!silentStdout) {
    console.log(line);
  }
  appendTrace(event);
}
