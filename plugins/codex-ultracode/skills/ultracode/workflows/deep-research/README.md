# deep-research

Run a multi-stage, read-only research workflow that scopes the question, maps evidence, synthesizes findings, and reviews uncertainty.

## User-facing prompt

```text
$ultracode deep-research "调研 AI 编程助手在大型代码库中的协作模式"
```

## Optional Params

```json
{
  "research": {
    "topic": "AI coding assistants in large repositories",
    "audience": "engineering leads",
    "depth": "deep",
    "deliverable": "decision-ready Markdown report",
    "constraints": ["compare workflows", "call out evidence gaps"]
  }
}
```

The workflow is read-only. It should mark time-sensitive claims as needing live verification unless the active tools or supplied sources can verify them.
