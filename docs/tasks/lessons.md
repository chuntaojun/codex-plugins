# Lessons

- Workflow runtime should be binary-first: use `harness-cli run <workflow.json> <param.json>` as the primary entry. Skills are optional adapters only and must not own runtime semantics.
- `harness-cli run` must execute flows inside an isolated linked git worktree. If invoked from the primary checkout, the CLI should create the run worktree itself, then execute stages there so Codex stage writes cannot pollute the user's main workspace.
- For Codex-internal triggering, expose a thin MCP tool over the same runtime instead of forcing Codex to shell out manually. The MCP layer should accept structured inputs, call the existing runner, and keep workflow events in trace artifacts so stdio remains valid JSON-RPC.
- Workflow display should be artifact-driven: write live `status.json`, keep raw events in `trace.jsonl`, and expose status/tail/report queries through both CLI and MCP instead of trying to stream arbitrary logs through Codex MCP stdout.
