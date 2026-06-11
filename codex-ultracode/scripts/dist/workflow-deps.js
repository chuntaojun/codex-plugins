function dependencyList(stage) {
    return Array.isArray(stage.dependsOn) ? stage.dependsOn : [];
}
function knownDependencyList(stage, stageNames) {
    const dependencies = dependencyList(stage);
    return stageNames
        ? dependencies.filter((dependency) => stageNames.has(dependency))
        : dependencies;
}
export function validateWorkflowDependencies(stages) {
    const errors = [];
    const stageNames = new Map();
    for (const [index, stage] of stages.entries()) {
        const name = typeof stage.name === "string" ? stage.name.trim() : "";
        if (!name) {
            errors.push(`Stage ${index + 1} name must be a non-empty string.`);
            continue;
        }
        if (stageNames.has(name)) {
            errors.push(`Stage ${index + 1} has duplicate stage name "${name}".`);
        }
        stageNames.set(name, index);
        if (stage.dependsOn != null && !Array.isArray(stage.dependsOn)) {
            errors.push(`Stage ${index + 1} dependsOn must be an array when present.`);
        }
    }
    for (const [index, stage] of stages.entries()) {
        if (!Array.isArray(stage.dependsOn)) {
            continue;
        }
        for (const dependency of stage.dependsOn) {
            if (typeof dependency !== "string" || !dependency.trim()) {
                errors.push(`Stage ${index + 1} dependsOn entries must be non-empty strings.`);
                continue;
            }
            if (!stageNames.has(dependency)) {
                errors.push(`Stage ${index + 1} has Unknown dependency "${dependency}".`);
            }
        }
    }
    const validStageNames = new Set(stageNames.keys());
    const validNamedStages = stages.filter((stage) => validStageNames.has(stage.name));
    const ordered = orderStagesByDependenciesUnchecked(validNamedStages, validStageNames);
    if (ordered.length !== validNamedStages.length) {
        const orderedNames = new Set(ordered.map((stage) => stage.name));
        const cyclicNames = validNamedStages
            .map((stage) => stage.name)
            .filter((name) => !orderedNames.has(name));
        errors.push(`Cyclic stage dependency involving: ${cyclicNames.join(", ")}.`);
    }
    return { valid: errors.length === 0, errors };
}
function orderStagesByDependenciesUnchecked(stages, stageNames) {
    const byName = new Map(stages.map((stage) => [stage.name, stage]));
    const remainingDependencies = new Map();
    const dependents = new Map();
    for (const stage of stages) {
        const dependencies = new Set(knownDependencyList(stage, stageNames));
        remainingDependencies.set(stage.name, dependencies);
        for (const dependency of dependencies) {
            const entries = dependents.get(dependency) ?? [];
            entries.push(stage.name);
            dependents.set(dependency, entries);
        }
    }
    const ready = stages
        .filter((stage) => knownDependencyList(stage, stageNames).length === 0)
        .map((stage) => stage.name);
    const ordered = [];
    const queued = new Set(ready);
    while (ready.length > 0) {
        const name = ready.shift();
        const stage = byName.get(name);
        if (!stage) {
            continue;
        }
        ordered.push(stage);
        for (const dependent of dependents.get(name) ?? []) {
            const dependencies = remainingDependencies.get(dependent);
            if (!dependencies) {
                continue;
            }
            dependencies.delete(name);
            if (dependencies.size === 0 && !queued.has(dependent)) {
                ready.push(dependent);
                queued.add(dependent);
            }
        }
    }
    return ordered;
}
export function orderStagesByDependencies(stages) {
    const validation = validateWorkflowDependencies(stages);
    if (!validation.valid) {
        throw new Error(`Invalid workflow dependencies: ${validation.errors.join("; ")}`);
    }
    return orderStagesByDependenciesUnchecked(stages);
}
export function findTransitiveDependentStages(stages, stageName) {
    const orderedStages = orderStagesByDependencies(stages);
    if (!stages.some((stage) => stage.name === stageName)) {
        throw new Error(`Unknown stage "${stageName}".`);
    }
    const directDependents = new Map();
    for (const stage of stages) {
        for (const dependency of dependencyList(stage)) {
            const entries = directDependents.get(dependency) ?? [];
            entries.push(stage.name);
            directDependents.set(dependency, entries);
        }
    }
    const downstream = new Set();
    const queue = [...(directDependents.get(stageName) ?? [])];
    while (queue.length > 0) {
        const name = queue.shift();
        if (downstream.has(name)) {
            continue;
        }
        downstream.add(name);
        queue.push(...(directDependents.get(name) ?? []));
    }
    return orderedStages.filter((stage) => downstream.has(stage.name));
}
