# Codex Plugins Monorepo 合并计划

## Codex 插件市场重组计划

### 目标

将仓库从“两个项目并排的 monorepo”整理为个人 Codex plugin marketplace。移除误放的 `codex-plugin-cc`，改为导入真正的 Codex 调 Claude 插件 `claude-plugin-codex`，并让用户添加一次 marketplace 后即可获得这一组 Codex 插件。

### 实施清单

- [x] 确认 `codex-plugin-cc` 实际是 Claude Code 调 Codex，方向不符合本仓库目标
- [x] 确认 `claude-plugin-codex` 是 Codex 调 Claude CLI，且本地 checkout 干净
- [x] 移除 `codex-plugin-cc`
- [x] 将 `codex-ultracode` 移入 `plugins/codex-ultracode`
- [x] 用 subtree 导入 `claude-plugin-codex` 到 `plugins/claude-plugin-codex`
- [x] 新增 `.agents/plugins/marketplace.json`
- [x] 重写英文 README 并新增中文 README
- [x] 运行插件测试、manifest 校验和 marketplace 结构校验
- [x] 推送更新
- [x] 补充 Review

### Review

- 已移除 `codex-plugin-cc`。该项目实际是 Claude Code 中调用 Codex 的 Claude Code 插件，不符合本仓库“Codex 插件市场”的方向。
- 已将 `codex-ultracode` 从根目录移动到 `plugins/codex-ultracode`。
- 已通过 subtree 导入 `claude-plugin-codex` 到 `plugins/claude-plugin-codex`，源提交为 `db69f35`。
- 新增 `.agents/plugins/marketplace.json`，marketplace 名称为 `codex-plugins`，包含 `claude` 和 `codex-ultracode` 两个插件，并标记为 `INSTALLED_BY_DEFAULT`。
- 重写英文 `README.md`，新增中文 `README.zh-CN.md`，把仓库定位为个人 Codex plugin marketplace，而不是普通 monorepo。
- 修复 `claude-plugin-codex` 的安装脚本测试，使其在独立仓库和 monorepo 子目录导入两种形态下都能通过。
- 验证通过：`plugins/claude-plugin-codex` 的 `npm test` 通过 20/20。
- 验证通过：`plugins/codex-ultracode/scripts` 的 `npm test` 通过 128/128，`npm run typecheck` 通过。
- 验证通过：两个插件的 `validate_plugin.py` 校验通过。
- 验证通过：marketplace JSON 能解析，插件 entry 名称、路径、默认安装策略和 manifest 名称一致。
- 已推送到 `chuntaojun/codex-plugins` 的 `main` 分支。

## 目标

创建新的 `codex-plugins` Git 仓库，将 `codex-plugin-cc` 与 `codex-ultracode` 合并为同一个 monorepo，同时保留两个源仓库目录边界和尽量保留 Git 历史。

## 实施清单

- [x] 确认两个源仓库位置、分支、远端和工作区状态
- [x] 初始化新仓库并写入根说明
- [x] 导入 `codex-plugin-cc/`
- [x] 导入 `codex-ultracode/`
- [x] 验证两个子项目的基础测试或校验
- [x] 创建 GitHub 远端 `chuntaojun/codex-plugins`
- [x] 推送 `main`
- [x] 补充 Review

## Review

- 新仓库路径：`/Users/chuntao.liao/Github/ai-native/codex-plugins`。
- `codex-plugin-cc` 从 `/Users/chuntao.liao/Github/ai-native/codex-plugin-cc` 的 `main` 导入到 `codex-plugin-cc/`，源提交为 `807e03a`。
- `codex-ultracode` 从 `/Users/chuntao.liao/Github/ai-native/codex-ultracode` 的 `develop` 导入到 `codex-ultracode/`，源提交为 `eeb3dd0`。
- 导入方式：`git subtree add --prefix=...`，保留两个源项目历史并避免修改原仓库。
- 验证通过：`codex-plugin-cc` 的 `npm test` 通过 86/86。
- 验证通过：`codex-ultracode/scripts` 的 `npm test` 通过 128/128，`npm run typecheck` 通过。
- 已创建 GitHub 远端：`https://github.com/chuntaojun/codex-plugins`。
- 已推送 `main` 并设置 upstream 为 `origin/main`。
