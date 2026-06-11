import fs from "node:fs";
import path from "node:path";
import { writeWorkflowStatus } from "./core/inspector.js";
import { runAgentStage, restartStage, reworkStage, } from "./core/stage.js";
import { createWorkflowContext } from "./core/workflow.js";
import { findTransitiveDependentStages } from "./workflow-deps.js";
function readJsonFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
function writeJsonFile(filePath, value) {
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
function workflowResultPath(outputDir) {
    return path.join(outputDir, "workflow-result.json");
}
function inferRepoRoot(outputDir) {
    const marker = `${path.sep}.ultracode${path.sep}runs${path.sep}`;
    const index = outputDir.indexOf(marker);
    if (index >= 0) {
        return outputDir.slice(0, index);
    }
    return process.cwd();
}
function loadWorkflowResult(outputDir) {
    return readJsonFile(workflowResultPath(outputDir));
}
function loadStageDefinition(previousResult) {
    return readJsonFile(path.join(previousResult.attemptDir, "stage.json"));
}
function loadStageInput(result) {
    return readJsonFile(result.inputFile);
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
        return renderString(fs.readFileSync(path.resolve(workflowDir, stage.promptFile), "utf8"), context);
    }
    if (!stage.prompt) {
        throw new Error(`Stage ${stage.name} must define prompt or promptFile`);
    }
    if (Array.isArray(stage.prompt)) {
        return stage.prompt.map((line) => renderString(line, context));
    }
    return renderString(stage.prompt, context);
}
function updateWorkflowResult(outputDir, workflowResult, stageName, nextStage) {
    const nextStageRun = {
        ...nextStage,
        input: loadStageInput(nextStage),
    };
    const index = workflowResult.stages.findIndex((stage) => stage.stage === stageName);
    if (index < 0) {
        throw new Error(`Stage not found in workflow result: ${stageName}`);
    }
    workflowResult.stages[index] = nextStageRun;
    writeJsonFile(workflowResultPath(outputDir), workflowResult);
    return nextStageRun;
}
function replaceWorkflowStage(workflowResult, stageName, nextStage) {
    const nextStageRun = {
        ...nextStage,
        input: loadStageInput(nextStage),
    };
    const index = workflowResult.stages.findIndex((stage) => stage.stage === stageName);
    if (index < 0) {
        throw new Error(`Stage not found in workflow result: ${stageName}`);
    }
    workflowResult.stages[index] = nextStageRun;
    return nextStageRun;
}
function createContext(options) {
    return createWorkflowContext({
        repoRoot: options.repoRoot ?? inferRepoRoot(options.outputDir),
        workflow: options.workflow,
        goal: options.workflow,
        mode: options.stage.agent.mode === "write" ? "write" : "read-only",
        outputDir: options.outputDir,
    });
}
function findPreviousResult(workflowResult, stageName) {
    const previousResult = workflowResult.stages.find((stage) => stage.stage === stageName);
    if (!previousResult) {
        const names = workflowResult.stages.map((stage) => stage.stage).join(", ") || "<none>";
        throw new Error(`Unknown stage "${stageName}". Available stages: ${names}`);
    }
    return previousResult;
}
function workflowDefinitionPath(outputDir) {
    return path.join(outputDir, "workflow.json");
}
function paramPath(outputDir) {
    return path.join(outputDir, "param.json");
}
async function cascadeDownstreamStages(options) {
    const workflowFile = workflowDefinitionPath(options.outputDir);
    const paramFile = paramPath(options.outputDir);
    if (!fs.existsSync(workflowFile) || !fs.existsSync(paramFile)) {
        return [];
    }
    const workflow = readJsonFile(workflowFile);
    const params = readJsonFile(paramFile);
    if (!workflow.stages.some((stage) => stage.name === options.startAfterStageName)) {
        return [];
    }
    const workflowDir = path.dirname(workflowFile);
    const repoRoot = options.repoRoot ?? inferRepoRoot(options.outputDir);
    const stageContext = {};
    for (const stageRun of options.workflowResult.stages) {
        stageContext[stageRun.stage] = { latest: stageRun };
    }
    const cascadedStages = [];
    for (const stage of findTransitiveDependentStages(workflow.stages, options.startAfterStageName)) {
        const previousResult = findPreviousResult(options.workflowResult, stage.name);
        const previousStageDefinition = loadStageDefinition(previousResult);
        const context = {
            params,
            stages: stageContext,
        };
        const input = (stage.input ? renderValue(stage.input, context) : {});
        const renderedStage = {
            index: previousStageDefinition.index,
            name: stage.name,
            input,
            prompt: renderPrompt(stage, workflowDir, context),
            agent: {
                label: stage.agent?.label ?? stage.name,
                mode: stage.agent?.mode,
                outputFile: stage.output.file,
                outputSchema: stage.agent?.outputSchema ?? stage.output.schema,
            },
            gate: stage.gate,
        };
        const ctx = createWorkflowContext({
            repoRoot,
            workflow: options.workflowResult.workflow,
            goal: options.workflowResult.workflow,
            mode: renderedStage.agent.mode === "write" ? "write" : "read-only",
            outputDir: options.outputDir,
        });
        const nextStage = await runAgentStage({
            ctx,
            stage: renderedStage,
            attempt: previousResult.attempt + 1,
            inputOverride: input,
            runAgent: options.runAgent,
        });
        const stageRun = replaceWorkflowStage(options.workflowResult, stage.name, nextStage);
        stageContext[stage.name] = { latest: stageRun };
        cascadedStages.push(stageRun);
    }
    return cascadedStages;
}
export async function restartWorkflowStage(options) {
    const outputDir = path.resolve(options.outputDir);
    const workflowResult = loadWorkflowResult(outputDir);
    const previousResult = findPreviousResult(workflowResult, options.stageName);
    const stage = loadStageDefinition(previousResult);
    const ctx = createContext({
        outputDir,
        repoRoot: options.repoRoot,
        workflow: workflowResult.workflow,
        stage,
    });
    const nextStage = await restartStage({
        ctx,
        stage,
        previousResult,
        runAgent: options.runAgent,
    });
    const stageRun = replaceWorkflowStage(workflowResult, options.stageName, nextStage);
    const cascadedStages = options.cascade
        ? await cascadeDownstreamStages({
            outputDir,
            repoRoot: options.repoRoot,
            workflowResult,
            startAfterStageName: options.stageName,
            runAgent: options.runAgent,
        })
        : [];
    writeJsonFile(workflowResultPath(outputDir), workflowResult);
    const status = writeWorkflowStatus(outputDir);
    return {
        workflow: workflowResult.workflow,
        outputDir,
        stage: stageRun,
        cascadedStages,
        status,
    };
}
export async function reworkWorkflowStage(options) {
    const outputDir = path.resolve(options.outputDir);
    const workflowResult = loadWorkflowResult(outputDir);
    const previousResult = findPreviousResult(workflowResult, options.stageName);
    const stage = loadStageDefinition(previousResult);
    const ctx = createContext({
        outputDir,
        repoRoot: options.repoRoot,
        workflow: workflowResult.workflow,
        stage,
    });
    const nextStage = await reworkStage({
        ctx,
        stage,
        previousResult,
        feedback: options.feedback,
        runAgent: options.runAgent,
    });
    const stageRun = replaceWorkflowStage(workflowResult, options.stageName, nextStage);
    const cascadedStages = options.cascade
        ? await cascadeDownstreamStages({
            outputDir,
            repoRoot: options.repoRoot,
            workflowResult,
            startAfterStageName: options.stageName,
            runAgent: options.runAgent,
        })
        : [];
    writeJsonFile(workflowResultPath(outputDir), workflowResult);
    const status = writeWorkflowStatus(outputDir);
    return {
        workflow: workflowResult.workflow,
        outputDir,
        stage: stageRun,
        cascadedStages,
        status,
    };
}
