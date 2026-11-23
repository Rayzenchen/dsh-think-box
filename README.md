# 思维链显示增强（@local/dsh-think-box）

本地定制的 DeepSeek Harness（`dsh`）浏览器插件：把模型的思考过程放进「思考」行右侧的行内推理窗，并提供可选的思考翻译。它最初分叉自上游项目（历史归属见文末）。

插件只做两件事：**思考框**与**思考翻译**。答案正文不做任何插件特效——没有逐字揭示、视口跟随、滚动接管或淡入，直接由 Harness 的 Markdown 组件渲染；插件替换内置 `assistant-step` 行只是为了承载思考框。

---

## 功能

### 1. 行内思考窗

- 思考流式输出时，推理文本显示在「思考」行右侧的**行内多行窗**里，默认只占三行，不会把对话撑高。
- 点击「思考」行，在下方展开完整推理 body（最多 18 行，内容短时按内容收缩）；再点一次收起。
- 思考结束做一次「回卷」：先跟到最新一行、停一拍，再匀速回到开头，最后收成一行；每段思考只播一次。
- 恢复历史会话时不重播回卷，直接以一行结算态呈现。
- Host 的 `turnProcess` 折叠契约保留：折叠时推理块隐入 Host 的「已处理」摘要，查找时再展开。

### 2. 思考框的节奏

- 推理文本按固定 `balanced` 节奏逐字揭示，行内框跟随内容滚动；这是思考框自己的节奏，不是正文流式。
- 对数淡入**固定开启**：新出现的尾部文字从通透渐变到实色；代码、公式与思考摘要不参与。
- 系统开启「减少动效」时，揭示与淡入都自动跳过，推理文本直接呈现；不再提供三态动效设置。

### 3. 思考翻译（可选）

- 思考行右侧提供「查看译文 / 查看原文」切换；翻译只替换思考框显示的文字，不改变揭示节奏。
- 两种后端：
  - `bundle`：官方「思考过程翻译」组合包（Google / Bing / DeepSeek 官方 API），需在插件页启用该组合包；
  - `llm`：由插件 Host 半边转发给任意已注册的 DSH 模型路由（例如免费的 OpenCode Go DeepSeek 4.1 Flash），按约 4000 字分片。
- 流式期间把**已完成的片段**增量翻译，未完成的末尾保持原文；历史思考块仍需手动点击。

---

## 安装与启用（本机）

本机不使用 npm 安装，而是把仓库 link 进 `desktop` profile：

1. profile 的 `package.json` 依赖指向本仓库：
   ```json
   { "@local/dsh-think-box": "link:/Users/wench/Documents/DS Harness/dsh-think-box-plugin" }
   ```
2. 该包出现在 profile 的 `dsh.profile.bundles` 列表里（默认配置由仓库内 `cordis.patch.yml` 提供）。
3. 启动/刷新 DSH Web，在**侧栏「插件」页**找到「思维链显示增强」并启用；关闭总开关即交还 Harness 内置渲染。

Host 日志出现 `[dsh-think-box] plugin loaded!` 表示宿主半边已加载。

---

## 设置与存储

插件页卡片只有三项：**启用**、**自动跟随思考**、**翻译通道**。

### 卡片开关 → profile 条目配置

`启用` 与 `自动跟随思考` 持久化在 profile 的条目配置：

```
~/.dsh/profiles/<profile>/cordis.patch.yml
```

对应 `id: think-box` 那一行。两个字段是 volatile 配置：保存后由宿主 Loader 原地提交到运行中的插件，**不需要重启**。当前 profile 没有可写条目时，卡片会如实显示为只读。

### 翻译设置 → 独立文件

翻译通道（后端、provider/model、reasoningEffort、目标语言、分片与超时、`autoTranslate`）保存在：

```
~/.dsh/think-box/translation.json
```

`cordis.patch.yml` 里的 `translation:` 块只作为**首次启动的种子**；之后以该文件为准。翻译结果按 Session 保存（`llm` 后端的译文只缓存在当前页面内存，不写 Session 记录）。

---

## 翻译隐私

