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
  | 'thinkAutoExpand' | 'thinkAutoExpandHint'
  | 'readOnly' | 'loading' | 'unavailable' | 'retry'
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
  description: 'The inline reasoning box beside the Think row. Answer text is rendered by Harness itself.',
  enabled: 'Enable the reasoning box',
  enabledHint: 'Take over the assistant row to render the inline reasoning box. Turn off to use the built-in Harness renderer.',
  thinkAutoExpand: 'Auto-follow reasoning',
  thinkAutoExpandHint: 'Scroll the inline reasoning box as the model thinks. Turn off to keep the box still while it streams.',
  readOnly: 'This deployment stores settings read-only.',
  loading: 'Loading plugin settings…',
  unavailable: 'Plugin settings are unavailable in this connection.',
  retry: 'Retry',
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
  description: '「思考」行右侧的行内推理窗。正文由 Harness 自身渲染，不再逐字输出。',
  enabled: '启用思考框',
  enabledHint: '接管助手行以显示行内思考窗。关闭后交还给 Harness 内置渲染。',
  thinkAutoExpand: '自动跟随思考',
  thinkAutoExpandHint: '思考流式输出时让行内思考框跟随滚动；关闭后思考框保持不动。',
  readOnly: '当前部署将设置存为只读。',
  loading: '正在加载插件设置…',
  unavailable: '当前连接无法读取插件设置。',
  retry: '重试',
  save: '保存',
  saving: '保存中…',
  discard: '放弃',
  unsaved: '未保存',
  saveFailed: '部署没有接受这些值，已保留供你修改。',
  translationTitle: '思考翻译通道',
  translationHint: '译文从哪里来。保存后对下一段思考生效，无需重启。',
  translationLoading: '正在加载翻译设置…',
  translationUnavailable: '当前连接无法读取翻译设置。',
  translationBackend: '后端',
  translationBackendHint: 'bundle 使用官方「思考过程翻译」组合包（Google、Bing、DeepSeek 官方 API）；llm 直连模型路由，例如免费的 OpenAI 兼容服务。',
  translationBackendBundle: '官方组合包（bundle）',
  translationBackendLlm: '直连模型路由（llm）',
  translationProvider: '服务路由（provider）',
  translationProviderHint: 'llm 后端使用的 Harness 路由 id，例如 opencode-go。',
  translationModel: '模型',
  translationModelHint: '精确的模型 id，例如 deepseek-v4.1-flash。',
  translationEffort: '推理强度',
  translationEffortHint: '留空使用路由默认值；不支持时回退到 low，再回退到路由默认。',
  translationTargetLanguage: '目标语言',
  translationTargetLanguageHint: 'auto 跟随界面语言；也可以填 zh、en、ja 等标签。',
  translationMaxTextChars: '分片上限（字符）',
  translationMaxTextCharsHint: '单个请求的最大字符数。分片越小越接近实时，但请求更多。',
  translationAutoTranslate: '自动翻译流式思考',
  translationAutoTranslateHint: '新产生的思考块在流式过程中自动翻译；历史思考块仍需手动点击。',
  translationSaveFailed: '部署拒绝了这些值，已保留供你修改。',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'settings.smoothStream': SmoothStreamLocaleKey
    'smoothStream.chat': SmoothStreamChatKey
  }
}
