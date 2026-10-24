/** Locale bundles for the smooth-stream plugin configuration card. */

/** Dictionary namespace owned by this plugin's settings card. */
export const NS = 'settings.smoothStream'

/**
 * Namespace owning the conversation keys THIS PLUGIN must be able to render
 * but the Harness does not always provide.
 *
 * The plugin consumes keys from two Harness namespaces, and which one owns a
 * given key is not stable across Harness versions:
 *
 * - `conversation` (`dsh-client-ui-conversation`) owns the `image.*` family in
 *   every version, and also owned `message.stopped`, `message.unknownBlock`
 *   and `json.truncated` before those moved to `chat`.
 * - `chat` (`dsh-client-ui-chat`, present from 0.1.5 on) owns `message.think`
 *   and now owns the three keys above. It does not exist at all in rc.6, the
 *   version this package still pins in devDependencies.
 *
 * Neither namespace alone can serve every key this plugin renders, so
 * `index.ts` layers them. This plugin-owned namespace is the final layer; it
 * exists because a plugin may NOT register into `chat` or `conversation` —
 * `LocaleRuntime.register` throws when the (namespace, locale) pair already
 * has an owner, and the Harness owns both.
 */
export const CHAT_NS = 'smoothStream.chat'

/**
 * Keys the plugin resolves through {@link CHAT_NS}. Only keys with no
 * dependable Harness owner belong here; anything the Harness already provides
 * must keep coming from the Harness so a language pack can override it.
 */
export type SmoothStreamChatKey = 'message.think' | 'image.serviceUnavailable'
  /** Reasoning-translation toggle: switch the think box to the translated feed. */
  | 'message.think.translate'
  /** Reasoning-translation toggle: switch back to the original reasoning. */
  | 'message.think.original'
  /** Translation progress status next to the toggle. */
  | 'message.think.translating'
  /** Translation failure status next to the toggle. */
  | 'message.think.translateFailed'
  /** Retry action after a translation failure. */
  | 'message.think.translateRetry'

/** English fallback for {@link SmoothStreamChatKey}. */
export const chatEn: Record<SmoothStreamChatKey, string> = {
  'message.think': 'Think',
  // Removed from the Harness dictionaries in 0.1.5 (rc.6 had it under
  // `conversation`), and the plugin interpolates it into a thrown Error, so
  // the raw key must never reach a reader.
  'image.serviceUnavailable': 'Image service unavailable',
  'message.think.translate': 'Translate',
  'message.think.original': 'Original',
  'message.think.translating': 'Translating…',
  'message.think.translateFailed': 'Translation failed',
  'message.think.translateRetry': 'Retry',
}

/** Simplified Chinese fallback for {@link SmoothStreamChatKey}. */
export const chatZh: Record<SmoothStreamChatKey, string> = {
  'message.think': '思考',
  'image.serviceUnavailable': '图片服务不可用',
  'message.think.translate': '查看译文',
  'message.think.original': '查看原文',
  'message.think.translating': '翻译中…',
  'message.think.translateFailed': '翻译失败',
  'message.think.translateRetry': '重试',
}

