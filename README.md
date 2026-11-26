# 思维链显示增强（@local/dsh-think-box）

[English](README.en.md) | 中文

<p><img src="icon.svg" width="72" height="72" alt="思维链显示增强图标：一张三行思考卡，右下角是模型路由与翻译的双向箭头"></p>

把模型的思考过程放进「思考」行右侧的**行内思考窗**，并把思考内容按需翻译成界面语言。翻译通道自带一个与输入框模型菜单一致的**模型路由选择器**（服务商 / 模型 / 推理强度）。

插件只做两件事：**思考框**与**思考翻译**。答案正文不做任何插件特效——没有逐字揭示、视口跟随、滚动接管或淡入，直接由 Harness 的 Markdown 组件渲染；替换内置 `assistant-step` 行只是为了承载思考框。

当前版本 **1.0.0**。思考框收起/展开两态示意图见 [`docs/preview.svg`](docs/preview.svg)，中文详情见 [`docs/DETAIL.zh.md`](docs/DETAIL.zh.md)。

---

## 安装

**要求**：DeepSeek Harness `0.2.2-rc.5` 或更新（`engines.dsh` 声明 `>=0.2.2-rc.5 <0.3.0`）。

从 GitHub 安装（`v1.0.0` 是发布标签）：

```sh
dsh plugin --profile <profile> add github:Rayzenchen/dsh-think-box#v1.0.0
```

从本地目录安装（开发时用 link）：

```sh
dsh plugin --profile <profile> add /path/to/dsh-think-box
```

在 Desktop 应用里也可以让 agent 用 `plugin_manager` 的 `install_bundle` 装同一个 spec。装完刷新页面；客户端接管与设置卡会一起出现。卸载：

```sh
dsh plugin --profile <profile> remove @local/dsh-think-box
```

## 功能

### 行内思考窗

- 推理流式输出时，文字显示在「思考」行右侧的多行窗里，默认三行，不把对话撑高。
- 点击「思考」行展开完整 body（最多 18 行，内容短时按内容收缩），再点收起。
- 思考结束做一次回卷：跟到最新一行、停一拍、回到开头并收成一行；每段只播一次，恢复历史不重播。
- 保留 Host 的 `turnProcess` 折叠契约：折叠时推理隐入「已处理」摘要，查找时再展开。

### 节奏与淡入

- 推理文本按固定 `balanced` 节奏逐字揭示，行内框跟随自己的内容；这是思考框的节奏，不是正文流式。
- 对数淡入**固定开启**；代码、公式与思考摘要不参与。
- 系统开启「减少动效」时，揭示与淡入都自动跳过，文本直接呈现。

### 思考翻译

- 思考行右侧可切换「查看译文 / 查看原文」，翻译只替换思考框显示的文字，不改变揭示节奏。
- 两种后端：官方「思考过程翻译」组合包（`bundle`），或任意已注册的 DSH 模型路由（`llm`，按约 4000 字分片）。
- 流式期间只增量翻译**已完成**的片段，末尾保持原文；历史思考块始终手动。

### 模型路由选择器

翻译通道把原来的「服务路由 / 模型 / 推理强度」三栏合并成一行摘要（`服务商 · 模型 · 推理强度`）。点开后是与输入框模型菜单内容一致的卡片：按服务商分组的模型列表、超过四个模型时的搜索、右侧勾选，以及推理强度列表。**选择只暂存，点翻译通道的保存按钮才落盘**；加载失败可重试，也不阻塞其它字段保存。

> 示意图只画**思考框收起 / 展开两态**，不包含设置卡；插件页上的**设置卡仍始终展开、无需点击**（含模型路由选择器）。

## 设置

插件页卡片有三项：

1. **启用**：关闭后交还 Harness 内置渲染。
2. **自动跟随思考**：思考进行中是否自动展开跟随。
3. **翻译通道**：后端、模型路由（服务商 / 模型 / 推理强度）、目标语言、分片上限、`autoTranslate`。`maxTokens` / `timeoutMs` 不在卡片里，只存在于 `translation.json` 种子中。

