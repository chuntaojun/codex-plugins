export function createWorkflowContext(input) {
    return {
        repoRoot: input.repoRoot,
        workflow: input.workflow,
        goal: input.goal,
        target: input.target,
        mode: input.mode,
        outputDir: input.outputDir,
    };
}