/** Locale keys the card renders. */
export type SmoothStreamLocaleKey =
  | 'title' | 'description'
  | 'enabled' | 'enabledHint'
  | 'controlScroll' | 'controlScrollHint'
  | 'preset' | 'presetHint'
  | 'presetRealtime' | 'presetRealtimeHint'
  | 'presetBalanced' | 'presetBalancedHint'
  | 'presetSilky' | 'presetSilkyHint'
  | 'motionPreference' | 'motionPreferenceHint'
  | 'motionAuto' | 'motionAutoHint'
  | 'motionForceSmooth' | 'motionForceSmoothHint'
  | 'motionForceReduced' | 'motionForceReducedHint'
  | 'thinkAutoExpand' | 'thinkAutoExpandHint'
  | 'logarithmicFade' | 'logarithmicFadeHint'
  | 'debugEnabled' | 'debugEnabledHint' | 'debugUnavailable'
  | 'debugPanelTitle' | 'debugPanelToggle' | 'debugPanelClose' | 'debugGuide'
  | 'debugLive' | 'debugIdle' | 'debugUnsaved'
  | 'debugSave' | 'debugDiscard' | 'debugReset' | 'debugCopy' | 'debugCopied'
  | 'debugSectionLive' | 'debugSectionReveal' | 'debugSectionFollow'
  | 'debugFps' | 'debugFrameTime' | 'debugBacklog' | 'debugRevealSpeed' | 'debugProgress'
  | 'debugFollowState' | 'debugFollowing' | 'debugReleased'
  | 'debugLag' | 'debugVelocity' | 'debugReserve' | 'debugCapacity' | 'debugAppliedScale'
  | 'debugTerminalPhase' | 'debugOwnedRunway' | 'debugTerminalBudget' | 'debugBaselineShift'
  | 'debugAnchorDelta' | 'debugPhaseLive' | 'debugPhaseDrain' | 'debugPhaseCascade' | 'debugPhaseNatural'
  | 'debugRevealMultiplier' | 'debugQueuePressure' | 'debugMaxReveal'
  | 'debugSpringStiffness' | 'debugSpringDamping' | 'debugSpringMass'
  | 'debugRunway' | 'debugReserveResponse' | 'debugBackpressureMin'
  | 'debugTipRevealMultiplier' | 'debugTipQueuePressure' | 'debugTipMaxReveal'
  | 'debugTipSpringStiffness' | 'debugTipSpringDamping' | 'debugTipSpringMass'
  | 'debugTipRunway' | 'debugTipReserveResponse' | 'debugTipBackpressureMin'
  | 'readOnly' | 'loading' | 'unavailable' | 'retry'
  | 'version' | 'developmentVersion'
  | 'updates' | 'updateHint' | 'developmentBuild' | 'updateUnavailable'
  | 'update' | 'updating' | 'restartRequired' | 'updateFailed'
  | 'save' | 'saving' | 'discard' | 'unsaved' | 'saveFailed'
  | 'translationTitle' | 'translationHint' | 'translationLoading' | 'translationUnavailable'
  | 'translationBackend' | 'translationBackendHint' | 'translationBackendBundle' | 'translationBackendLlm'
  | 'translationProvider' | 'translationProviderHint' | 'translationModel' | 'translationModelHint'
  | 'translationEffort' | 'translationEffortHint'
  | 'translationTargetLanguage' | 'translationTargetLanguageHint'
  | 'translationMaxTextChars' | 'translationMaxTextCharsHint'
  | 'translationAutoTranslate' | 'translationAutoTranslateHint' | 'translationSaveFailed'

