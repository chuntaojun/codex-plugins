# Codex Plugins Monorepo 合并计划

## 目标

创建新的 `codex-plugins` Git 仓库，将 `codex-plugin-cc` 与 `codex-ultracode` 合并为同一个 monorepo，同时保留两个源仓库目录边界和尽量保留 Git 历史。

## 实施清单

- [x] 确认两个源仓库位置、分支、远端和工作区状态
- [x] 初始化新仓库并写入根说明
- [x] 导入 `codex-plugin-cc/`
- [x] 导入 `codex-ultracode/`
- [x] 验证两个子项目的基础测试或校验
- [ ] 创建 GitHub 远端 `chuntaojun/codex-plugins`
- [ ] 推送 `main`
- [ ] 补充 Review

## Review

- 新仓库路径：`/Users/chuntao.liao/Github/ai-native/codex-plugins`。
- `codex-plugin-cc` 从 `/Users/chuntao.liao/Github/ai-native/codex-plugin-cc` 的 `main` 导入到 `codex-plugin-cc/`，源提交为 `807e03a`。
- `codex-ultracode` 从 `/Users/chuntao.liao/Github/ai-native/codex-ultracode` 的 `develop` 导入到 `codex-ultracode/`，源提交为 `eeb3dd0`。
- 导入方式：`git subtree add --prefix=...`，保留两个源项目历史并避免修改原仓库。
- 验证通过：`codex-plugin-cc` 的 `npm test` 通过 86/86。
- 验证通过：`codex-ultracode/scripts` 的 `npm test` 通过 128/128，`npm run typecheck` 通过。
