import fs from "node:fs";
import path from "node:path";
import { writeWorkflowStatus, writeWorkflowStatusSnapshot, } from "./core/inspector.js";
import { runAgentStage, } from "./core/stage.js";
import { createWorkflowContext } from "./core/workflow.js";
import { orderStagesByDependencies } from "./workflow-deps.js";
function readJsonFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
function writeJsonFile(filePath, value) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
function resolvePath(value, context) {
    return value.split(".").reduce((current, segment) => {
        if (typeof current !== "object" || current === null) {
            return undefined;
        }
        return current[segment];
    }, context);
}
function renderString(value, context) {
    const exact = value.match(/^\$\{([^}]+)\}$/);
    if (exact) {
        const resolved = resolvePath(exact[1], context);
        return resolved === undefined ? value : resolved;
    }
    return value.replace(/\$\{([^}]+)\}/g, (_match, expression) => {
        const resolved = resolvePath(expression, context);
        return resolved === undefined ? _match : String(resolved);
    });
}
function renderValue(value, context) {
    if (typeof value === "string") {
        return renderString(value, context);
    }
    if (Array.isArray(value)) {
        return value.map((item) => renderValue(item, context));
    }
    if (typeof value === "object" && value !== null) {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, renderValue(item, context)]));
    }
    return value;
}
function renderPrompt(stage, workflowDir, context) {
    if (stage.promptFile) {
        const promptPath = path.resolve(workflowDir, stage.promptFile);
        return renderString(fs.readFileSync(promptPath, "utf8"), context);
    }
    if (!stage.prompt) {
        throw new Error(`Stage ${stage.name} must define prompt or promptFile`);
    }
    if (Array.isArray(stage.prompt)) {
        return stage.prompt.map((line) => renderString(line, context));
    }
    return renderString(stage.prompt, context);
}
export async function runJsonWorkflow(options) {
    const workflowPath = path.resolve(options.repoRoot, options.workflowFile);
    const paramPath = path.resolve(options.repoRoot, options.paramFile);
    const workflow = readJsonFile(workflowPath);
    const params = readJsonFile(paramPath);
    const outputDir = path.resolve(options.repoRoot, options.outputDir);
    const workflowDir = path.dirname(workflowPath);
    const orderedStages = orderStagesByDependencies(workflow.stages);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.copyFileSync(workflowPath, path.join(outputDir, "workflow.json"));
    fs.copyFileSync(paramPath, path.join(outputDir, "param.json"));
    const ctx = createWorkflowContext({
        repoRoot: options.repoRoot,
        workflow: workflow.name,
        goal: typeof params.goal === "string" ? params.goal : workflow.name,
        target: typeof params.target === "string" ? params.target : undefined,
        mode: params.mode === "write" ? "write" : "read-only",
        outputDir,
    });
    const stages = [];
    const stageContext = {};
    const stageStatuses = orderedStages.map((stage, index) => ({
        index: index + 1,
        name: stage.name,
        status: "pending",
    }));
    const failedGates = [];
    const writeLiveStatus = (status) => {
        const effectiveStatus = stageStatuses.some((stage) => stage.status === "failed")
            ? "failed"
            : status;
        writeWorkflowStatusSnapshot(outputDir, {
            workflow: workflow.name,
            status: effectiveStatus,
            outputDir,
            stages: stageStatuses,
            currentStage: stageStatuses.find((stage) => stage.status === "running") ??
                [...stageStatuses].reverse().find((stage) => stage.status === "failed") ??
                stageStatuses.find((stage) => stage.status === "pending") ??
                stageStatuses.at(-1),
            failedGates,
        });
    };
    writeLiveStatus("running");
    for (const [index, stage] of orderedStages.entries()) {
        if (stage.type !== "codex") {
            throw new Error(`Unsupported stage type: ${stage.type}`);
        }
        const context = {
            params,
            stages: stageContext,
        };
        const input = (stage.input
            ? renderValue(stage.input, context)
            : {});
        const renderedStage = {
            index: index + 1,
            name: stage.name,
            input,
            prompt: renderPrompt(stage, workflowDir, context),
            agent: {
                label: stage.agent?.label ?? stage.name,
                mode: stage.agent?.mode ?? ctx.mode,
                outputFile: stage.output.file,
                outputSchema: stage.agent?.outputSchema ?? stage.output.schema,
            },
            gate: stage.gate,
        };
        stageStatuses[index] = {
            ...stageStatuses[index],
            status: "running",
        };
        writeLiveStatus("running");
        const result = await runAgentStage({
            ctx,
            stage: renderedStage,
            runAgent: options.runAgent,
        });
        const stageRun = {
            ...result,
            input,
        };
        stages.push(stageRun);
        stageStatuses[index] = {
            ...stageStatuses[index],
            status: result.status,
            attempt: result.attempt,
            sessionId: result.sessionId,
            outputFile: result.outputFile,
            resultFile: result.resultFile,
        };
        if (result.gate?.status === "failed") {
            for (const command of result.gate.commands.filter((item) => item.exitCode !== 0)) {
                failedGates.push({
                    stage: result.stage,
                    command: command.command,
                    exitCode: command.exitCode,
                });
            }
        }
        writeLiveStatus(result.status === "failed" ? "failed" : "running");
        stageContext[stage.name] = {
            latest: result,
        };
    }
    const result = {
        workflow: workflow.name,
        status: "completed",
        outputDir,
        stages,
    };
    writeJsonFile(path.join(outputDir, "workflow-result.json"), result);
    writeWorkflowStatus(outputDir);
    return result;
}
