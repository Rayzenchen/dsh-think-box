# 思维链显示增强

本插件是本地分叉（上游 Laplace-bit/dsh-smooth-stream v0.7.0），为本机 DSH 提供三件事：行内思考框、正文丝滑流式、可选思考翻译。

## 功能

- **思考框**：推理内容常驻「思考」行右侧的多行窗（默认三行）；点击该行在下方展开全文（最多 18 行，内容少时按内容收缩），再点收起。思考结束后回卷到开头并收成一行；历史推理不重播回卷。
- **丝滑流式**：正文逐字揭示，视口用阻尼跟随（不是 `scrollTop = scrollHeight` 硬跳）；揭示带背压，避免文字冲出可视区。手感 preset：`realtime` / `balanced`（默认）/ `silky`。对数淡入可选；渲染调试面板默认关闭。
- **思考翻译**：思考行右侧可切换「查看译文 / 查看原文」。后端二选一：官方「思考过程翻译」组合包，或任意已注册的 DSH 模型路由（按约 4000 字分片）。流式期间已完成的片段增量翻译，末尾未完成部分保持原文。

## 设置入口

- **插件页卡片**（侧栏「插件」页 → 本插件）是唯一设置入口；0.2.x 的自动设置页对本条目已关闭。
- 卡片上的开关持久化在 profile 条目配置：`~/.dsh/profiles/<profile>/cordis.patch.yml` 的 `id: think-box` 行；volatile 字段保存后即时生效，无需重启。
- 翻译通道设置单独存在：`~/.dsh/think-box/translation.json`（首次启动由 `cordis.patch.yml` 的 `translation:` 块提供种子）。
- 若当前 profile 没有可写条目，卡片会显示为只读。

## 隐私

启用翻译后，思考文本会发送到你选择的翻译服务或模型路由。是否自动发送由 `autoTranslate` 决定：仓库默认种子是开启，实际以本机 `~/.dsh/think-box/translation.json` 的当前值为准（本机当前是关闭，只有手动点击才发送）；历史思考块始终手动。

## 已知限制

- 实测内核：DSH `0.2.2-rc.5`。插件依赖若干非公开接缝（`assistant-step` 原地替换、0.2.x `groupPart` 双挂载、`data-conversation-scroll` DOM、连接 RPC 回退、volatile 配置 + `configEditor`），**升级 DSH 后必须回归**。
- 上游已到 0.8.0，本分叉未合并。
- 回合结束后滚动/输入框位置异常的旧问题未结案，排查记录见仓库 `FIX-REPORT-2026-10-11.md`。
- 测试套件部分恢复：当前全量 `269/297`，剩余为几何/时序类已知失败。

---

## English summary

A local fork of Laplace-bit/dsh-smooth-stream v0.7.0. It adds an inline reasoning box (three-line preview, click to open up to 18 lines, one settle flourish), smooth per-character reveal with damped viewport follow (`realtime` / `balanced` / `silky`), and optional reasoning translation via the official bundle or any registered DSH model route.

Settings live in two places: the Plugins-page card persists its switches to the profile entry config (`~/.dsh/profiles/<profile>/cordis.patch.yml`, `id: think-box`, volatile — applied live) and the translation channel persists to `~/.dsh/think-box/translation.json`. Enabling translation sends reasoning text to the selected service/route; `autoTranslate` controls whether finished streaming fragments are sent automatically (the repository seed defaults it on, but the effective value is whatever `~/.dsh/think-box/translation.json` currently holds — off on this machine today; historical blocks are always manual).

Tested on DSH 0.2.2-rc.5. The plugin depends on non-public seams (`assistant-step` in-place swap, 0.2.x `groupPart` mounts, `data-conversation-scroll`, connection-RPC fallback, volatile config + `configEditor`) — regress after every DSH upgrade. Upstream is at 0.8.0 and unmerged. The old post-turn scroll/composer bug is unresolved (see `FIX-REPORT-2026-10-11.md`), and the suite is at 269/297 with tracked geometry/timing failures.
