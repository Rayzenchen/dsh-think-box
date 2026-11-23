# 思维链显示增强（@local/dsh-think-box）

本地分叉的 DeepSeek Harness（`dsh`）浏览器插件。上游是 [Laplace-bit/dsh-smooth-stream](https://github.com/Laplace-bit/dsh-smooth-stream)，分叉基线为上游 **v0.7.0**；本仓库不再跟随上游发布（上游已到 0.8.0，未合并）。

它围绕三件事叠在一起：

1. **思考框**：模型的推理不再是一个需要点开的折叠块，而是「思考」行右侧一块常驻的多行展示窗；
2. **丝滑流式**：正文逐字揭示 + 视口平滑跟随，消掉大段文本突然出现和滚动抖动；
3. **思考翻译**：可选把推理内容翻成界面语言，走官方「思考过程翻译」组合包或任意已注册的模型路由。

[English](README.en.md) · [插件页详情](docs/DETAIL.md)

---

## 功能

### 1. 行内思考窗

- 流式期间，推理文本显示在「思考」行右侧的**行内多行框**里；默认只占三行，不会把对话撑高。
- 点击「思考」行，下方展开完整推理 body（最多 18 行，内容更少时按内容收缩）；再点一次收起。
- 思考结束时做一次「回卷」：先跟到最新一行、停一拍，再匀速回卷到开头，最后收成一行；整段过程只播放一次。
- 已结束的历史推理不再播放回卷，直接以一行摘要态呈现。

### 2. 正文丝滑流式

- 模型的分块到达是突发的，插件把「内容呈现」和「视口运动」拆成两个状态机：正文按到达速率做逐字揭示，视口用阻尼跟随，不再 `scrollTop = scrollHeight` 硬跳。
- 揭示速度带背压：视口快追不上时自动降速，避免文本冲出可视区。
- 手感由 `preset` 控制：`realtime` 更贴近实时、`balanced` 默认、`silky` 更平缓。
- **对数淡入**：新出现的尾部文字由通透渐变到实色，代码、公式、思考摘要等区域会跳过；浏览器不支持文字范围着色时自动退回普通渲染。
- **渲染调试面板**：默认关闭；打开后可在界面右侧看到 FPS、字符积压、跟随滞后等实时指标。

### 3. 思考翻译（可选）

- 思考行右侧提供「查看译文 / 查看原文」切换；翻译只替换思考框显示的文字，不改变揭示与跟随。
- 两种后端：
  - `bundle`：官方「思考过程翻译」组合包（Google / Bing / DeepSeek 官方 API），需在插件页启用该组合包；
  - `llm`：由本插件 Host 侧直接转发给任意已注册的 DSH 模型路由（例如免费的 OpenCode Go DeepSeek 4.1 Flash），按约 4000 字分片。
- 流式过程中会把已完成的片段增量翻译，未完成的末尾保持原文；历史会话里的旧推理块需要手动点击。

---

## 安装与启用（本机）

本机不使用 npm 安装，而是把仓库 link 进 `desktop` profile：

1. profile 的 `package.json` 依赖指向本仓库：
   ```json
   { "@local/dsh-think-box": "link:/Users/wench/Documents/DS Harness/dsh-think-box-plugin" }
   ```
2. 该包出现在 profile 的 `dsh.profile.bundles` 列表里（随仓库内 `cordis.patch.yml` 提供默认配置）。
3. 启动/刷新 DSH Web 后，在**侧栏「插件」页**找到「思维链显示增强（@local/dsh-think-box）」并启用；关闭插件页里的总开关即可把渲染权还给 Harness 内置 UI。

Host 日志出现 `[dsh-think-box] plugin loaded!` 表示宿主半边已加载。

---

## 设置与存储（两处，别混淆）

### 插件页卡片的开关 → profile 条目配置

「思维链显示增强」卡片上的开关（启用丝滑流式、接管滚动、手感 preset、动效偏好、自动展开思考、对数淡入、渲染调试面板及调试参数）**可编辑并持久化在 profile 的条目配置里**：

```
~/.dsh/profiles/<profile>/cordis.patch.yml
```

对应 `id: think-box` 那一行（`name: '@local/dsh-think-box'`）。这些字段是 volatile 配置：保存后写入 profile 补丁，并由宿主 Loader 原地提交到运行中的插件，**不需要重启**，也不会重新挂载渲染器。若 profile 里没有可写的条目（例如未被 Loader 管理的环境），卡片会如实显示为只读。

### 翻译设置 → 独立文件

翻译通道（后端、provider/model、reasoningEffort、目标语言、分片与超时、`autoTranslate`）不写入 profile 条目，而是保存在：

```
~/.dsh/think-box/translation.json
```

`cordis.patch.yml` 里 `translation:` 块只作为**首次启动的种子**；之后以该文件为准。翻译结果按 Session 保存（`llm` 后端的译文只缓存在当前页面内存中，不写 Session 记录）。

---

## 翻译隐私

- 启用翻译并把思考内容发出去，意味着**这些文本会发送到你选择的翻译服务/模型路由**：`bundle` 后端发给官方组合包选中的服务（Google / Bing / DeepSeek 官方 API），`llm` 后端发给 `provider`/`model` 指定的路由。
- 是否自动发送由翻译设置里的 **`autoTranslate`** 决定。本机随仓库 `cordis.patch.yml` 附带的默认值是 **开启**：正在流式输出的思考块会边输出边把已完成片段自动发出去；在插件页关掉它之后，只有手动点击「查看译文」才会发送。
- **历史会话里的旧思考块始终手动**：即使 `autoTranslate` 开启，也要点了才会翻译。
- 不需要翻译时请把翻译通道关掉/不要点击；插件本身不会把对话内容发给上述后端之外的任何地址。

---

## 兼容性

- **实测内核：DSH `0.2.2-rc.5`（本机桌面版）**。本插件依赖若干**非公开接缝**，升级 DSH 后必须回归：
  - 0.2.x 的 keyed Chat 行按 entry 独立渲染，插件用「替换内置 `assistant-step` 行的 component」接管，而不是低优先级 shadow；
  - 0.2.x 会把同一个 assistant step 以 `groupPart` 拆成 reasoning / response 两行挂载，插件按 `groupPart` 过滤，避免重复渲染；
  - 依赖 `data-conversation-scroll` 等 Harness DOM 约定测量滚动容器；
  - 设置卡片走插件自己的 loopback RPC 通道；0.2.x 里 Connection 服务在插件作用域不可注入时，回退到 WebServer 直挂（仍受 loopback + 应用 token 约束）；
  - 设置持久化走 0.2.x 的 `configEditor` + volatile 配置字段，旧版 `settings.register` 命名空间在 0.2.2 已不存在。
- 上游 `dsh-smooth-stream` 已到 **0.8.0**，本分叉基于 **0.7.0**，尚未合并上游后续改动。
- 不要对 `@deepseek-ai/*` 的**运行时符号**做静态导入（类型导入无妨）：宿主可能把裸导入重定向到自己的源码，宿主改名/删符号时会直接炸启动。本仓库只在 Host 半边使用 `schemastery`、在浏览器半边使用 Harness 的 slot/locale/连接契约。

---

## 已知问题

- **回合结束后滚动或输入框位置异常的旧 bug 未结案**：根因仍未确认，排查记录与接手建议见 [`FIX-REPORT-2026-10-11.md`](FIX-REPORT-2026-10-11.md)。在上游侧也未合并修复，遇到时优先按该文档的「未解决的问题」排查。
- **测试套件部分恢复**：当前全量 `269/297` 通过；剩余 28 条是流式几何/时序与对数淡出的既有失败（`stream` 18 条、`logarithmic-fade` 10 条），已登记待处理，**不是全绿**。
- 插件页对「详情」里的相对链接按纯文本处理，文档内不依赖链接跳转。

---

## 开发

本机不要用 `pnpm` 脚本（`pnpm install`/`prepare` 可能触发整树依赖重装并因无 TTY 中止），直接跑 `node_modules/.bin` 下的可执行文件：

```sh
./node_modules/.bin/tsc -p tsconfig.json --pretty false   # 类型检查
./node_modules/.bin/vitest run                           # 全量测试（jsdom）
./node_modules/.bin/tsdown                               # 构建 host + browser 产物到 lib/
node scripts/check-lib-fresh.mjs                          # 确认 lib/ 比 src/client 新
```

- Node 版本：`^22.19.0 || >=24`。
- `lib/index.js` 是 Host 半边，`lib/client.js` 是浏览器 bundle；两者都由 `tsdown` 生成，**不要手改**。Host 通过 `lib/client.js` 的 boot 版本号提供浏览器代码，改完源码需要重新构建并刷新/重启宿主。
- 测试替身在 `tests/shims/`：`client-runtime.ts` / `client-locale.ts` 镜像宿主浏览器包的契约（真实包是 `window.__ModuleLoader__` 形式的预构建 bundle，无法在 Vitest 里直接 import）。
- `./node_modules/.bin/vitest run <file>` 可单跑某个测试文件；重跑全量确认没有新增失败（当前基线 269/297）。
- 可选：`node scripts/run-stream-benchmark.mjs` 记录流式引擎基准；`benchmarks/` 放基准用的 harness。

---

## 目录结构

```
src/                 Host 半边（插件入口、配置、设置 RPC、翻译桥）
src/client/          浏览器半边（React 组件、hook、locales、CSS Modules）
tests/                Host/client 测试（*.host.spec.tsx / *.client.spec.tsx）
tests/shims/          Vitest 用的宿主包替身
locale/               插件元数据与插件页文案（meta.detail 指向 docs/DETAIL.md）
docs/DETAIL.md        插件页「详情」文档
cordis.patch.yml      作为 bundle 时注入的默认配置层
scripts/              基准、诊断与诊断脚本（开发用）
benchmarks/           流式引擎基准 harness
lib/                  构建产物（生成，勿手改）
```

---

## 上游与许可

本仓库修改自 [Laplace-bit/dsh-smooth-stream](https://github.com/Laplace-bit/dsh-smooth-stream)（v0.7.0，MIT）。上游的流式揭示/跟随引擎、动画与部分测试仍被沿用；本分叉在其上重做了思考框、接入了思考翻译，并把设置迁移到 0.2.x 的 profile 配置机制。

以 MIT 许可发布，详见 [LICENSE](LICENSE)。上游版权归其原作者所有，本分叉的修改同样以 MIT 提供。
