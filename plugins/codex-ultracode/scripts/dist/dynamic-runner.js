import fs from "node:fs";
import path from "node:path";
import { validateWorkflowDependencies } from "./workflow-deps.js";
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isSafeRelativeOutputFile(file) {
    if (!file.trim() || path.isAbsolute(file)) {
        return false;
    }
    const normalized = path.normalize(file);
    return (normalized !== "." &&
        !normalized.startsWith("..") &&
        !path.isAbsolute(normalized));
}
export function validateDynamicWorkflow(workflow) {
    const errors = [];
    if (!isRecord(workflow)) {
        return { valid: false, errors: ["Workflow must be an object."] };
    }
    if (typeof workflow.name !== "string" || !workflow.name.trim()) {
        errors.push("Workflow name must be a non-empty string.");
    }
    if (!Array.isArray(workflow.stages) || workflow.stages.length === 0) {
        errors.push("Workflow stages must be a non-empty array.");
        return { valid: false, errors };
    }
    const seenStageNames = new Set();
    for (const [index, stage] of workflow.stages.entries()) {
        const label = `Stage ${index + 1}`;
        if (!isRecord(stage)) {
            errors.push(`${label} must be an object.`);
            continue;
        }
        const stageName = typeof stage.name === "string" ? stage.name.trim() : "";
        if (!stageName) {
            errors.push(`${label} name must be a non-empty string.`);
        }
        else if (seenStageNames.has(stageName)) {
            errors.push(`${label} has duplicate stage name "${stageName}".`);
        }
        if (stage.type !== "codex") {
            errors.push(`${label} has Unsupported stage type "${String(stage.type)}".`);
        }
        if ("gate" in stage) {
            errors.push(`${label} must not define gate commands in a dynamic workflow.`);
        }
        if (!isRecord(stage.input)) {
            errors.push(`${label} input must be an object.`);
        }
        if (!Array.isArray(stage.prompt) ||
            stage.prompt.length === 0 ||
            !stage.prompt.every((entry) => typeof entry === "string" && entry.trim())) {
            errors.push(`${label} prompt must be a non-empty string array.`);
        }
        if (stage.agent != null) {
            if (!isRecord(stage.agent)) {
                errors.push(`${label} agent must be an object when present.`);
            }
            else if (stage.agent.mode != null &&
                stage.agent.mode !== "read-only" &&
                stage.agent.mode !== "write") {
                errors.push(`${label} agent.mode must be "read-only" or "write".`);
            }
        }
        if (!isRecord(stage.output) || typeof stage.output.file !== "string") {
            errors.push(`${label} output.file must be a string.`);
        }
        else if (!isSafeRelativeOutputFile(stage.output.file)) {
            errors.push(`${label} output.file must be a safe relative path.`);
        }
        if (stage.dependsOn != null) {
            if (!Array.isArray(stage.dependsOn)) {
                errors.push(`${label} dependsOn must be an array when present.`);
            }
            else {
                for (const dependency of stage.dependsOn) {
                    if (typeof dependency !== "string" || !dependency.trim()) {
                        errors.push(`${label} dependsOn entries must be non-empty strings.`);
                    }
                }
            }
        }
        if (stageName) {
            seenStageNames.add(stageName);
        }
    }
    const dependencyValidation = validateWorkflowDependencies(workflow.stages.filter(isRecord).map((stage) => ({
        name: typeof stage.name === "string" ? stage.name : "",
        dependsOn: Array.isArray(stage.dependsOn)
            ? stage.dependsOn.filter((dependency) => typeof dependency === "string")
            : stage.dependsOn === undefined
                ? undefined
                : [],
    })));
    errors.push(...dependencyValidation.errors);
    return { valid: errors.length === 0, errors };
}
export function createDynamicWorkflowFiles(options) {
    const validation = validateDynamicWorkflow(options.workflow);
    if (!validation.valid) {
        throw new Error(`Invalid dynamic workflow: ${validation.errors.join("; ")}`);
    }
    const workflowFile = path.join(options.outputDir, "workflow.dynamic.json");
    const paramFile = path.join(options.outputDir, "param.dynamic.json");
    const params = {
        ...(options.params ?? {}),
        mode: "read-only",
        goal: options.intent,
        intent: options.intent,
    };
    fs.mkdirSync(options.outputDir, { recursive: true });
    fs.writeFileSync(workflowFile, `${JSON.stringify(options.workflow, null, 2)}\n`);
    fs.writeFileSync(paramFile, `${JSON.stringify(params, null, 2)}\n`);
    return { workflowFile, paramFile, validation };
}