`enabled` / `thinkAutoExpand` 持久化在 profile 的 `cordis.patch.yml` 条目（`id: think-box`），volatile 字段保存后即时生效、无需重启。翻译设置保存在 `~/.dsh/think-box/translation.json`；`cordis.patch.yml` 的 `translation:` 块只作首次启动种子。当前 profile 没有可写条目时，设置卡显示为只读。

## 隐私

启用翻译意味着**思考文本会发送到你选择的翻译服务或模型路由**：`bundle` 发给官方组合包选中的服务，`llm` 发给模型路由选择的服务商/模型。`autoTranslate` 控制自动发送；关闭后只有手动点击「查看译文」才发送。历史思考块始终手动。插件不会把内容发往上述后端之外的地址。

## 兼容性

- **实测内核：DSH `0.2.2-rc.5`**。插件依赖若干非公开接缝，升级 DSH 后必须回归：
  - 0.2.x 按 entry 渲染 Chat 行，插件**原地替换内置 `assistant-step` 行**来承载思考框；
  - 同一 assistant step 会按 `groupPart` 拆成 reasoning / response 两行，插件过滤避免重复；
  - Host 的 `turnProcess` 折叠契约；
  - 设置卡走插件自己的 loopback RPC（Connection 不可注入时回退 WebServer 直挂，仍在 loopback + 应用 token 之后）；
  - 设置持久化走 `configEditor` + volatile 配置字段。
- 不要对 `@deepseek-ai/*` 的**运行时符号**做静态导入（类型导入无妨）：宿主可能重定向裸导入，改名/删符号会炸启动。

## 已知限制

- 不接管正文与滚动；正文揭示、视口跟随、preset、滚动接管、调试面板均已移除。历史问题记录见 [`FIX-REPORT-2026-10-11.md`](FIX-REPORT-2026-10-11.md)。
- 翻译只覆盖思考框，不翻译正文。
- 模型路由选择器只列出文本模型；某个模型取不到 reasoning 元数据时仍可选，只是没有推理强度项。

## 测试

全量 **155/155** 通过、无 skip。覆盖思考框、设置 Host/通道/卡片、翻译 Host/运行时/客户端、模型目录与选择器。开发命令：

```sh
./node_modules/.bin/tsc -p tsconfig.json --pretty false
./node_modules/.bin/vitest run
./node_modules/.bin/tsdown
node scripts/check-lib-fresh.mjs
```

## 目录

```
icon.svg             插件页图标（36×36，导出为 ./icon）
docs/preview.svg     思考框收起/展开两态抽象示意图
docs/DETAIL.zh.md    中文详情（locale zh 的 meta.detail）
docs/DETAIL.md       英文详情（locale en 的 meta.detail）
src/                 Host 半边（入口、配置、设置 RPC、翻译与目录桥）
src/client/          浏览器半边（思考框、揭示/淡入、设置卡、模型选择器）
tests/               host/client 套件；tests/shims/ 为宿主包替身
locale/              插件页元数据（zh/en）
cordis.patch.yml     bundle 默认配置层
scripts/             仅保留 check-lib-fresh.mjs
lib/                 发布构建产物（tsdown 生成，随包提交）
.github/workflows/   pnpm 验证流水线（tsc / vitest / tsdown / check-lib-fresh）
CHANGELOG.md         版本记录
```

## 上游与许可

最初分叉自 [Laplace-bit/dsh-smooth-stream](https://github.com/Laplace-bit/dsh-smooth-stream)（v0.7.0，MIT）；思考框、翻译、模型路由选择器与设置卡为本地改造。

以 MIT 许可发布，详见 [LICENSE](LICENSE)。上游版权归 Laplace-bit 所有，本分叉的修改版权归 Rayzenchen，均以 MIT 提供。
