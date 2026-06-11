# code-review

Run a read-only code review workflow that scopes the change, inspects likely risk areas, and performs a second-pass risk check.

## User-facing prompt

```text
$ultracode code-review "审查当前分支相对 main 的变更"
```

## Optional Params

```json
{
  "review": {
    "target": "current branch",
    "base": "main",
    "focus": ["correctness", "regressions", "missing tests"],
    "outputStyle": "findings first"
  }
}
```

The workflow is read-only and should lead with actionable findings rather than summaries.
