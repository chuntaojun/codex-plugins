export type WorkflowDependencyStage = {
    name: string;
    dependsOn?: string[];
};
export type WorkflowDependencyValidation = {
    valid: boolean;
    errors: string[];
};
export declare function validateWorkflowDependencies(stages: WorkflowDependencyStage[]): WorkflowDependencyValidation;
export declare function orderStagesByDependencies<T extends WorkflowDependencyStage>(stages: T[]): T[];
export declare function findTransitiveDependentStages<T extends WorkflowDependencyStage>(stages: T[], stageName: string): T[];
