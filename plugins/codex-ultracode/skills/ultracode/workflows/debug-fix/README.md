# debug-fix

Run an approval-gated debug and fix workflow that reproduces a failure, diagnoses root cause, implements a scoped fix, and verifies it.

## User-facing prompt

```text
$ultracode debug-fix "修复 npm test 里的失败用例"
```

## Optional Params

```json
{
  "debug": {
    "symptom": "npm test fails in mcp.test.mjs",
    "commands": ["npm test"],
    "expectedBehavior": "All tests pass",
    "constraints": ["keep the fix minimal", "do not refactor unrelated code"]
  }
}
```

This workflow includes a write stage, so Ultracode should require explicit approval before execution.
