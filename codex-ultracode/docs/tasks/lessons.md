# Lessons

- Workflow runtime should be binary-first: use `ultracode run <workflow.json> <param.json>` as the primary entry. Skills are optional adapters only and must not own runtime semantics.
- `ultracode run` must execute flows inside an isolated linked git worktree. If invoked from the primary checkout, the CLI should create the run worktree itself, then execute stages there so Codex stage writes cannot pollute the user's main workspace.
- For Codex-internal triggering, expose a thin MCP tool over the same runtime instead of forcing Codex to shell out manually. The MCP layer should accept structured inputs, call the existing runner, and keep workflow events in trace artifacts so stdio remains valid JSON-RPC.
- Workflow display should be artifact-driven: write live `status.json`, keep raw events in `trace.jsonl`, and expose status/tail/report queries through both CLI and MCP instead of trying to stream arbitrary logs through Codex MCP stdout.
- For this project, all external trigger surfaces should use `ultracode`: CLI binary, MCP server, MCP tools, Skill name, artifact directory, and worktree branch prefix.
- User-facing Ultracode prompts should be intent-first and hide internal run parameters. Infer `cwd`, `runId`, and `outputDir` unless the user explicitly asks for deterministic reproduction or a custom artifact location.
- Named workflows should be discoverable from the Ultracode skill/plugin itself. Users should only need to provide an `ultracode` workflow name and intent; file paths such as workflow JSON, param JSON, run id, and output directory should be resolved by the adapter/runtime.
- Ultracode should invoke Codex through the public `codex` command on `PATH`. Do not hardcode or expose native Codex package internals such as `vendor/aarch64-apple-darwin/codex/codex`; those are implementation details of a specific Codex CLI distribution.