/** English copy. */
export const en: Record<SmoothStreamLocaleKey, string> = {
  title: 'Reasoning display enhancement',
  description: 'How the reasoning box reveals while the model thinks.',
  enabled: 'Enable smooth streaming',
  enabledHint: 'Let this plugin render and follow streaming replies. Turn off to use the built-in Harness renderer.',
  controlScroll: 'Take over scrolling',
  controlScrollHint: 'On by default; smooth-stream writes the conversation scroll position. Turn off to leave bottom-follow to Harness.',
  preset: 'Pacing preset',
  presetHint: 'Smoothing cadence profile for text reveal and glide.',
  presetRealtime: 'Realtime',
  presetRealtimeHint: 'Aggressive cadence, low latency, tracks output closely.',
  presetBalanced: 'Balanced',
  presetBalancedHint: 'Default balance between pace and visual rhythm.',
  presetSilky: 'Silky',
  presetSilkyHint: 'Higher backlog buffer, gentle EMA damping, maximum fluidity.',
  motionPreference: 'Motion',
  motionPreferenceHint: 'How streaming responds to the system reduce-motion setting.',
  motionAuto: 'Follow system',
  motionAutoHint: 'Reduced-motion systems get raw text (accessibility first).',
  motionForceSmooth: 'Always smooth',
  motionForceSmoothHint: 'Keep the smoothing engine even when the system asks for reduced motion.',
  motionForceReduced: 'Always raw',
  motionForceReducedHint: 'Render raw text even when the system allows motion.',
  thinkAutoExpand: 'Auto-expand thinking',
  logarithmicFade: 'Logarithmic fade',
  logarithmicFadeHint: 'Fade new answer and expanded thinking text into view. Follows the motion preference.',
  thinkAutoExpandHint: 'Open the thinking block while it streams. Turn off to keep it collapsed.',
 debugEnabled: 'Show render diagnostics',
  debugEnabledHint: 'Show live streaming and scroll metrics on the right side of the chat. Tune values there, then save them here.',
  debugUnavailable: 'Live diagnostics require a newer plugin Host.',
  debugPanelTitle: 'Render diagnostics',
  debugPanelToggle: 'Toggle render diagnostics',
  debugPanelClose: 'Hide diagnostics panel',
  debugGuide: 'Tune one value at a time while a reply streams. Keep FPS stable and backlog near zero. If text lags, raise the reveal multiplier, queue pressure, or maximum reveal; if a blank gap appears, reduce Predictive runway. Increase damping when the scroll feels springy. Save only after the behavior is stable; Reset restores the production defaults.',
  debugLive: 'Streaming',
  debugIdle: 'Idle',
  debugUnsaved: 'Unsaved tuning',
  debugSave: 'Save tuning',
  debugDiscard: 'Discard changes',
  debugReset: 'Reset tuning',
  debugCopy: 'Copy diagnostics',
  debugCopied: 'Copied',
  debugSectionLive: 'Live renderer',
  debugSectionReveal: 'Reveal tuning',
  debugSectionFollow: 'Scroll tuning',
  debugFps: 'FPS',
  debugFrameTime: 'Frame',
  debugBacklog: 'Backlog',
  debugRevealSpeed: 'Reveal',
  debugProgress: 'Progress',
  debugFollowState: 'Follow',
  debugFollowing: 'Pinned',
  debugReleased: 'Released',
  debugLag: 'Visual lag',
  debugVelocity: 'Velocity',
  debugReserve: 'Reserve',
  debugCapacity: 'Capacity',
  debugAppliedScale: 'Applied scale',
  debugTerminalPhase: 'Terminal phase',
  debugOwnedRunway: 'Owned runway',
  debugTerminalBudget: 'Terminal budget',
  debugBaselineShift: 'Baseline shift',
  debugAnchorDelta: 'Anchor Δ',
  debugPhaseLive: 'live',
  debugPhaseDrain: 'terminal-drain',
  debugPhaseCascade: 'host-cascade',
  debugPhaseNatural: 'natural',
  debugRevealMultiplier: 'Reveal multiplier',
  debugQueuePressure: 'Queue pressure',
  debugMaxReveal: 'Maximum reveal',
  debugSpringStiffness: 'Spring stiffness',
  debugSpringDamping: 'Spring damping',
  debugSpringMass: 'Spring mass',
  debugRunway: 'Predictive runway',
  debugReserveResponse: 'Runway response',
  debugBackpressureMin: 'Minimum backpressure',
  debugTipRevealMultiplier: 'Overall reveal speed multiplier. Higher reveals text faster and clears backlog sooner, but can feel jumpy. Lower is smoother but takes longer to finish.',
  debugTipQueuePressure: 'Backlog acceleration strength. Higher catches up to a growing queue more aggressively; lower keeps speed steadier but may leave backlog.',
  debugTipMaxReveal: 'Hard cap for reveal speed in characters per second. Higher allows faster catch-up; lower limits bursts and keeps motion calmer.',
  debugTipSpringStiffness: 'Scroll spring strength. Higher closes visual lag faster but can feel sharp; lower feels softer but follows more slowly.',
  debugTipSpringDamping: 'Scroll energy damping. Higher suppresses overshoot and jitter but feels heavier; lower feels livelier but may oscillate.',
  debugTipSpringMass: 'Scroll inertia. Higher makes movement slower and heavier; lower makes it react faster but can feel abrupt.',
  debugTipRunway: 'Predictive blank space reserved while content grows. Higher absorbs growth and protects the bottom follow, but can create a larger visible gap; lower reduces blank space but leaves less room to absorb lag.',
  debugTipReserveResponse: 'How quickly the reserved runway opens or closes. Higher changes more gradually; lower reacts faster but can look abrupt.',
  debugTipBackpressureMin: 'Slowest reveal multiplier under scroll pressure. Higher keeps text moving but may increase visual lag; lower slows text more to protect smooth following.',
  readOnly: 'This deployment stores settings read-only.',
  loading: 'Loading plugin settings…',
  unavailable: 'Plugin settings are unavailable in this connection.',
  retry: 'Retry',
  version: 'Version {version}',
  developmentVersion: 'Development version {version}',
  updates: 'Updates',
  updateHint: 'Install the newest npm version, then restart Harness.',
  developmentBuild: 'Linked source; updates are managed in the checkout.',
  updateUnavailable: 'Updates are available only for an npm profile installation.',
  update: 'Update',
  updating: 'Updating…',
  restartRequired: 'Updated. Restart Harness to load the new version.',
  updateFailed: 'The package update failed; your current version is unchanged.',
  save: 'Save',
  saving: 'Saving…',
  discard: 'Discard',
  unsaved: 'Unsaved',
  saveFailed: 'The deployment did not accept these values; they were left for you to correct.',
  translationTitle: 'Reasoning translation channel',
  translationHint: 'Where the translated reasoning comes from. Saved changes apply to the next reasoning block without a restart.',
  translationLoading: 'Loading translation settings…',
  translationUnavailable: 'Translation settings are unavailable in this connection.',
  translationBackend: 'Backend',
  translationBackendHint: 'bundle uses the official reasoning-translation bundle (Google, Bing, DeepSeek official API). llm calls a model route directly, e.g. a free OpenAI-compatible provider.',
  translationBackendBundle: 'Official bundle (bundle)',
  translationBackendLlm: 'Direct model route (llm)',
  translationProvider: 'Provider route (provider)',
  translationProviderHint: 'Harness route id used by the llm backend, for example opencode-go.',
  translationModel: 'Model',
  translationModelHint: 'Exact model id, for example deepseek-v4.1-flash.',
  translationEffort: 'Reasoning effort',
  translationEffortHint: 'Leave empty to use the route default. Unsupported levels fall back to low, then to the route default.',
  translationTargetLanguage: 'Target language',
  translationTargetLanguageHint: 'auto follows the UI language; a tag such as zh, en, or ja overrides it.',
  translationMaxTextChars: 'Fragment limit (characters)',
  translationMaxTextCharsHint: 'Maximum characters per request. Smaller fragments feel more live but send more requests.',
  translationAutoTranslate: 'Auto-translate live reasoning',
  translationAutoTranslateHint: 'New reasoning blocks translate into the target language while they stream. Historical blocks still need the toggle.',
  translationSaveFailed: 'The deployment rejected these values; they were left for you to correct.',
}