- 启用翻译意味着**思考文本会发送到你选择的翻译服务或模型路由**：`bundle` 发给官方组合包选中的服务，`llm` 发给 `provider`/`model` 指定的路由。
- 是否自动发送由 `autoTranslate` 决定：仓库默认种子是开启；实际值以本机 `~/.dsh/think-box/translation.json` 为准（本机当前为关闭）。关闭后只有手动点击「查看译文」才发送。
- **历史思考块始终手动**，即使 `autoTranslate` 开启也要点击才翻译。
- 不需要翻译时不要点击，或把翻译通道关掉；插件不会把内容发往上述后端之外的地址。

---

## 兼容性

- **实测内核：DSH `0.2.2-rc.5`（本机桌面版）**。插件依赖若干**非公开接缝**，升级 DSH 后必须回归：
  - 0.2.x 的 keyed Chat 行按 entry 逐个渲染，插件**原地替换内置 `assistant-step` 行的 component** 来承载思考框（没有 reasoning-row 槽位可用）；
  - 0.2.x 把同一个 assistant step 以 `groupPart` 拆成 reasoning / response 两行挂载，插件按 `groupPart` 过滤，避免重复渲染；
  - 依赖 Host 的 `turnProcess` 折叠契约（answer-inline reasoning 隐入摘要、查找时恢复）；
  - 设置卡片走插件自己的 loopback RPC 通道；Connection 服务在插件作用域不可注入时回退到 WebServer 直挂（仍受 loopback + 应用 token 约束）；
  - 设置持久化走 0.2.x 的 `configEditor` + volatile 配置字段；旧版 `settings.register` 命名空间在 0.2.2 已不存在。
- 不要对 `@deepseek-ai/*` 的**运行时符号**做静态导入（类型导入无妨）：宿主可能把裸导入重定向到自己的源码，宿主改名/删符号时会直接炸启动。

---

## 已知限制

- 本插件**不再接管正文与滚动**：正文揭示、视口跟随、preset、滚动接管、调试面板均已移除。旧版「回合结束后滚动/输入框位置异常」问题作为历史记录保留在 [`FIX-REPORT-2026-10-11.md`](FIX-REPORT-2026-10-11.md)，当前插件不参与该路径。
- 翻译只覆盖思考框；正文翻译不在范围内。
- 当前全量测试 `129/129` 通过、无 skip；思考框、设置与翻译三条主线都有独立回归。

---

## 开发

本机不要用 `pnpm` 脚本（`pnpm install`/`prepare` 可能触发整树依赖重装并因无 TTY 中止），直接跑 `node_modules/.bin`：

```sh
./node_modules/.bin/tsc -p tsconfig.json --pretty false   # 类型检查
./node_modules/.bin/vitest run                           # 全量测试（jsdom）
./node_modules/.bin/tsdown                               # 构建 Host + 浏览器产物到 lib/
node scripts/check-lib-fresh.mjs                         # 确认 lib/ 比 src/client 新
```

- Node：`^22.19.0 || >=24`。
- `lib/index.js` 是 Host 半边，`lib/client.js` 是浏览器 bundle；都由 `tsdown` 生成，**不要手改**。改完源码需要重新构建并刷新/重启宿主。
- 测试替身在 `tests/shims/`：`client-runtime.ts` / `client-locale.ts` 镜像宿主浏览器包的契约（真实包是预构建 bundle，无法在 Vitest 里直接 import）。
- `./node_modules/.bin/vitest run <file>` 可单跑；全量必须保持 129/129 全绿。

---

## 目录结构

```
src/                 Host 半边（插件入口、配置、设置 RPC、翻译桥）
src/client/          浏览器半边（思考框视图、揭示/淡入、卡片、翻译）
tests/               host/client 套件（*.host.spec.tsx / *.client.spec.tsx）
tests/shims/         Vitest 用的宿主包替身
locale/              插件元数据（meta.detail 指向 docs/DETAIL.md）
docs/DETAIL.md       插件页「详情」文档
cordis.patch.yml     作为 bundle 时注入的默认配置层
scripts/             仅保留 check-lib-fresh.mjs
lib/                 构建产物（生成，勿手改）
```

---

## 上游与许可

最初分叉自 [Laplace-bit/dsh-smooth-stream](https://github.com/Laplace-bit/dsh-smooth-stream)（v0.7.0，MIT）；思考框、翻译与设置层为本地改造。

以 MIT 许可发布，详见 [LICENSE](LICENSE)。上游版权归其原作者所有，本分叉的修改同样以 MIT 提供。
