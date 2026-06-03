import fs from "node:fs";
import path from "node:path";
function readJsonFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
function workflowResultPath(outputDir) {
    return path.join(outputDir, "workflow-result.json");
}
function tracePath(outputDir) {
    return path.join(outputDir, "trace.jsonl");
}
function loadWorkflowResult(outputDir) {
    return readJsonFile(workflowResultPath(outputDir));
}
function collectFailedGates(stages) {
    const failures = [];
    for (const stage of stages) {
        const gate = stage.gate;
        if (!gate || gate.status !== "failed") {
            continue;
        }
        for (const command of gate.commands.filter((item) => item.exitCode !== 0)) {
            failures.push({
                stage: stage.stage,
                command: command.command,
                exitCode: command.exitCode,
            });
        }
    }
    return failures;
}
function mapStages(stages) {
    return stages.map((stage, index) => ({
        index: index + 1,
        name: stage.stage,
        status: stage.status,
        attempt: stage.attempt,
        sessionId: stage.sessionId,
        outputFile: stage.outputFile,
        resultFile: stage.resultFile,
    }));
}
function deriveWorkflowStatus(stages) {
    if (stages.some((stage) => stage.status === "failed")) {
        return "failed";
    }
    if (stages.some((stage) => stage.status === "running")) {
        return "running";
    }
    return stages.length > 0 ? "completed" : "unknown";
}
export function inspectWorkflowStatus(outputDir) {
    const statusFile = path.join(outputDir, "status.json");
    if (!fs.existsSync(workflowResultPath(outputDir)) && fs.existsSync(statusFile)) {
        return readJsonFile(statusFile);
    }
    const result = loadWorkflowResult(outputDir);
    const stages = mapStages(result.stages);
    const status = deriveWorkflowStatus(stages);
    return {
        workflow: result.workflow,
        status,
        outputDir,
        stages,
        currentStage: stages.find((stage) => stage.status === "running") ??
            [...stages].reverse().find((stage) => stage.status === "failed") ??
            stages.at(-1),
        failedGates: collectFailedGates(result.stages),
    };
}
export function inspectWorkflowTail(outputDir, options = {}) {
    const filePath = tracePath(outputDir);
    const limit = options.limit ?? 20;
    const lines = fs.existsSync(filePath)
        ? fs.readFileSync(filePath, "utf8").trim().split("\n").filter(Boolean)
        : [];
    return {
        outputDir,
        traceFile: filePath,
        events: lines.slice(-limit).map((line) => JSON.parse(line)),
    };
}
function readArtifactPreview(filePath) {
    if (!fs.existsSync(filePath)) {
        return "";
    }
    return fs.readFileSync(filePath, "utf8").slice(0, 4000);
}
export function inspectWorkflowReport(outputDir) {
    const status = inspectWorkflowStatus(outputDir);
    const finalStage = status.currentStage;
    const finalArtifact = finalStage?.outputFile
        ? {
            file: finalStage.outputFile,
            text: readArtifactPreview(finalStage.outputFile),
        }
        : undefined;
    const stageLines = status.stages.map((stage) => `${stage.index}. ${stage.name} ${stage.status}${stage.sessionId ? ` session:${stage.sessionId}` : ""}`);
    return {
        ...status,
        finalStage,
        finalArtifact,
        summary: [
            `Workflow ${status.workflow} is ${status.status}.`,
            ...stageLines,
            ...status.failedGates.map((gate) => `Failed gate in ${gate.stage}: ${gate.command} exited ${gate.exitCode}.`),
        ].join("\n"),
    };
}
export function writeWorkflowStatus(outputDir) {
    const status = inspectWorkflowStatus(outputDir);
    fs.writeFileSync(path.join(outputDir, "status.json"), `${JSON.stringify(status, null, 2)}\n`);
    return status;
}
export function writeWorkflowStatusSnapshot(outputDir, status) {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, "status.json"), `${JSON.stringify(status, null, 2)}\n`);
    return status;
}
