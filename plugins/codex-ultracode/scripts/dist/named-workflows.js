import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
function defaultPluginRoot() {
    return path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
}
export function defaultRegistryDir() {
    return path.join(defaultPluginRoot(), "skills/ultracode/workflows");
}
function readJsonFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function stringArray(value) {
    return Array.isArray(value)
        ? value.filter((entry) => typeof entry === "string")
        : [];
}
function readNestedString(value, keys) {
    let current = value;
    for (const key of keys) {
        if (!isPlainObject(current)) {
            return "";
        }
        current = current[key];
    }
    return typeof current === "string" ? current : "";
}
function stagePreviewFromWorkflow(workflow) {
    if (!Array.isArray(workflow.stages)) {
        return [];
    }
    return workflow.stages
        .filter((stage) => isPlainObject(stage))
        .map((stage, index) => {
        const name = typeof stage.name === "string" && stage.name.trim()
            ? stage.name
            : `stage-${index + 1}`;
        const agent = isPlainObject(stage.agent) ? stage.agent : {};
        const mode = agent.mode === "write" ? "write" : "read-only";
        return {
            name,
            mode,
            outputFile: readNestedString(stage, ["output", "file"]),
            dependsOn: stringArray(stage.dependsOn),
        };
    });
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
function hasEntries(value) {
    return value !== undefined && Object.keys(value).length > 0;
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
function workflowSummaryFromDir(workflowDir) {
    const workflowFile = path.join(workflowDir, "workflow.json");
    const paramTemplateFile = path.join(workflowDir, "param.template.json");
    if (!fs.existsSync(workflowFile) || !fs.existsSync(paramTemplateFile)) {
        return null;
    }
    const workflow = readJsonFile(workflowFile);
    const name = workflow.name || path.basename(workflowDir);
    const readmeFile = path.join(workflowDir, "README.md");
    const keywords = Array.isArray(workflow.keywords)
        ? workflow.keywords.filter((entry) => typeof entry === "string" && Boolean(entry.trim()))
        : undefined;
    const stagePlan = stagePreviewFromWorkflow(workflow);
    return {
        name,
        description: workflow.description,
        keywords,
        stagePlan,
        writeStages: stagePlan.filter((stage) => stage.mode === "write").map((stage) => stage.name),
        outputFiles: stagePlan.map((stage) => stage.outputFile).filter(Boolean),
        workflowFile,
        paramTemplateFile,
        readmeFile: fs.existsSync(readmeFile) ? readmeFile : undefined,
    };
}
export function listNamedWorkflows(options = {}) {
    const registryDir = options.registryDir ?? defaultRegistryDir();
    if (!fs.existsSync(registryDir)) {
        return [];
    }
    return fs
        .readdirSync(registryDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => workflowSummaryFromDir(path.join(registryDir, entry.name)))
        .filter((entry) => entry !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
}
export function resolveNamedWorkflow(workflowName, options = {}) {
    const workflows = listNamedWorkflows(options);
    const workflow = workflows.find((entry) => entry.name === workflowName);
    if (!workflow) {
        const names = workflows.map((entry) => entry.name).join(", ") || "<none>";
        throw new Error(`Unknown Ultracode workflow "${workflowName}". Available workflows: ${names}`);
    }
    return workflow;
}
export function readWorkflowReadme(workflow) {
    if (!workflow.readmeFile || !fs.existsSync(workflow.readmeFile)) {
        return undefined;
    }
    return fs.readFileSync(workflow.readmeFile, "utf8");
}
export function createParamFileFromTemplate(options) {
    const template = readJsonFile(options.templateFile);
    const userParams = options.params ?? {};
    const merged = deepMerge(template, userParams);
    if (options.intent?.trim()) {
        merged.intent = options.intent;
        merged.goal = options.intent;
    }
    const paramFile = path.join(options.outputDir, "param.generated.json");
    fs.mkdirSync(path.dirname(paramFile), { recursive: true });
    fs.writeFileSync(paramFile, `${JSON.stringify(merged, null, 2)}\n`);
    return { paramFile, params: merged };
}
export function writeApprovedNamedWorkflowFile(options) {
    const approvedNamedWorkflowFile = path.join(options.outputDir, "approved-named-workflow.json");
    const execution = cleanExecution(options.execution);
    const payload = {
        workflowName: options.workflowName,
        workflowFile: options.workflowFile,
        paramFile: options.paramFile,
        ...(options.intent?.trim() ? { intent: options.intent } : {}),
        createdAt: options.createdAt ?? new Date().toISOString(),
        ...(hasEntries(options.params) ? { params: options.params } : {}),
        ...(execution ? { execution } : {}),
    };
    fs.mkdirSync(options.outputDir, { recursive: true });
    fs.writeFileSync(approvedNamedWorkflowFile, `${JSON.stringify(payload, null, 2)}\n`);
    return {
        approvedNamedWorkflowFile,
        ...payload,
    };
}
