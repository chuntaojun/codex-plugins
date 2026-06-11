import fs from "node:fs";
import path from "node:path";
function hasEntries(value) {
    return value !== undefined && Object.keys(value).length > 0;
}
function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function deepMerge(base, override) {
    if (!isPlainObject(base) || !isPlainObject(override)) {
        return override;
    }
    const merged = { ...base };
    for (const [key, value] of Object.entries(override)) {
        merged[key] =
            key in merged ? deepMerge(merged[key], value) : value;
    }
    return merged;
}
function cleanExecution(execution) {
    if (!execution) {
        return undefined;
    }
    const cleaned = {};
    if (execution.outputDir !== undefined) {
        cleaned.outputDir = execution.outputDir;
    }
    if (execution.runId !== undefined) {
        cleaned.runId = execution.runId;
    }
    if (execution.worktreeDir !== undefined) {
        cleaned.worktreeDir = execution.worktreeDir;
    }
    return hasEntries(cleaned) ? cleaned : undefined;
}
export function writeDynamicPlanFile(options) {
    const execution = cleanExecution(options.execution);
    const payload = {
        intent: options.intent,
        createdAt: options.createdAt ?? new Date().toISOString(),
        ...(hasEntries(options.params) ? { params: options.params } : {}),
        ...(execution ? { execution } : {}),
        plan: options.plan,
    };
    fs.mkdirSync(path.dirname(options.planFile), { recursive: true });
    fs.writeFileSync(options.planFile, `${JSON.stringify(payload, null, 2)}\n`);
    return {
        planFile: options.planFile,
        ...payload,
    };
}
export function readDynamicPlanFile(planFile) {
    const payload = JSON.parse(fs.readFileSync(planFile, "utf8"));
    if (!payload.intent || typeof payload.intent !== "string") {
        throw new Error(`Invalid dynamic plan file: missing intent in ${planFile}`);
    }
    if (!payload.plan || typeof payload.plan !== "object") {
        throw new Error(`Invalid dynamic plan file: missing plan in ${planFile}`);
    }
    return {
        planFile,
        ...payload,
    };
}
export function resolveDynamicRunExecutionContext(options) {
    const runId = options.input.runId ?? options.planFile?.execution?.runId ?? options.defaultRunId;
    return {
        runId,
        outputDir: options.input.outputDir ?? options.planFile?.execution?.outputDir ?? `.ultracode/runs/${runId}`,
        worktreeDir: options.input.worktreeDir ?? options.planFile?.execution?.worktreeDir,
    };
}
export function resolveDynamicRunParams(options) {
    const savedParams = options.planFile?.params ?? {};
    const inputParams = options.inputParams ?? {};
    return deepMerge(savedParams, inputParams);
}
export function copyApprovedDynamicPlanFile(options) {
    const planFile = readDynamicPlanFile(options.planFile);
    const approvedPlanFile = path.join(options.outputDir, "approved-plan.json");
    const params = options.params ?? planFile.params;
    const execution = cleanExecution(options.execution) ?? planFile.execution;
    const payload = {
        sourcePlanFile: planFile.planFile,
        intent: planFile.intent,
        createdAt: planFile.createdAt,
        ...(hasEntries(params) ? { params } : {}),
        ...(hasEntries(execution) ? { execution } : {}),
        plan: planFile.plan,
    };
    fs.mkdirSync(options.outputDir, { recursive: true });
    fs.writeFileSync(approvedPlanFile, `${JSON.stringify(payload, null, 2)}\n`);
    return {
        approvedPlanFile,
        ...payload,
        planFile: planFile.planFile,
    };
}