/** Simplified Chinese copy. */
export const zh: Record<SmoothStreamLocaleKey, string> = {
  title: '思维链显示增强',
  description: '思考过程在流式输出时如何呈现、如何跟随。',
  enabled: '启用丝滑流式渲染',
  enabledHint: '由本插件渲染并跟随流式回复；关闭后使用 Harness 内置渲染。',
  controlScroll: '接管滚动',
  controlScrollHint: '默认开启，由丝滑流式写入会话滚动位置；关闭后贴底滚动交给 Harness。',
  preset: '手感预设',
  presetHint: '文字吐字节奏与视口跟随阻尼风格。',
  presetRealtime: '激进快速 (realtime)',
  presetRealtimeHint: '缓冲低、流速快，紧跟模型生成。',
  presetBalanced: '均衡自然 (balanced)',
  presetBalancedHint: '官方默认，平衡流速与节奏感。',
  presetSilky: '极致丝滑 (silky)',
  presetSilkyHint: '字符积压缓冲加大、阻尼更高、EMA 平滑度更好，视觉呼吸感最强。',
  motionPreference: '动效偏好',
  motionPreferenceHint: '流式渲染如何响应系统的「减少动态效果」设置。',
  motionAuto: '跟随系统',
  motionAutoHint: '系统开启减少动态效果时直接呈现原始文本（优先无障碍）。',
  motionForceSmooth: '始终平滑',
  motionForceSmoothHint: '即使系统要求减少动态效果，仍保持平滑流式渲染。',
  motionForceReduced: '始终原始',
  motionForceReducedHint: '即使系统允许动效，也直接呈现原始文本。',
  thinkAutoExpand: '自动展开思考',
  logarithmicFade: '对数淡入',
  logarithmicFadeHint: '让回答正文和展开的思考文字由淡变实，遵循动效偏好。',
  thinkAutoExpandHint: '思考块在流式时自动展开；关闭后保持折叠，可手动展开。',
 debugEnabled: '显示渲染调试面板',
  debugEnabledHint: '在聊天右侧显示流式渲染和滚动的实时参数，可在面板中调节并在这里保存。',
  debugUnavailable: '当前 Host 版本不支持实时调试，请先更新插件 Host。',
  debugPanelTitle: '渲染诊断',
  debugPanelToggle: '显示或隐藏渲染诊断',
  debugPanelClose: '收起诊断面板',
  debugGuide: '流式输出时一次只调一个参数，观察帧率、积压和视觉滞后。优先保持帧率稳定、积压接近 0；如果文字滞后，提高揭示倍率、队列压力或最大揭示速度；如果底部出现空白，降低“预测预留空间”。滚动有回弹或抖动时提高阻尼。确认表现稳定后再保存；“恢复默认参数”会回到生产默认值。',
  debugLive: '正在流式输出',
  debugIdle: '空闲',
  debugUnsaved: '参数尚未保存',
  debugSave: '保存参数',
  debugDiscard: '放弃修改',
  debugReset: '恢复默认参数',
  debugCopy: '复制诊断数据',
  debugCopied: '已复制',
  debugSectionLive: '实时渲染',
  debugSectionReveal: '流式参数',
  debugSectionFollow: '滚动参数',
  debugFps: '帧率',
  debugFrameTime: '帧耗时',
  debugBacklog: '积压字符',
  debugRevealSpeed: '揭示速度',
  debugProgress: '渲染进度',
  debugFollowState: '跟随状态',
  debugFollowing: '跟随底部',
  debugReleased: '用户已释放',
  debugLag: '视觉滞后',
  debugVelocity: '滚动速度',
  debugReserve: '预留空间',
  debugCapacity: '安全容量',
  debugAppliedScale: '实际倍率',
  debugTerminalPhase: '收尾阶段',
  debugOwnedRunway: '实体留白',
  debugTerminalBudget: '收尾预算',
  debugBaselineShift: '基线位移',
  debugAnchorDelta: '锚点位移',
  debugPhaseLive: '流式中',
  debugPhaseDrain: '收尾排空',
  debugPhaseCascade: '宿主交接',
  debugPhaseNatural: '自然态',
  debugRevealMultiplier: '揭示倍率',
  debugQueuePressure: '队列压力',
  debugMaxReveal: '最大揭示速度',
  debugSpringStiffness: '弹簧刚度',
  debugSpringDamping: '弹簧阻尼',
  debugSpringMass: '弹簧质量',
  debugRunway: '预测预留空间',
  debugReserveResponse: '预留响应时间',
  debugBackpressureMin: '最小背压倍率',
  debugTipRevealMultiplier: '整体文字揭示速度倍率。调大能更快清空积压，但可能显得跳；调小更平滑，但完成回复需要更久。',
  debugTipQueuePressure: '积压对加速的影响强度。调大能更积极追赶增长中的队列；调小速度更稳定，但积压可能持续。',
  debugTipMaxReveal: '每秒揭示字符数上限。调大允许更快追赶；调小限制突发速度，让动作更平稳。',
  debugTipSpringStiffness: '滚动弹簧刚度。调大更快收拢视觉滞后，但感觉更硬；调小更柔和，但跟随更慢。',
  debugTipSpringDamping: '滚动能量阻尼。调大能抑制过冲和抖动，但感觉更沉；调小更灵活，但可能回弹。',
  debugTipSpringMass: '滚动惯性。调大移动更慢更沉；调小反应更快，但可能显得突兀。',
  debugTipRunway: '内容增长时预留的预测空白。调大更能吸收增长、保护底部跟随，但可能产生更大的可见空区；调小能减少空白，但可吸收滞后的空间也更少。',
  debugTipReserveResponse: '预留空间打开或关闭的响应时间。调大变化更渐进；调小反应更快，但可能显得突变。',
  debugTipBackpressureMin: '滚动压力下允许的最低揭示倍率。调大文字仍会较快前进，但视觉滞后可能增加；调小会更积极减速，以保护跟随平滑。',
  readOnly: '本部署的设置为只读。',
  loading: '正在加载插件设置…',
  unavailable: '当前连接无法访问插件设置。',
  retry: '重试',
  version: '版本 {version}',
  developmentVersion: '开发版本 {version}',
  updates: '更新',
  updateHint: '安装最新 npm 版本后重启 Harness。',
  developmentBuild: '当前为本地链接版本，请在源码目录管理更新。',
  updateUnavailable: '只有 profile 使用 npm 包时才能更新。',
  update: '更新',
  updating: '更新中…',
  restartRequired: '已更新；重启 Harness 后加载新版本。',
  updateFailed: '包更新失败，当前版本未改变。',
  save: '保存',
  saving: '保存中…',
  discard: '放弃修改',
  unsaved: '未保存',
  saveFailed: '本部署没有接受这些值，已保留供你修改。',
  translationTitle: '思考翻译通道',
  translationHint: '思考框里的译文从哪里来。保存后对之后的思考块立即生效，不需要重启。',
  translationLoading: '正在读取翻译设置…',
  translationUnavailable: '当前连接读不到翻译设置。',
  translationBackend: '翻译后端',
  translationBackendHint: 'bundle 使用官方「思考过程翻译」组合包（Google、Bing、DeepSeek 官方 API）；llm 直接调用模型路由，例如免费的 OpenAI 兼容服务。',
  translationBackendBundle: '官方组合包 (bundle)',
  translationBackendLlm: '直连模型路由 (llm)',
  translationProvider: '服务商路由 (provider)',
  translationProviderHint: 'llm 后端使用的 Harness 路由 id，例如 opencode-go。',
  translationModel: '模型',
  translationModelHint: '精确模型 id，例如 deepseek-v4.1-flash。',
  translationEffort: '推理强度 (effort)',
  translationEffortHint: '留空使用路由默认；不支持的档位会自动降级到 low，再退回路由默认。',
  translationTargetLanguage: '目标语言',
  translationTargetLanguageHint: 'auto 跟随界面语言；也可填 zh、en、ja。',
  translationMaxTextChars: '单段上限（字符）',
  translationMaxTextCharsHint: '每次翻译请求最多发送多少字。越小越实时，但请求更多。',
  translationAutoTranslate: '默认自动翻译思考过程',
  translationAutoTranslateHint: '开启后，正在流式输出的思考块会自动逐段翻译；历史思考块仍需手动点「查看译文」。',
  translationSaveFailed: '本部署拒绝了这些值，已保留供你修改。',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'settings.smoothStream': SmoothStreamLocaleKey
    'smoothStream.chat': SmoothStreamChatKey
  }
}
