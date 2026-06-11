function slugifyIntent(intent) {
    const words = intent
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 5);
    return `dynamic-${words.join("-") || "workflow"}`;
}
const MATCH_STOPWORDS = new Set([
    "a",
    "an",
    "and",
    "by",
    "create",
    "from",
    "generate",
    "it",
    "of",
    "or",
    "the",
    "to",
    "with",
    "workflow",
]);
function tokenizeForMatch(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ")
        .trim()
        .split(/\s+/)
        .filter((token) => token.length >= 2 && !MATCH_STOPWORDS.has(token));
}
function scorePhraseMatch(intent, phrase, weight) {
    const normalizedPhrase = phrase.toLowerCase().trim();
    if (!normalizedPhrase) {
        return 0;
    }
    if (intent.includes(normalizedPhrase)) {
        return weight;
    }
    const tokens = tokenizeForMatch(normalizedPhrase);
    if (tokens.length > 0 && tokens.every((token) => intent.includes(token))) {
        return Math.max(1, weight - 2);
    }
    return 0;
}
function scoreNamedWorkflow(intent, workflow) {
    const normalizedIntent = intent.toLowerCase();
    let score = 0;
    score += scorePhraseMatch(normalizedIntent, workflow.name, 8);
    for (const keyword of workflow.keywords ?? []) {
        score += scorePhraseMatch(normalizedIntent, keyword, 10);
    }
    const descriptionTokens = tokenizeForMatch(workflow.description ?? "");
    const descriptionOverlap = descriptionTokens.filter((token) => normalizedIntent.includes(token));
    if (descriptionOverlap.length >= 2) {
        score += descriptionOverlap.length;
    }
    return score;
}
function findMatchingNamedWorkflow(intent, workflows) {
    let best;
    for (const workflow of workflows) {
        const score = scoreNamedWorkflow(intent, workflow);
        if (score >= 5 && (!best || score > best.score)) {
            best = { workflow, score };
        }
    }
    return best?.workflow;
}
function isCodeChangeIntent(intent) {
    return /fix|bug|failing|test|implement|code|change|update|refactor|modify|patch|修复|实现|改代码|修改|重构|测试失败/i.test(intent);
}
function isReviewOnlyIntent(intent) {
    return /review|risk|risks|report|audit|assess|assessment|evaluate|evaluation|analyze|analysis|summarize|summary|inspect|investigate|复盘|风险|报告|审阅|评审|分析|总结|检查|调研|研究/i.test(intent);
}
function isDebugFixIntent(intent) {
    return /debug|failing|failure|failed|ci|test failure|tests? fail|error|exception|regression|root cause|bug|排障|调试|失败|报错|异常|根因|测试失败|CI/i.test(intent);
}
function isResearchIntent(intent) {
    return /research|investigate|analyze|analysis|summarize|summary|compare|tradeoff|architecture|调研|研究|分析|总结|对比|架构|取舍/i.test(intent);
}
function isContentDeliverableIntent(intent) {
    return /travel guide|itinerary|trip plan|release notes|changelog|proposal|briefing|playbook|guide|document|email|announcement|攻略|行程|旅行|旅游|发布说明|变更日志|方案|文档|邮件|公告|指南|手册|计划书|提案/i.test(intent);
}
function createDebugFixWorkflow(intent) {
    return {
        name: slugifyIntent(intent),
        description: `Dynamic debug/fix workflow preview for: ${intent}`,
        stages: [
            {
                name: "reproduce-failure",
                type: "codex",
                input: {
                    intent: "${params.intent}",
                },
                prompt: [
                    "Reproduce or characterize the failure described by input.intent.",
                    "Inspect relevant logs, tests, errors, and repository context. Run read-only diagnostic commands when feasible.",
                    "Return Markdown with observed symptoms, reproduction steps, and uncertain assumptions. Do not expose hidden reasoning.",
                ],
                agent: {
                    mode: "read-only",
                },
                output: {
                    file: "failure-reproduction.md",
                },
            },
            {
                name: "diagnose-root-cause",
                type: "codex",
                dependsOn: ["reproduce-failure"],
                input: {
                    intent: "${params.intent}",
                    reproductionFile: "${stages.reproduce-failure.latest.outputFile}",
                },
                prompt: [
                    "Read input.reproductionFile, then identify the most likely root cause.",
                    "Tie the diagnosis to concrete files, code paths, logs, or test behavior. Avoid speculative fixes.",
                    "Return Markdown with root cause, affected surface, proposed fix, and verification commands.",
                ],
                agent: {
                    mode: "read-only",
                },
                output: {
                    file: "root-cause-analysis.md",
                },
            },
            {
                name: "implement-fix",
                type: "codex",
                dependsOn: ["diagnose-root-cause"],
                input: {
                    intent: "${params.intent}",
                    rootCauseFile: "${stages.diagnose-root-cause.latest.outputFile}",
                },
                prompt: [
                    "Read input.rootCauseFile, then implement the smallest fix that addresses the diagnosed root cause.",
                    "Keep edits scoped. Prefer existing patterns and avoid unrelated refactors.",
                    "Return Markdown summarizing changed files, rationale, and verification attempted.",
                ],
                agent: {
                    mode: "write",
                },
                output: {
                    file: "fix-summary.md",
                },
            },
            {
                name: "verify-fix",
                type: "codex",
                dependsOn: ["implement-fix"],
                input: {
                    intent: "${params.intent}",
                    fixSummaryFile: "${stages.implement-fix.latest.outputFile}",
                },
                prompt: [
                    "Read input.fixSummaryFile, then verify the fix against input.intent.",
                    "Run relevant tests or checks when feasible, inspect failures if any, and report residual risks.",
                    "Return Markdown with verification commands, results, pass/fail recommendation, and follow-up items.",
                ],
                agent: {
                    mode: "read-only",
                },
                output: {
                    file: "verification-report.md",
                },
            },
        ],
    };
}
function createCodeChangeWorkflow(intent) {
    return {
        name: slugifyIntent(intent),
        description: `Dynamic code-change workflow preview for: ${intent}`,
        stages: [
            {
                name: "change-brief",
                type: "codex",
                input: {
                    intent: "${params.intent}",
                },
                prompt: [
                    "Create a concise implementation brief for input.intent.",
                    "Identify target files, expected behavior, constraints, risks, and verification commands.",
                    "Return Markdown only and do not expose hidden reasoning.",
                ],
                output: {
                    file: "change-brief.md",
                },
            },
            {
                name: "implement-change",
                type: "codex",
                dependsOn: ["change-brief"],
                input: {
                    intent: "${params.intent}",
                    changeBriefFile: "${stages.change-brief.latest.outputFile}",
                },
                prompt: [
                    "Read input.changeBriefFile, then implement the requested repository change.",
                    "Keep edits scoped to input.intent and the brief. Prefer existing project patterns.",
                    "Run relevant verification when feasible and summarize the changed files and verification result.",
                    "Return Markdown only and do not expose hidden reasoning.",
                ],
                agent: {
                    mode: "write",
                },
                output: {
                    file: "implementation-summary.md",
                },
            },
            {
                name: "review-change",
                type: "codex",
                dependsOn: ["implement-change"],
                input: {
                    intent: "${params.intent}",
                    implementationSummaryFile: "${stages.implement-change.latest.outputFile}",
                },
                prompt: [
                    "Review input.implementationSummaryFile against input.intent.",
                    "Check completeness, regression risk, missing tests, and remaining assumptions.",
                    "Return a concise Markdown review with pass/fail recommendation.",
                    "Do not expose hidden reasoning.",
                ],
                output: {
                    file: "implementation-review.md",
                },
            },
        ],
    };
}
function createResearchWorkflow(intent) {
    return {
        name: slugifyIntent(intent),
        description: `Dynamic research workflow preview for: ${intent}`,
        stages: [
            {
                name: "research-scope",
                type: "codex",
                input: {
                    intent: "${params.intent}",
                },
                prompt: [
                    "Create a concise research scope for input.intent.",
                    "Identify questions to answer, source boundaries, repository areas to inspect, and expected deliverables.",
                    "Return Markdown only and do not expose hidden reasoning.",
                ],
                output: {
                    file: "research-scope.md",
                },
            },
            {
                name: "collect-findings",
                type: "codex",
                dependsOn: ["research-scope"],
                input: {
                    intent: "${params.intent}",
                    researchScopeFile: "${stages.research-scope.latest.outputFile}",
                },
                prompt: [
                    "Read input.researchScopeFile, then gather concrete findings relevant to input.intent.",
                    "Prefer repository-grounded evidence, file paths, command output, and clearly marked assumptions.",
                    "Return Markdown only and do not expose hidden reasoning.",
                ],
                output: {
                    file: "research-findings.md",
                },
            },
            {
                name: "synthesize-report",
                type: "codex",
                dependsOn: ["collect-findings"],
                input: {
                    intent: "${params.intent}",
                    findingsFile: "${stages.collect-findings.latest.outputFile}",
                },
                prompt: [
                    "Read input.findingsFile, then synthesize a clear report answering input.intent.",
                    "Include conclusions, tradeoffs, risks, and any recommended next actions.",
                    "Return Markdown only and do not expose hidden reasoning.",
                ],
                output: {
                    file: "research-report.md",
                },
            },
        ],
    };
}
function createContentDeliverableWorkflow(intent) {
    return {
        name: slugifyIntent(intent),
        description: `Dynamic content-deliverable workflow preview for: ${intent}`,
        stages: [
            {
                name: "deliverable-brief",
                type: "codex",
                input: {
                    intent: "${params.intent}",
                },
                prompt: [
                    "Create a concise deliverable brief for input.intent.",
                    "Identify the audience, purpose, scope, required format, factual boundaries, assumptions, and acceptance criteria.",
                    "Return Markdown only and do not expose hidden reasoning.",
                ],
                output: {
                    file: "deliverable-brief.md",
                },
            },
            {
                name: "draft-deliverable",
                type: "codex",
                dependsOn: ["deliverable-brief"],
                input: {
                    intent: "${params.intent}",
                    deliverableBriefFile: "${stages.deliverable-brief.latest.outputFile}",
                },
                prompt: [
                    "Read input.deliverableBriefFile, then draft the requested deliverable for input.intent.",
                    "Make the artifact directly usable by the target audience. Preserve caveats and assumptions when facts are uncertain.",
                    "Return the deliverable in Markdown unless the brief requires another format.",
                ],
                output: {
                    file: "deliverable-draft.md",
                },
            },
            {
                name: "review-deliverable",
                type: "codex",
                dependsOn: ["draft-deliverable"],
                input: {
                    intent: "${params.intent}",
                    deliverableDraftFile: "${stages.draft-deliverable.latest.outputFile}",
                },
                prompt: [
                    "Review input.deliverableDraftFile against input.intent and the deliverable brief.",
                    "Check completeness, audience fit, structure, factual risk, missing assumptions, and concrete improvements.",
                    "Return a concise Markdown review with pass/fail recommendation.",
                    "Do not expose hidden reasoning.",
                ],
                output: {
                    file: "deliverable-review.md",
                },
            },
        ],
    };
}
function createConstrainedWorkflow(intent) {
    return {
        name: slugifyIntent(intent),
        description: `Dynamic Ultracode workflow preview for: ${intent}`,
        stages: [
            {
                name: "scope-brief",
                type: "codex",
                input: {
                    intent: "${params.intent}",
                },
                prompt: [
                    "Create a concise scope brief for input.intent.",
                    "Identify goals, constraints, assumptions, deliverables, and risks.",
                    "Return Markdown only and do not expose hidden reasoning.",
                ],
                output: {
                    file: "scope-brief.md",
                },
            },
            {
                name: "execute-task",
                type: "codex",
                dependsOn: ["scope-brief"],
                input: {
                    intent: "${params.intent}",
                    scopeBriefFile: "${stages.scope-brief.latest.outputFile}",
                },
                prompt: [
                    "Read input.scopeBriefFile, then complete the task requested by input.intent.",
                    "Produce a concrete artifact that directly satisfies the requested deliverable.",
                    "Return Markdown only unless the requested deliverable requires another format.",
                ],
                output: {
                    file: "task-output.md",
                },
            },
            {
                name: "review-result",
                type: "codex",
                dependsOn: ["execute-task"],
                input: {
                    intent: "${params.intent}",
                    taskOutputFile: "${stages.execute-task.latest.outputFile}",
                },
                prompt: [
                    "Review input.taskOutputFile against input.intent for completeness, correctness, risks, and missing assumptions.",
                    "Return a short Markdown review with pass/fail recommendation and concrete improvements.",
                    "Do not expose hidden reasoning.",
                ],
                output: {
                    file: "task-review.md",
                },
            },
        ],
    };
}
function createPreview(workflow, template) {
    const writeStages = workflow.stages
        .filter((stage) => stage.agent?.mode === "write")
        .map((stage) => stage.name);
    const outputFiles = workflow.stages.map((stage) => stage.output.file);
    const stagePlan = workflow.stages.map((stage) => ({
        name: stage.name,
        mode: stage.agent?.mode ?? "read-only",
        outputFile: stage.output.file,
        dependsOn: stage.dependsOn ?? [],
    }));
    const risks = [
        writeStages.length > 0
            ? "Includes write-mode stages. Review scope before approving execution."
            : "Read-only dynamic workflow. It should not modify repository files.",
        "Generated workflow is a preview. Confirm stage names, dependencies, and expected outputs before execution.",
    ];
    return {
        template,
        summary: `${workflow.description} It has ${workflow.stages.length} stages: ${workflow.stages
            .map((stage) => stage.name)
            .join(" -> ")}.`,
        stageCount: workflow.stages.length,
        writeStages,
        outputFiles,
        stagePlan,
        risks,
        confirmationPrompt: "Review this preview and the full workflow JSON, then approve execution with approved=true only if the scope is correct.",
    };
}
function dynamicTemplateReason(template) {
    switch (template) {
        case "debug-fix":
            return "No registered workflow clearly matches. The intent looks like a debug/fix task, so Ultracode generated a reproduce -> diagnose -> implement -> verify workflow preview.";
        case "code-change":
            return "No registered workflow clearly matches. The intent looks like a repository code-change task, so Ultracode generated a scoped brief -> implementation -> review workflow preview.";
        case "research":
            return "No registered workflow clearly matches. The intent looks like a research or analysis task, so Ultracode generated a scope -> findings -> synthesis workflow preview.";
        case "content-deliverable":
            return "No registered workflow clearly matches. The intent looks like a content-deliverable task, so Ultracode generated a brief -> draft -> review workflow preview.";
        case "generic":
            return "No registered workflow clearly matches. Ultracode generated a generic scoped task workflow preview.";
    }
}
export function planDynamicWorkflow(options) {
    const intent = options.intent.trim();
    if (!intent) {
        throw new Error("intent must be a non-empty string.");
    }
    const availableWorkflows = options.availableWorkflows ?? [];
    const matchingWorkflow = findMatchingNamedWorkflow(intent, availableWorkflows);
    if (matchingWorkflow) {
        return {
            recommendedAction: "run_named",
            requiresConfirmation: false,
            workflowName: matchingWorkflow.name,
            reason: `The request matches the registered ${matchingWorkflow.name} workflow.`,
        };
    }
    const template = isDebugFixIntent(intent)
        ? "debug-fix"
        : isReviewOnlyIntent(intent)
            ? "research"
            : isContentDeliverableIntent(intent)
                ? "content-deliverable"
                : isCodeChangeIntent(intent)
                    ? "code-change"
                    : isResearchIntent(intent)
                        ? "research"
                        : "generic";
    const workflow = template === "debug-fix"
        ? createDebugFixWorkflow(intent)
        : template === "code-change"
            ? createCodeChangeWorkflow(intent)
            : template === "research"
                ? createResearchWorkflow(intent)
                : template === "content-deliverable"
                    ? createContentDeliverableWorkflow(intent)
                    : createConstrainedWorkflow(intent);
    return {
        recommendedAction: "review_dynamic",
        requiresConfirmation: true,
        reason: dynamicTemplateReason(template),
        workflow,
        preview: createPreview(workflow, template),
    };
}
