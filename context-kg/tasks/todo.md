# Codex Plugins Marketplace 整理计划

## 目标

把 `codex-plugins` 整理成一个清晰、可安装、可验证的个人 Codex plugin marketplace。用户添加一次 marketplace 后即可获得当前插件套件；维护者可以在仓库根目录运行统一验证。

## 实施清单

- [x] 盘点当前 marketplace、根 README、子插件 README 和验证入口
- [x] 新增根 `package.json`，提供统一验证命令
- [x] 新增 `scripts/check-marketplace.mjs`，校验 marketplace 与插件 manifest 一致性
- [x] 重写英文 `README.md` 和中文 `README.zh-CN.md`
- [x] 更新 `plugins/claude-plugin-codex` README，将 `codex-plugins` marketplace 作为首选安装方式
- [x] 更新 `plugins/codex-ultracode` README，将 `codex-plugins` marketplace 作为首选安装方式
- [x] 新增 `CONTRIBUTING.md`
- [x] 新增 `CHANGELOG.md`
- [x] 运行完整验证
- [x] 提交并推送

## Review

- 仓库定位已收敛为 Codex plugin marketplace，而不是普通 monorepo。
- 根 README 现在覆盖：安装、更新、插件矩阵、快速开始、插件详情、仓库结构、验证命令和维护约定。
- 中文 README 与英文 README 对齐，保留中文优先的项目说明。
- 根 `package.json` 提供：
  - `npm run check:marketplace`
  - `npm run test:claude`
  - `npm run test:ultracode`
  - `npm run typecheck:ultracode`
  - `npm test`
- `scripts/check-marketplace.mjs` 会验证 marketplace 名称、插件路径、manifest 名称、MCP 配置、README、安装策略和必备插件条目。
- `plugins/claude-plugin-codex` README 已将 `codex plugin marketplace add chuntaojun/codex-plugins --ref main` 作为首选安装路径，独立 curl 安装保留为 standalone 方式。
- `plugins/codex-ultracode` README 已将 `codex-plugins` marketplace 作为首选安装路径，旧的 symlink/local marketplace 说明改为 standalone local development。
- 新增 `CONTRIBUTING.md` 说明 marketplace 目录约定、验证命令、新增插件流程和 subtree 更新约定。
- 新增 `CHANGELOG.md` 记录本次 marketplace 产品化整理。
- 验证通过：根目录 `npm test`。
- 验证通过：`validate_plugin.py plugins/claude-plugin-codex`。
- 验证通过：`validate_plugin.py plugins/codex-ultracode`。
- 已确认 README 和任务记录中没有旧的 `codex-plugin-cc` 或旧 `codex-ultracode` 绝对路径残留。
- 已提交并推送到 `origin/main`。
