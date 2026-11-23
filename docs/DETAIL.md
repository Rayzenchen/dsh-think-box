# 思维链显示增强

本插件只做两件事：**行内思考框**与**思考翻译**。正文由 Harness 自身渲染，插件不接管正文、视口滚动或调试面板。

## 功能

- **行内思考窗**：推理内容显示在「思考」行右侧的多行窗，默认三行；点击该行在下方展开完整 body（最多 18 行，内容短时按内容收缩），再点收起。思考结束后回卷到开头并收成一行，每段只播一次；恢复历史不重播。
- **节奏**：推理文本按固定 `balanced` 节奏逐字揭示，行内框跟随内容滚动；淡入固定开启，代码/公式/摘要不参与。系统「减少动效」下揭示与淡入自动跳过，文本直接呈现。
- **思考翻译**：思考行右侧可切换「查看译文 / 查看原文」。后端二选一：官方「思考过程翻译」组合包，或任意已注册的 DSH 模型路由（约 4000 字分片）；流式期间只增量翻译已完成片段，末尾保持原文，历史块手动点击。
- **折叠**：保留 Host 的 `turnProcess` 契约，折叠时推理隐入「已处理」摘要，查找可恢复。

## 设置入口

- **插件页卡片**是唯一入口：启用、自动跟随思考、翻译通道。
- `enabled` / `thinkAutoExpand` 持久化在 `~/.dsh/profiles/<profile>/cordis.patch.yml` 的 `id: think-box` 行；volatile 字段保存后即时生效，无需重启。无 writable 条目时卡片显示只读。
- 翻译通道设置在 `~/.dsh/think-box/translation.json`；`cordis.patch.yml` 的 `translation:` 块只做首次启动种子。

## 隐私

启用翻译后，思考文本会发送到你选择的翻译服务或模型路由。是否自动发送由 `autoTranslate` 决定（仓库种子开启；实际以本机 `translation.json` 当前值为准，本机当前关闭；历史块始终手动）。

## 兼容性

实测 DSH `0.2.2-rc.5`。依赖非公开接缝：`assistant-step` 原地替换、0.2.x `groupPart` 双挂载、`turnProcess` 折叠、连接 RPC（含 WebServer 回退）、volatile 配置 + `configEditor`。升级 DSH 后必须回归。

## 已知限制

- 旧「回合结束后滚动/输入框位置异常」问题作为历史记录保留在仓库 `FIX-REPORT-2026-10-11.md`；插件已不接管正文与滚动，不再参与该路径。
- 翻译只覆盖思考框。
- 当前全量测试 `129/129` 通过，无 skip。

---

## English summary

A reasoning-box and reasoning-translation plugin only; Harness renders the answer. The box shows a three-line inline preview, opens an 18-line body on click, and plays a one-shot settle flourish (never on restored history). Reasoning reveal uses one fixed balanced cadence; the logarithmic fade is always on and both are skipped under OS reduced motion. Translation supports the official reasoning-translation bundle or any registered DSH model route, translating finished fragments while streaming and keeping the tail in the original language.

`enabled` and `thinkAutoExpand` persist in the profile entry config (`~/.dsh/profiles/<profile>/cordis.patch.yml`, `id: think-box`, volatile — applied live); translation settings persist in `~/.dsh/think-box/translation.json`. Enabling translation sends reasoning text to the selected service/route; `autoTranslate` controls automatic sending (repository seed on, effective value from the local file). Tested on DSH 0.2.2-rc.5; the plugin depends on non-public seams (assistant-step swap, `groupPart`, `turnProcess` fold, connection RPC, volatile config + `configEditor`) and must be regressed after upgrades. The suite is 129/129 green.
