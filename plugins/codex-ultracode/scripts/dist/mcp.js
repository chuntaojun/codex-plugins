import path from "node:path";
import readline from "node:readline";
import { configureTraceOutput } from "./core/events.js";
import { prepareRunWorktree, } from "./core/git-worktree.js";
import { inspectWorkflowReport, inspectWorkflowStatus, inspectWorkflowTail, } from "./core/inspector.js";
import { planDynamicWorkflow } from "./dynamic-planner.js";
import { copyApprovedDynamicPlanFile, readDynamicPlanFile, resolveDynamicRunExecutionContext, resolveDynamicRunParams, writeDynamicPlanFile, } from "./dynamic-plan-file.js";
import { createDynamicWorkflowFiles, } from "./dynamic-runner.js";
import { runJsonWorkflow, } from "./json-runner.js";
import { createParamFileFromTemplate, listNamedWorkflows, readWorkflowReadme, resolveNamedWorkflow, writeApprovedNamedWorkflowFile, } from "./named-workflows.js";
import { restartWorkflowStage, reworkWorkflowStage, } from "./workflow-actions.js";
import { getRunArtifact, listRuns, pruneRuns, resolveRunOutputDir, } from "./run-registry.js";
const SUPPORTED_PROTOCOL_VERSIONS = new Set([
    "2025-11-25",
    "2025-06-18",
    "2025-03-26",
    "2024-11-05",
]);
const DEFAULT_PROTOCOL_VERSION = "2025-11-25";
function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, "-");
}
function slugifyPlanIntent(intent) {
    return (intent
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "dynamic-workflow");
}
function defaultDynamicPlanPath(intent) {
    return path.join(".ultracode", "plans", `${slugifyPlanIntent(intent)}-${timestamp()}.plan.json`);
}
function compactObject(value) {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
function createWorkflowInspectionLinks(options) {
    const stages = (options.stages ?? []).map((stage) => {
        const artifact = compactObject({
            outputFile: stage.outputFile,
            resultFile: stage.resultFile,
            attemptDir: stage.attemptDir,
            stageDir: stage.stageDir,
            sessionId: stage.sessionId,
        });
        const link = {
            stageName: stage.stage,
            status: stage.status,
            attempt: stage.attempt,
            restartStage: {
                tool: "ultracode_restart_stage",
                arguments: {
                    cwd: options.cwd,
                    runId: options.runId,
                    stageName: stage.stage,
                },
            },
            reworkStage: {
                tool: "ultracode_rework_stage",
                arguments: {
                    cwd: options.cwd,
                    runId: options.runId,
                    stageName: stage.stage,
                    feedback: {
                        comments: ["<feedback>"],
                    },
                },
            },
        };
        if (Object.keys(artifact).length > 0) {
            link.artifact = artifact;
        }
        return link;
    });
    const nextActions = [
        "Call ultracode_status with inspection.status.arguments to display run progress.",
        "Call ultracode_tail with inspection.tail.arguments when recent events are useful.",
        "Call ultracode_report with inspection.report.arguments when the run is completed.",
        "Call ultracode_artifact with inspection.artifact.arguments to preview the final artifact.",
        "Use inspection.restartStage.arguments as a template when a stage should be retried.",
        "Use inspection.reworkStage.arguments as a template when reviewer feedback should be applied.",
    ];
    if (stages.length > 0) {
        nextActions.push("Use inspection.stages to select concrete per-stage restart/rework arguments.");
    }
    if (options.approvedPlanFile) {
        nextActions.push("Use inspection.approvedPlanFile as the audit record for the approved dynamic plan.");
    }
    if (options.approvedNamedWorkflowFile) {
        nextActions.push("Use inspection.approvedNamedWorkflowFile as the audit record for the approved named workflow.");
    }
    const inspection = {
        runId: options.runId,
        outputDir: options.outputDir,
        status: {
            tool: "ultracode_status",
            arguments: {
                cwd: options.cwd,
                runId: options.runId,
            },
        },
        tail: {
            tool: "ultracode_tail",
            arguments: {
                cwd: options.cwd,
                runId: options.runId,
                limit: 20,
            },
        },
        report: {
            tool: "ultracode_report",
            arguments: {
                cwd: options.cwd,
                runId: options.runId,
            },
        },
        artifact: {
            tool: "ultracode_artifact",
            arguments: {
                cwd: options.cwd,
                runId: options.runId,
            },
        },
        restartStage: {
            tool: "ultracode_restart_stage",
            arguments: {
                cwd: options.cwd,
                runId: options.runId,
                stageName: "<stage-name>",
            },
        },
        reworkStage: {
            tool: "ultracode_rework_stage",
            arguments: {
                cwd: options.cwd,
                runId: options.runId,
                stageName: "<stage-name>",
                feedback: {
                    comments: ["<feedback>"],
                },
            },
        },
        nextActions,
    };
    if (options.approvedPlanFile) {
        inspection.approvedPlanFile = options.approvedPlanFile;
    }
    if (options.approvedNamedWorkflowFile) {
        inspection.approvedNamedWorkflowFile = options.approvedNamedWorkflowFile;
    }
    if (stages.length > 0) {
        inspection.stages = stages;
    }
    return inspection;
}
function createDynamicExecutionAfterApproval(options) {
    const args = {
        cwd: options.cwd,
        approved: true,
        planFile: options.planFile,
    };
    if (options.params) {
        args.params = options.params;
    }
    if (options.outputDir) {
        args.outputDir = options.outputDir;
    }
    if (options.runId) {
        args.runId = options.runId;
    }
    if (options.worktreeDir) {
        args.worktreeDir = options.worktreeDir;
    }
    return {
        tool: "ultracode_run_dynamic",
        arguments: args,
        confirmationGate: "Only call this after the user has approved the dynamic workflow preview.",
    };
}
function createNamedWorkflowExecution(options) {
    const args = {
        cwd: options.cwd,
        workflowName: options.workflowName,
        intent: options.intent,
    };
    if (options.params) {
        args.params = options.params;
    }
    if (options.outputDir) {
        args.outputDir = options.outputDir;
    }
    if (options.runId) {
        args.runId = options.runId;
    }
    if (options.worktreeDir) {
        args.worktreeDir = options.worktreeDir;
    }
    if (options.registryDir) {
        args.registryDir = options.registryDir;
    }
    return {
        tool: "ultracode_run_named",
        arguments: args,
        approvalRequired: false,
        reason: options.reason,
    };
}
function createNamedExecutionAfterApproval(options) {
    const args = {
        cwd: options.cwd,
        workflowName: options.workflowName,
        intent: options.intent,
        approved: true,
    };
    if (options.params) {
        args.params = options.params;
    }
    if (options.outputDir) {
        args.outputDir = options.outputDir;
    }
    if (options.runId) {
        args.runId = options.runId;
    }
    if (options.worktreeDir) {
        args.worktreeDir = options.worktreeDir;
    }
    if (options.registryDir) {
        args.registryDir = options.registryDir;
    }
    return {
        tool: "ultracode_run_named",
        arguments: args,
        confirmationGate: "Only call this after the user has approved the named workflow preview.",
    };
}
function createNamedWorkflowPreview(workflow, options) {
    const stagePlan = workflow.stagePlan ?? [];
    const writeStages = workflow.writeStages ?? [];
    const outputFiles = workflow.outputFiles ?? stagePlan.map((stage) => stage.outputFile).filter(Boolean);
    const risks = [
        writeStages.length > 0
            ? "Includes write-mode stages. Review the requested repository changes before approving execution."
            : "No write-mode stages were detected in the registered workflow.",
        "Registered workflow preview. Confirm the workflow name, stages, and expected outputs before execution.",
    ];
    let confirmationPrompt;
    if (options.followUp === "execution") {
        confirmationPrompt =
            "No approval is required for this read-only named workflow. Call ultracode_run_named with execution.arguments when ready.";
    }
    else if (options.followUp === "executionAfterApproval") {
        confirmationPrompt =
            "Approve this named workflow preview before calling ultracode_run_named with executionAfterApproval.arguments.";
    }
    else if (writeStages.length > 0) {
        confirmationPrompt =
            "Approval is required for this write-capable named workflow, but no ready-to-call executionAfterApproval arguments were returned because cwd was omitted. Re-run ultracode_plan_dynamic with cwd before execution.";
    }
    else {
        confirmationPrompt =
            "No approval is required, but no ready-to-call execution arguments were returned because cwd was omitted. Re-run ultracode_plan_dynamic with cwd to get execution.arguments.";
    }
    return {
        template: "named-workflow",
        summary: `${workflow.name} is a registered named workflow with ${stagePlan.length} stage${stagePlan.length === 1 ? "" : "s"}.`,
        description: workflow.description,
        stageCount: stagePlan.length,
        writeStages,
        outputFiles,
        stagePlan,
        risks,
        confirmationPrompt,
    };
}
function createStageActionPayload(rawInput, result) {
    const cwd = optionalString(rawInput, "cwd");
    const runId = optionalString(rawInput, "runId");
    const payload = result;
    if (!cwd || !runId) {
        return payload;
    }
    return {
        ...payload,
        inspection: createWorkflowInspectionLinks({
            cwd: path.resolve(cwd),
            runId,
            outputDir: result.outputDir,
            stages: [result.stage, ...result.cascadedStages],
        }),
    };
}
const RUN_WORKFLOW_TOOL = {
    name: "ultracode_run",
    description: "Run a JSON-defined Codex workflow through ultracode's runtime in an isolated git worktree.",
    inputSchema: {
        type: "object",
        properties: {
            cwd: {
                type: "string",
                description: "Repository checkout directory to start from. Pass the current Codex workspace root.",
            },
            workflowFile: {
                type: "string",
                description: "Workflow JSON path, resolved relative to cwd unless absolute.",
            },
            paramFile: {
                type: "string",
                description: "Parameter JSON path, resolved relative to cwd unless absolute.",
            },
            outputDir: {
                type: "string",
                description: "Optional artifact directory, resolved inside the prepared run worktree. Defaults to .ultracode/runs/<run-id>.",
            },
            runId: {
                type: "string",
                description: "Optional stable run id used for the branch, worktree directory, and default outputDir.",
            },
            worktreeDir: {
                type: "string",
                description: "Optional explicit run worktree directory.",
            },
        },
        required: ["cwd", "workflowFile", "paramFile"],
        additionalProperties: false,
    },
};
const RUN_NAMED_WORKFLOW_TOOL = {
    name: "ultracode_run_named",
    description: "Run a named Ultracode workflow by workflow name and task intent. Use this instead of file paths when a registered workflow fits the user request.",
    inputSchema: {
        type: "object",
        properties: {
            cwd: {
                type: "string",
                description: "Repository checkout directory to start from. Pass the current Codex workspace root.",
            },
            workflowName: {
                type: "string",
                description: "Registered workflow name, such as travel-guide.",
            },
            intent: {
                type: "string",
                description: "Natural-language user intent to preserve in the generated parameter file.",
            },
            params: {
                type: "object",
                description: "Optional structured parameters to merge over the workflow parameter template.",
            },
            outputDir: {
                type: "string",
                description: "Optional artifact directory, resolved inside the prepared run worktree. Defaults to .ultracode/runs/<run-id>.",
            },
            runId: {
                type: "string",
                description: "Optional stable run id used for the branch, worktree directory, and default outputDir.",
            },
            worktreeDir: {
                type: "string",
                description: "Optional explicit run worktree directory.",
            },
            registryDir: {
                type: "string",
                description: "Optional named workflow registry directory for development or tests.",
            },
            approved: {
                type: "boolean",
                description: "Must be true when running a write-capable named workflow after the user approved its preview. Read-only named workflows do not require it.",
            },
        },
        required: ["cwd", "workflowName"],
        additionalProperties: false,
    },
};
const LIST_WORKFLOWS_TOOL = {
    name: "ultracode_list_workflows",
    description: "List registered Ultracode named workflows.",
    inputSchema: {
        type: "object",
        properties: {
            registryDir: {
                type: "string",
                description: "Optional named workflow registry directory for development or tests.",
            },
        },
        additionalProperties: false,
    },
};
const DESCRIBE_WORKFLOW_TOOL = {
    name: "ultracode_describe_workflow",
    description: "Describe a registered Ultracode named workflow and include its README when present.",
    inputSchema: {
        type: "object",
        properties: {
            workflowName: {
                type: "string",
                description: "Registered workflow name, such as travel-guide.",
            },
            registryDir: {
                type: "string",
                description: "Optional named workflow registry directory for development or tests.",
            },
        },
        required: ["workflowName"],
        additionalProperties: false,
    },
};
const DISPATCH_INTENT_TOOL = {
    name: "ultracode_dispatch",
    description: "Handle an open-ended Ultracode task intent in one call. Runs a matching read-only named workflow immediately, returns a confirmation preview for a write-capable named workflow, or returns a dynamic workflow preview when no registered workflow fits.",
    inputSchema: {
        type: "object",
        properties: {
            cwd: {
                type: "string",
                description: "Repository checkout directory to start from. Pass the current Codex workspace root.",
            },
            intent: {
                type: "string",
                description: "Natural-language user task request.",
            },
            params: {
                type: "object",
                description: "Optional structured parameters to merge into a named workflow parameter template or dynamic workflow params.",
            },
            outputDir: {
                type: "string",
                description: "Optional artifact directory when a named workflow is run. Resolved inside the prepared run worktree.",
            },
            outputPlan: {
                type: "string",
                description: "Optional deterministic plan artifact path when the request needs a dynamic workflow preview.",
            },
            runId: {
                type: "string",
                description: "Optional stable run id when a named workflow is run.",
            },
            worktreeDir: {
                type: "string",
                description: "Optional explicit run worktree directory when a named workflow is run.",
            },
            registryDir: {
                type: "string",
                description: "Optional named workflow registry directory for development or tests.",
            },
        },
        required: ["cwd", "intent"],
        additionalProperties: false,
    },
};
const PLAN_DYNAMIC_WORKFLOW_TOOL = {
    name: "ultracode_plan_dynamic",
    description: "Plan how Ultracode should handle a task intent. Recommends a named workflow when possible, otherwise returns a constrained dynamic workflow preview without executing it.",
    inputSchema: {
        type: "object",
        properties: {
            intent: {
                type: "string",
                description: "Natural-language user task request.",
            },
            cwd: {
                type: "string",
                description: "Optional repository checkout directory. Pass the current Codex workspace root so named workflow recommendations and dynamic previews can return ready-to-call execution arguments, and dynamic previews can save default plan artifacts.",
            },
            outputPlan: {
                type: "string",
                description: "Optional path for a reusable plan artifact. Relative paths require cwd. If omitted, Ultracode writes a default artifact only for review_dynamic previews when cwd is provided, not for run_named recommendations.",
            },
            registryDir: {
                type: "string",
                description: "Optional named workflow registry directory for development or tests.",
            },
            params: {
                type: "object",
                description: "Optional structured parameters to include when a named workflow is recommended or when a dynamic workflow is approved.",
            },
            outputDir: {
                type: "string",
                description: "Optional artifact directory to preserve in approved dynamic execution arguments.",
            },
            runId: {
                type: "string",
                description: "Optional stable run id to preserve in approved dynamic execution arguments.",
            },
            worktreeDir: {
                type: "string",
                description: "Optional explicit run worktree directory to preserve in approved dynamic execution arguments.",
            },
        },
        required: ["intent"],
        additionalProperties: false,
    },
};
const RUN_DYNAMIC_WORKFLOW_TOOL = {
    name: "ultracode_run_dynamic",
    description: "Run an approved dynamic Ultracode workflow preview from a reviewed plan file. Only call this after the user has reviewed and approved the preview returned by ultracode_plan_dynamic or ultracode_dispatch. The run writes approved-plan.json with the effective params and execution context used for this run.",
    inputSchema: {
        type: "object",
        properties: {
            cwd: {
                type: "string",
                description: "Repository checkout directory to start from. Pass the current Codex workspace root.",
            },
            approved: {
                type: "boolean",
                description: "Must be true. Confirms the dynamic workflow preview was reviewed and approved.",
            },
            planFile: {
                type: "string",
                description: "Dynamic plan artifact returned by ultracode_plan_dynamic or ultracode_dispatch. Workflow, intent, and saved preview context are read from this reviewed plan file.",
            },
            params: {
                type: "object",
                description: "Optional structured parameters to include in param.dynamic.json. Saved plan-file params are used as the base when present; explicit object fields deep-merge over them, while arrays and non-objects override.",
            },
            outputDir: {
                type: "string",
                description: "Optional artifact directory, resolved inside the prepared run worktree. If omitted, saved plan-file outputDir is reused when present; otherwise defaults to .ultracode/runs/<run-id>.",
            },
            runId: {
                type: "string",
                description: "Optional stable run id used for the branch, worktree directory, and default outputDir. If omitted, saved plan-file runId is reused when present.",
            },
            worktreeDir: {
                type: "string",
                description: "Optional explicit run worktree directory. If omitted, saved plan-file worktreeDir is reused when present.",
            },
        },
        required: ["cwd", "approved", "planFile"],
        additionalProperties: false,
    },
};
const WORKFLOW_STATUS_TOOL = {
    name: "ultracode_status",
    description: "Read a workflow run status summary from an artifact directory or run id.",
    inputSchema: {
        type: "object",
        properties: {
            outputDir: {
                type: "string",
                description: "Workflow run artifact directory containing workflow-result.json.",
            },
            cwd: {
                type: "string",
                description: "Repository checkout directory to scan from when using runId.",
            },
            runId: {
                type: "string",
                description: "Run id to inspect when outputDir is not provided.",
            },
        },
        additionalProperties: false,
    },
};
const RESTART_STAGE_TOOL = {
    name: "ultracode_restart_stage",
    description: "Restart a workflow stage by creating the next attempt with the same input as the latest attempt. Accepts an artifact directory or run id.",
    inputSchema: {
        type: "object",
        properties: {
            outputDir: {
                type: "string",
                description: "Workflow run artifact directory containing workflow-result.json.",
            },
            cwd: {
                type: "string",
                description: "Repository checkout directory to scan from when using runId.",
            },
            runId: {
                type: "string",
                description: "Run id to restart when outputDir is not provided.",
            },
            stageName: {
                type: "string",
                description: "Stage name to restart, such as draft-itinerary.",
            },
            cascade: {
                type: "boolean",
                description: "When true, rerun downstream stages after this stage with updated inputs.",
            },
        },
        required: ["stageName"],
        additionalProperties: false,
    },
};
const REWORK_STAGE_TOOL = {
    name: "ultracode_rework_stage",
    description: "Rework a workflow stage by creating the next attempt with structured feedback added to input.rework. Accepts an artifact directory or run id.",
    inputSchema: {
        type: "object",
        properties: {
            outputDir: {
                type: "string",
                description: "Workflow run artifact directory containing workflow-result.json.",
            },
            cwd: {
                type: "string",
                description: "Repository checkout directory to scan from when using runId.",
            },
            runId: {
                type: "string",
                description: "Run id to rework when outputDir is not provided.",
            },
            stageName: {
                type: "string",
                description: "Stage name to rework, such as draft-itinerary.",
            },
            feedback: {
                type: "object",
                description: "Structured feedback to include in the next attempt input.",
            },
            cascade: {
                type: "boolean",
                description: "When true, rerun downstream stages after this stage with updated inputs.",
            },
        },
        required: ["stageName", "feedback"],
        additionalProperties: false,
    },
};
const LIST_RUNS_TOOL = {
    name: "ultracode_list_runs",
    description: "List recent Ultracode runs from the current checkout and sibling run worktrees.",
    inputSchema: {
        type: "object",
        properties: {
            cwd: {
                type: "string",
                description: "Repository checkout directory to scan from.",
            },
            limit: {
                type: "number",
                description: "Maximum number of runs to return. Defaults to 20.",
            },
        },
        required: ["cwd"],
        additionalProperties: false,
    },
};
const RUN_ARTIFACT_TOOL = {
    name: "ultracode_artifact",
    description: "Return the final artifact path and preview for a run id.",
    inputSchema: {
        type: "object",
        properties: {
            cwd: {
                type: "string",
                description: "Repository checkout directory to scan from.",
            },
            runId: {
                type: "string",
                description: "Run id to inspect.",
            },
        },
        required: ["cwd", "runId"],
        additionalProperties: false,
    },
};
const PRUNE_RUNS_TOOL = {
    name: "ultracode_prune_runs",
    description: "Remove selected Ultracode run artifact directories by run id. By default it does not remove sibling run worktrees; set removeWorktrees=true to remove them explicitly.",
    inputSchema: {
        type: "object",
        properties: {
            cwd: {
                type: "string",
                description: "Repository checkout directory to scan from.",
            },
            runIds: {
                type: "array",
                items: { type: "string" },
                description: "Run ids to remove.",
            },
            removeWorktrees: {
                type: "boolean",
                description: "When true, also remove matching sibling <repo>.worktrees/<run-id> directories for worktree-backed runs.",
            },
        },
        required: ["cwd", "runIds"],
        additionalProperties: false,
    },
};
const WORKFLOW_TAIL_TOOL = {
    name: "ultracode_tail",
    description: "Read recent workflow trace events from an artifact directory or run id.",
    inputSchema: {
        type: "object",
        properties: {
            outputDir: {
                type: "string",
                description: "Workflow run artifact directory containing trace.jsonl.",
            },
            cwd: {
                type: "string",
                description: "Repository checkout directory to scan from when using runId.",
            },
            runId: {
                type: "string",
                description: "Run id to inspect when outputDir is not provided.",
            },
            limit: {
                type: "number",
                description: "Maximum number of recent events to return. Defaults to 20.",
            },
        },
        additionalProperties: false,
    },
};
const WORKFLOW_REPORT_TOOL = {
    name: "ultracode_report",
    description: "Read a concise final workflow report from an artifact directory or run id.",
    inputSchema: {
        type: "object",
        properties: {
            outputDir: {
                type: "string",
                description: "Workflow run artifact directory containing workflow-result.json.",
            },
            cwd: {
                type: "string",
                description: "Repository checkout directory to scan from when using runId.",
            },
            runId: {
                type: "string",
                description: "Run id to inspect when outputDir is not provided.",
            },
        },
        additionalProperties: false,
    },
};
const TOOLS = [
    RUN_WORKFLOW_TOOL,
    RUN_NAMED_WORKFLOW_TOOL,
    LIST_WORKFLOWS_TOOL,
    DESCRIBE_WORKFLOW_TOOL,
    DISPATCH_INTENT_TOOL,
    PLAN_DYNAMIC_WORKFLOW_TOOL,
    RUN_DYNAMIC_WORKFLOW_TOOL,
    RESTART_STAGE_TOOL,
    REWORK_STAGE_TOOL,
    LIST_RUNS_TOOL,
    RUN_ARTIFACT_TOOL,
    PRUNE_RUNS_TOOL,
    WORKFLOW_STATUS_TOOL,
    WORKFLOW_TAIL_TOOL,
    WORKFLOW_REPORT_TOOL,
];
function contentResult(text, structuredContent = {}, isError = false) {
    return {
        content: [{ type: "text", text }],
        structuredContent,
        isError,
    };
}
function errorResponse(id, code, message) {
    return {
        jsonrpc: "2.0",
        id,
        error: { code, message },
    };
}
function handleInitialize(params = {}) {
    const requestedVersion = typeof params.protocolVersion === "string" && SUPPORTED_PROTOCOL_VERSIONS.has(params.protocolVersion)
        ? params.protocolVersion
        : DEFAULT_PROTOCOL_VERSION;
    return {
        protocolVersion: requestedVersion,
        capabilities: {
            tools: {},
        },
        serverInfo: {
            name: "ultracode",
            version: "0.1.0",
        },
    };
}
function requireString(input, key) {
    const value = input[key];
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`${key} must be a non-empty string.`);
    }
    return value;
}
function optionalString(input, key) {
    const value = input[key];
    if (value == null) {
        return undefined;
    }
    if (typeof value !== "string") {
        throw new Error(`${key} must be a string.`);
    }
    return value;
}
function optionalParams(input) {
    const value = input.params;
    if (value == null) {
        return undefined;
    }
    if (typeof value !== "object" || Array.isArray(value)) {
        throw new Error("params must be an object.");
    }
    return value;
}
function requireBoolean(input, key) {
    const value = input[key];
    if (typeof value !== "boolean") {
        throw new Error(`${key} must be a boolean.`);
    }
    return value;
}
function optionalBoolean(input, key) {
    const value = input[key];
    if (value == null) {
        return undefined;
    }
    if (typeof value !== "boolean") {
        throw new Error(`${key} must be a boolean.`);
    }
    return value;
}
function requireRecord(input, key) {
    const value = input[key];
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`${key} must be an object.`);
    }
    return value;
}
function requireStringArray(input, key) {
    const value = input[key];
    if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string" && entry.trim())) {
        throw new Error(`${key} must be an array of non-empty strings.`);
    }
    return value;
}
function buildRunWorkflowInput(input) {
    return {
        cwd: path.resolve(requireString(input, "cwd")),
        workflowFile: requireString(input, "workflowFile"),
        paramFile: requireString(input, "paramFile"),
        outputDir: optionalString(input, "outputDir"),
        runId: optionalString(input, "runId"),
        worktreeDir: optionalString(input, "worktreeDir"),
    };
}
function buildRunNamedWorkflowInput(input) {
    return {
        cwd: path.resolve(requireString(input, "cwd")),
        workflowName: requireString(input, "workflowName"),
        intent: optionalString(input, "intent"),
        params: optionalParams(input),
        outputDir: optionalString(input, "outputDir"),
        runId: optionalString(input, "runId"),
        worktreeDir: optionalString(input, "worktreeDir"),
        registryDir: optionalString(input, "registryDir"),
        approved: optionalBoolean(input, "approved"),
    };
}
function buildRunDynamicWorkflowInput(input) {
    const planFile = optionalString(input, "planFile");
    if (!planFile) {
        throw new Error("ultracode_run_dynamic requires planFile so execution uses a reviewed dynamic plan.");
    }
    return {
        cwd: path.resolve(requireString(input, "cwd")),
        approved: requireBoolean(input, "approved"),
        planFile,
        params: optionalParams(input),
        outputDir: optionalString(input, "outputDir"),
        runId: optionalString(input, "runId"),
        worktreeDir: optionalString(input, "worktreeDir"),
    };
}
function buildDispatchIntentInput(input) {
    return {
        cwd: path.resolve(requireString(input, "cwd")),
        intent: requireString(input, "intent"),
        params: optionalParams(input),
        outputDir: optionalString(input, "outputDir"),
        outputPlan: optionalString(input, "outputPlan"),
        runId: optionalString(input, "runId"),
        worktreeDir: optionalString(input, "worktreeDir"),
        registryDir: optionalString(input, "registryDir"),
    };
}
function resolveDynamicPlanForMcpRun(options) {
    const readPlan = options.dependencies.readDynamicPlanFile ?? readDynamicPlanFile;
    const planFile = readPlan(path.resolve(options.input.cwd, options.input.planFile));
    if (planFile.plan.recommendedAction !== "review_dynamic") {
        throw new Error("Dynamic plan file does not contain a review_dynamic workflow.");
    }
    return {
        intent: planFile.intent,
        workflow: planFile.plan.workflow,
        planFile,
    };
}
async function handleRunWorkflowTool(rawInput, dependencies) {
    let input;
    try {
        input = buildRunWorkflowInput(rawInput);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return contentResult(message, { error: message }, true);
    }
    const prepare = dependencies.prepareRunWorktree ?? prepareRunWorktree;
    const runWorkflow = dependencies.runJsonWorkflow ?? runJsonWorkflow;
    const configureTrace = dependencies.configureTraceOutput ?? configureTraceOutput;
    try {
        const workflowFile = path.resolve(input.cwd, input.workflowFile);
        const paramFile = path.resolve(input.cwd, input.paramFile);
        const runId = input.runId ?? `${path.basename(input.workflowFile, ".json")}-${timestamp()}`;
        const prepared = prepare(input.cwd, {
            runId,
            worktreeDir: input.worktreeDir,
        });
        const outputDir = path.resolve(prepared.worktreeRoot, input.outputDir ?? `.ultracode/runs/${runId}`);
        configureTrace(path.join(outputDir, "trace.jsonl"), { silent: true });
        const result = await runWorkflow({
            repoRoot: prepared.worktreeRoot,
            workflowFile,
            paramFile,
            outputDir,
        });
        const payload = {
            worktree: {
                root: prepared.worktreeRoot,
                created: prepared.created,
                branch: prepared.branch,
            },
            inspection: createWorkflowInspectionLinks({
                cwd: input.cwd,
                runId,
                outputDir,
                stages: result.stages,
            }),
            result,
        };
        return contentResult(JSON.stringify(payload, null, 2), payload);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return contentResult(message, { error: message }, true);
    }
}
async function handleRunNamedWorkflowTool(rawInput, dependencies) {
    let input;
    try {
        input = buildRunNamedWorkflowInput(rawInput);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return contentResult(message, { error: message }, true);
    }
    const prepare = dependencies.prepareRunWorktree ?? prepareRunWorktree;
    const runWorkflow = dependencies.runJsonWorkflow ?? runJsonWorkflow;
    const configureTrace = dependencies.configureTraceOutput ?? configureTraceOutput;
    const resolveWorkflow = dependencies.resolveNamedWorkflow ?? resolveNamedWorkflow;
    const createParam = dependencies.createParamFileFromTemplate ?? createParamFileFromTemplate;
    const writeApprovedNamedWorkflow = dependencies.writeApprovedNamedWorkflowFile ?? writeApprovedNamedWorkflowFile;
    try {
        const runId = input.runId ?? `${input.workflowName}-${timestamp()}`;
        const workflow = resolveWorkflow(input.workflowName, {
            registryDir: input.registryDir,
        });
        if ((workflow.writeStages ?? []).length > 0 && input.approved !== true) {
            throw new Error("Write-capable named workflow execution requires approved=true.");
        }
        const prepared = prepare(input.cwd, {
            runId,
            worktreeDir: input.worktreeDir,
        });
        const outputDir = path.resolve(prepared.worktreeRoot, input.outputDir ?? `.ultracode/runs/${runId}`);
        const generated = createParam({
            templateFile: workflow.paramTemplateFile,
            outputDir,
            workflowName: input.workflowName,
            intent: input.intent,
            params: input.params,
        });
        let approvedNamedWorkflow;
        if ((workflow.writeStages ?? []).length > 0 && input.approved === true) {
            approvedNamedWorkflow = writeApprovedNamedWorkflow({
                outputDir,
                workflowName: workflow.name,
                workflowFile: workflow.workflowFile,
                paramFile: generated.paramFile,
                intent: input.intent,
                params: generated.params,
                execution: {
                    runId,
                    outputDir: input.outputDir ?? `.ultracode/runs/${runId}`,
                    worktreeDir: input.worktreeDir,
                },
            });
        }
        configureTrace(path.join(outputDir, "trace.jsonl"), { silent: true });
        const result = await runWorkflow({
            repoRoot: prepared.worktreeRoot,
            workflowFile: workflow.workflowFile,
            paramFile: generated.paramFile,
            outputDir,
        });
        const payload = {
            workflow: {
                name: workflow.name,
                description: workflow.description,
                workflowFile: workflow.workflowFile,
                paramFile: generated.paramFile,
            },
            worktree: {
                root: prepared.worktreeRoot,
                created: prepared.created,
                branch: prepared.branch,
            },
            inspection: createWorkflowInspectionLinks({
                cwd: input.cwd,
                runId,
                outputDir,
                stages: result.stages,
                approvedNamedWorkflowFile: approvedNamedWorkflow?.approvedNamedWorkflowFile,
            }),
            ...(approvedNamedWorkflow
                ? { approvedNamedWorkflowFile: approvedNamedWorkflow.approvedNamedWorkflowFile }
                : {}),
            result,
        };
        return contentResult(JSON.stringify(payload, null, 2), payload);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return contentResult(message, { error: message }, true);
    }
}
function handleListWorkflowsTool(rawInput, dependencies) {
    try {
        const registryDir = optionalString(rawInput, "registryDir");
        const workflows = (dependencies.listNamedWorkflows ?? listNamedWorkflows)({
            registryDir,
        });
        return contentResult(JSON.stringify({ workflows }, null, 2), { workflows });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return contentResult(message, { error: message }, true);
    }
}
function handleDescribeWorkflowTool(rawInput, dependencies) {
    try {
        const workflowName = requireString(rawInput, "workflowName");
        const registryDir = optionalString(rawInput, "registryDir");
        const workflow = (dependencies.resolveNamedWorkflow ?? resolveNamedWorkflow)(workflowName, {
            registryDir,
        });
        const readme = (dependencies.readWorkflowReadme ?? readWorkflowReadme)(workflow);
        const payload = { workflow, readme };
        const text = readme?.trim()
            ? JSON.stringify(payload, null, 2)
            : JSON.stringify(payload, null, 2);
        return contentResult(text, payload);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return contentResult(message, { error: message }, true);
    }
}
async function handleDispatchIntentTool(rawInput, dependencies) {
    let input;
    try {
        input = buildDispatchIntentInput(rawInput);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return contentResult(message, { error: message }, true);
    }
    try {
        const availableWorkflows = (dependencies.listNamedWorkflows ?? listNamedWorkflows)({
            registryDir: input.registryDir,
        });
        const plan = (dependencies.planDynamicWorkflow ?? planDynamicWorkflow)({
            intent: input.intent,
            availableWorkflows,
        });
        if (plan.recommendedAction === "run_named") {
            const matchedWorkflow = availableWorkflows.find((workflow) => workflow.name === plan.workflowName);
            if (matchedWorkflow && (matchedWorkflow.writeStages ?? []).length > 0) {
                const payload = {
                    dispatch: {
                        action: "needs_confirmation",
                        tool: "ultracode_run_named",
                    },
                    ...plan,
                    workflow: matchedWorkflow,
                    requiresConfirmation: true,
                    preview: createNamedWorkflowPreview(matchedWorkflow, {
                        followUp: "executionAfterApproval",
                    }),
                    executionAfterApproval: createNamedExecutionAfterApproval({
                        cwd: input.cwd,
                        workflowName: plan.workflowName,
                        intent: input.intent,
                        params: input.params,
                        outputDir: input.outputDir,
                        runId: input.runId,
                        worktreeDir: input.worktreeDir,
                        registryDir: input.registryDir,
                    }),
                };
                return contentResult(JSON.stringify(payload, null, 2), payload);
            }
            const runResult = await handleRunNamedWorkflowTool({
                cwd: input.cwd,
                workflowName: plan.workflowName,
                intent: input.intent,
                params: input.params,
                outputDir: input.outputDir,
                runId: input.runId,
                worktreeDir: input.worktreeDir,
                registryDir: input.registryDir,
            }, dependencies);
            if (runResult.isError) {
                return runResult;
            }
            const payload = {
                dispatch: {
                    action: "ran_named",
                    tool: "ultracode_run_named",
                },
                plan,
                ...runResult.structuredContent,
            };
            return contentResult(JSON.stringify(payload, null, 2), payload);
        }
        const planResult = handlePlanDynamicWorkflowTool({
            cwd: input.cwd,
            intent: input.intent,
            params: input.params,
            outputPlan: input.outputPlan,
            outputDir: input.outputDir,
            runId: input.runId,
            worktreeDir: input.worktreeDir,
            registryDir: input.registryDir,
        }, dependencies);
        if (planResult.isError) {
            return planResult;
        }
        const payload = {
            dispatch: {
                action: "needs_confirmation",
                tool: "ultracode_run_dynamic",
            },
            ...planResult.structuredContent,
        };
        return contentResult(JSON.stringify(payload, null, 2), payload);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return contentResult(message, { error: message }, true);
    }
}
function handlePlanDynamicWorkflowTool(rawInput, dependencies) {
    try {
        const intent = requireString(rawInput, "intent");
        const cwd = optionalString(rawInput, "cwd");
        const outputPlan = optionalString(rawInput, "outputPlan");
        const outputDir = optionalString(rawInput, "outputDir");
        const runId = optionalString(rawInput, "runId");
        const worktreeDir = optionalString(rawInput, "worktreeDir");
        const registryDir = optionalString(rawInput, "registryDir");
        const params = optionalParams(rawInput);
        const availableWorkflows = (dependencies.listNamedWorkflows ?? listNamedWorkflows)({
            registryDir,
        });
        const plan = (dependencies.planDynamicWorkflow ?? planDynamicWorkflow)({
            intent,
            availableWorkflows,
        });
        const matchedNamedWorkflow = plan.recommendedAction === "run_named"
            ? availableWorkflows.find((workflow) => workflow.name === plan.workflowName)
            : undefined;
        const matchedNamedWorkflowNeedsConfirmation = (matchedNamedWorkflow?.writeStages ?? []).length > 0;
        const execution = cwd && plan.recommendedAction === "run_named" && !matchedNamedWorkflowNeedsConfirmation
            ? createNamedWorkflowExecution({
                cwd: path.resolve(cwd),
                workflowName: plan.workflowName,
                intent,
                params,
                outputDir,
                runId,
                worktreeDir,
                registryDir,
                reason: plan.reason,
            })
            : undefined;
        const resolvedOutputPlan = outputPlan ??
            (cwd && plan.recommendedAction === "review_dynamic"
                ? defaultDynamicPlanPath(intent)
                : undefined);
        const executionAfterApproval = cwd && plan.recommendedAction === "run_named" && matchedNamedWorkflowNeedsConfirmation
            ? createNamedExecutionAfterApproval({
                cwd: path.resolve(cwd),
                workflowName: plan.workflowName,
                intent,
                params,
                outputDir,
                runId,
                worktreeDir,
                registryDir,
            })
            : undefined;
        const namedWorkflowFollowUp = matchedNamedWorkflow
            ? execution
                ? "execution"
                : executionAfterApproval
                    ? "executionAfterApproval"
                    : "missingCwd"
            : undefined;
        if (!resolvedOutputPlan) {
            const payload = {
                ...plan,
                workflow: matchedNamedWorkflow,
                preview: matchedNamedWorkflow && namedWorkflowFollowUp
                    ? createNamedWorkflowPreview(matchedNamedWorkflow, { followUp: namedWorkflowFollowUp })
                    : undefined,
                requiresConfirmation: matchedNamedWorkflowNeedsConfirmation || undefined,
                execution,
                executionAfterApproval,
            };
            return contentResult(JSON.stringify(payload, null, 2), payload);
        }
        if (!cwd && !path.isAbsolute(resolvedOutputPlan)) {
            throw new Error("Provide cwd when outputPlan is relative.");
        }
        const writePlan = dependencies.writeDynamicPlanFile ?? writeDynamicPlanFile;
        const resolvedPlanFile = cwd
            ? path.resolve(cwd, resolvedOutputPlan)
            : path.resolve(resolvedOutputPlan);
        const planFile = writePlan({
            planFile: resolvedPlanFile,
            intent,
            plan,
            params,
            execution: {
                outputDir,
                runId,
                worktreeDir,
            },
        });
        const dynamicExecutionAfterApproval = cwd && plan.recommendedAction === "review_dynamic"
            ? createDynamicExecutionAfterApproval({
                cwd: path.resolve(cwd),
                planFile: planFile.planFile,
                params,
                outputDir,
                runId,
                worktreeDir,
            })
            : undefined;
        const dynamicPreview = !cwd && plan.recommendedAction === "review_dynamic"
            ? {
                ...plan.preview,
                confirmationPrompt: "Review this preview, then re-run ultracode_plan_dynamic with cwd before executing so the approved workflow runs in the intended workspace.",
            }
            : undefined;
        const payload = {
            ...plan,
            preview: dynamicPreview ?? (plan.recommendedAction === "review_dynamic" ? plan.preview : undefined),
            planFile: planFile.planFile,
            createdAt: planFile.createdAt,
            execution,
            executionAfterApproval: dynamicExecutionAfterApproval,
        };
        return contentResult(JSON.stringify(payload, null, 2), payload);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return contentResult(message, { error: message }, true);
    }
}
async function handleRunDynamicWorkflowTool(rawInput, dependencies) {
    let input;
    try {
        input = buildRunDynamicWorkflowInput(rawInput);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return contentResult(message, { error: message }, true);
    }
    if (!input.approved) {
        return contentResult("Dynamic workflow execution requires approved=true.", { error: "Dynamic workflow execution requires approved=true." }, true);
    }
    const prepare = dependencies.prepareRunWorktree ?? prepareRunWorktree;
    const runWorkflow = dependencies.runJsonWorkflow ?? runJsonWorkflow;
    const configureTrace = dependencies.configureTraceOutput ?? configureTraceOutput;
    const createDynamicFiles = dependencies.createDynamicWorkflowFiles ?? createDynamicWorkflowFiles;
    try {
        const resolvedPlan = resolveDynamicPlanForMcpRun({ input, dependencies });
        const effectiveParams = resolveDynamicRunParams({
            inputParams: input.params,
            planFile: resolvedPlan.planFile,
        });
        const execution = resolveDynamicRunExecutionContext({
            input,
            planFile: resolvedPlan.planFile,
            defaultRunId: `dynamic-${timestamp()}`,
        });
        const prepared = prepare(input.cwd, {
            runId: execution.runId,
            worktreeDir: execution.worktreeDir,
        });
        const outputDir = path.resolve(prepared.worktreeRoot, execution.outputDir);
        const generated = createDynamicFiles({
            outputDir,
            intent: resolvedPlan.intent,
            workflow: resolvedPlan.workflow,
            params: effectiveParams,
        });
        let approvedPlan;
        if (resolvedPlan.planFile) {
            const copyPlan = dependencies.copyApprovedDynamicPlanFile ?? copyApprovedDynamicPlanFile;
            approvedPlan = copyPlan({
                planFile: resolvedPlan.planFile.planFile,
                outputDir,
                params: effectiveParams,
                execution,
            });
        }
        configureTrace(path.join(outputDir, "trace.jsonl"), { silent: true });
        const result = await runWorkflow({
            repoRoot: prepared.worktreeRoot,
            workflowFile: generated.workflowFile,
            paramFile: generated.paramFile,
            outputDir,
        });
        const payload = {
            workflow: {
                workflowFile: generated.workflowFile,
                paramFile: generated.paramFile,
                validation: generated.validation,
            },
            plan: resolvedPlan.planFile
                ? {
                    planFile: resolvedPlan.planFile.planFile,
                    approvedPlanFile: approvedPlan?.approvedPlanFile,
                    intent: resolvedPlan.planFile.intent,
                    createdAt: resolvedPlan.planFile.createdAt,
                    preview: resolvedPlan.planFile.plan.recommendedAction === "review_dynamic"
                        ? resolvedPlan.planFile.plan.preview
                        : undefined,
                }
                : undefined,
            worktree: {
                root: prepared.worktreeRoot,
                created: prepared.created,
                branch: prepared.branch,
            },
            inspection: createWorkflowInspectionLinks({
                cwd: input.cwd,
                runId: execution.runId,
                outputDir,
                stages: result.stages,
                approvedPlanFile: approvedPlan?.approvedPlanFile,
            }),
            result,
        };
        return contentResult(JSON.stringify(payload, null, 2), payload);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return contentResult(message, { error: message }, true);
    }
}
async function handleRestartStageTool(rawInput, dependencies) {
    try {
        const outputDir = resolveInspectOutputDir(rawInput, dependencies);
        const stageName = requireString(rawInput, "stageName");
        const result = await (dependencies.restartWorkflowStage ?? restartWorkflowStage)({
            outputDir,
            stageName,
            cascade: optionalBoolean(rawInput, "cascade") ?? false,
        });
        const payload = createStageActionPayload(rawInput, result);
        return contentResult(JSON.stringify(payload, null, 2), payload);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return contentResult(message, { error: message }, true);
    }
}
async function handleReworkStageTool(rawInput, dependencies) {
    try {
        const outputDir = resolveInspectOutputDir(rawInput, dependencies);
        const stageName = requireString(rawInput, "stageName");
        const feedback = requireRecord(rawInput, "feedback");
        const result = await (dependencies.reworkWorkflowStage ?? reworkWorkflowStage)({
            outputDir,
            stageName,
            feedback,
            cascade: optionalBoolean(rawInput, "cascade") ?? false,
        });
        const payload = createStageActionPayload(rawInput, result);
        return contentResult(JSON.stringify(payload, null, 2), payload);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return contentResult(message, { error: message }, true);
    }
}
function handleListRunsTool(rawInput, dependencies) {
    try {
        const repoRoot = path.resolve(requireString(rawInput, "cwd"));
        const limit = optionalNumber(rawInput, "limit");
        const runs = (dependencies.listRuns ?? listRuns)({
            repoRoot,
            limit,
        });
        return contentResult(JSON.stringify({ runs }, null, 2), { runs });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return contentResult(message, { error: message }, true);
    }
}
function handleRunArtifactTool(rawInput, dependencies) {
    try {
        const repoRoot = path.resolve(requireString(rawInput, "cwd"));
        const runId = requireString(rawInput, "runId");
        const artifact = (dependencies.getRunArtifact ?? getRunArtifact)({
            repoRoot,
            runId,
        });
        return contentResult(JSON.stringify(artifact, null, 2), artifact);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return contentResult(message, { error: message }, true);
    }
}
function handlePruneRunsTool(rawInput, dependencies) {
    try {
        const repoRoot = path.resolve(requireString(rawInput, "cwd"));
        const runIds = requireStringArray(rawInput, "runIds");
        const result = (dependencies.pruneRuns ?? pruneRuns)({
            repoRoot,
            runIds,
            removeWorktrees: optionalBoolean(rawInput, "removeWorktrees") ?? false,
        });
        return contentResult(JSON.stringify(result, null, 2), result);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return contentResult(message, { error: message }, true);
    }
}
async function handleToolCall(params = {}, dependencies = {}) {
    const name = params.name;
    const input = params.arguments ?? {};
    if (typeof name !== "string") {
        return contentResult("Tool name must be a string.", {}, true);
    }
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
        return contentResult("Tool arguments must be an object.", {}, true);
    }
    if (name === RUN_WORKFLOW_TOOL.name) {
        return handleRunWorkflowTool(input, dependencies);
    }
    if (name === RUN_NAMED_WORKFLOW_TOOL.name) {
        return handleRunNamedWorkflowTool(input, dependencies);
    }
    if (name === LIST_WORKFLOWS_TOOL.name) {
        return handleListWorkflowsTool(input, dependencies);
    }
    if (name === DESCRIBE_WORKFLOW_TOOL.name) {
        return handleDescribeWorkflowTool(input, dependencies);
    }
    if (name === DISPATCH_INTENT_TOOL.name) {
        return handleDispatchIntentTool(input, dependencies);
    }
    if (name === PLAN_DYNAMIC_WORKFLOW_TOOL.name) {
        return handlePlanDynamicWorkflowTool(input, dependencies);
    }
    if (name === RUN_DYNAMIC_WORKFLOW_TOOL.name) {
        return handleRunDynamicWorkflowTool(input, dependencies);
    }
    if (name === RESTART_STAGE_TOOL.name) {
        return handleRestartStageTool(input, dependencies);
    }
    if (name === REWORK_STAGE_TOOL.name) {
        return handleReworkStageTool(input, dependencies);
    }
    if (name === LIST_RUNS_TOOL.name) {
        return handleListRunsTool(input, dependencies);
    }
    if (name === RUN_ARTIFACT_TOOL.name) {
        return handleRunArtifactTool(input, dependencies);
    }
    if (name === PRUNE_RUNS_TOOL.name) {
        return handlePruneRunsTool(input, dependencies);
    }
    if (name === WORKFLOW_STATUS_TOOL.name) {
        return handleInspectTool(input, "status", dependencies);
    }
    if (name === WORKFLOW_TAIL_TOOL.name) {
        return handleInspectTool(input, "tail", dependencies);
    }
    if (name === WORKFLOW_REPORT_TOOL.name) {
        return handleInspectTool(input, "report", dependencies);
    }
    return contentResult(`Unknown tool: ${name}`, {}, true);
}
function resolveInspectOutputDir(input, dependencies) {
    const outputDir = optionalString(input, "outputDir");
    if (outputDir) {
        return path.resolve(outputDir);
    }
    const cwd = optionalString(input, "cwd");
    const runId = optionalString(input, "runId");
    if (!cwd || !runId) {
        throw new Error("Provide either outputDir or both cwd and runId.");
    }
    const resolveOutputDir = dependencies.resolveRunOutputDir ?? resolveRunOutputDir;
    return resolveOutputDir({
        repoRoot: path.resolve(cwd),
        target: runId,
    });
}
function optionalNumber(input, key) {
    const value = input[key];
    if (value == null) {
        return undefined;
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`${key} must be a number.`);
    }
    return value;
}
function handleInspectTool(rawInput, kind, dependencies) {
    try {
        const outputDir = resolveInspectOutputDir(rawInput, dependencies);
        const payload = kind === "status"
            ? (dependencies.inspectWorkflowStatus ?? inspectWorkflowStatus)(outputDir)
            : kind === "tail"
                ? (dependencies.inspectWorkflowTail ?? inspectWorkflowTail)(outputDir, {
                    limit: optionalNumber(rawInput, "limit"),
                })
                : (dependencies.inspectWorkflowReport ?? inspectWorkflowReport)(outputDir);
        return contentResult(JSON.stringify(payload, null, 2), payload);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return contentResult(message, { error: message }, true);
    }
}
export async function handleMcpRequest(message, dependencies = {}) {
    if (!("id" in message)) {
        return null;
    }
    const id = message.id ?? null;
    switch (message.method) {
        case "initialize":
            return {
                jsonrpc: "2.0",
                id,
                result: handleInitialize(message.params),
            };
        case "ping":
            return {
                jsonrpc: "2.0",
                id,
                result: {},
            };
        case "tools/list":
            return {
                jsonrpc: "2.0",
                id,
                result: { tools: TOOLS },
            };
        case "tools/call":
            return {
                jsonrpc: "2.0",
                id,
                result: await handleToolCall(message.params, dependencies),
            };
        default:
            return errorResponse(id, -32601, `Method not found: ${message.method ?? "<missing>"}`);
    }
}
function send(message) {
    process.stdout.write(`${JSON.stringify(message)}\n`);
}
export function startMcpServer() {
    const rl = readline.createInterface({
        input: process.stdin,
        crlfDelay: Infinity,
    });
    rl.on("line", (line) => {
        if (!line.trim()) {
            return;
        }
        void (async () => {
            try {
                const message = JSON.parse(line);
                const response = await handleMcpRequest(message);
                if (response) {
                    send(response);
                }
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                send(errorResponse(null, -32700, message));
            }
        })();
    });
}
