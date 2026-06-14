// LLM 提供商抽象层。所有 provider 共用 OpenAI-compatible 的 chat completions 格式，
// 只是 base URL 不同。模型 id 由用户在 UI 里手输（每家文档里查），
// 代码不维护硬编码清单。
//
// 'custom' 是通用 OpenAI 兼容入口：base URL 由用户配置，可接任意自部署或第三方服务
// （longcat、ollama、vLLM、One-API 等等）。custom 路径只在用户明确选 off/low 时发
// thinking.disabled（关思考），不发开启思考的字段；其余情况不带任何思考参数。
// 仍能识别不了关闭开关的端点，靠 test 连接的 maxTokens 抬升 fallback 兜底。

export type ProviderId = 'openrouter' | 'glm' | 'deepseek' | 'custom'

export interface ProviderSpec {
  label: string
  baseUrl: string          // 不含尾部斜杠；callProvider 会拼 /chat/completions。custom 留空，由用户在设置里填
  keyUrl: string           // "去 XX 拿 key →" 链接
  blurb: string            // 一句话差异说明
  modelPlaceholder: string // 给模型输入框的 placeholder 示例（不是 default 值）
  baseUrlPlaceholder?: string // 仅 custom 有：base URL 输入框的示例
}

export const PROVIDERS: Record<ProviderId, ProviderSpec> = {
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyUrl: 'https://openrouter.ai/keys',
    blurb: '国外服务，模型最全（GPT / Claude / Gemini 都有）',
    modelPlaceholder: '例：openai/gpt-4o-mini',
  },
  glm: {
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    keyUrl: 'https://open.bigmodel.cn/apikey/platform',
    blurb: '国内服务，低延迟',
    modelPlaceholder: '例：GLM-5.1',
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    blurb: '国内服务，便宜',
    modelPlaceholder: '例：DeepSeek-V4-Flash',
  },
  custom: {
    label: '自定义',
    baseUrl: '',
    keyUrl: 'https://longcat.chat/platform/api_keys',
    blurb: '任意 OpenAI 兼容服务（longcat / ollama / 自部署都行）',
    modelPlaceholder: '例：LongCat-Flash-Chat',
    baseUrlPlaceholder: '例：https://api.longcat.chat/openai/v1',
  },
}

/**
 * 把 custom provider 的 baseUrl 转换成 Chrome match pattern。
 * 例：'https://api.longcat.chat/openai/v1' → 'https://api.longcat.chat/*'
 * 用于 chrome.permissions.contains / request 的 origins 字段。
 * 返回 null 表示 URL 无法解析。
 */
export function customOriginPattern(baseUrl: string | undefined): string | null {
  if (!baseUrl) return null
  try {
    const u = new URL(baseUrl.trim())
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    return `${u.protocol}//${u.host}/*`
  } catch {
    return null
  }
}

/**
 * 确保 custom provider baseUrl 所在域的 host_permission 已授予。未授予时弹
 * Chrome 原生授权框（必须在用户手势上下文调用——onClick 第一个 await 之前最稳）。
 * MV3 下扩展页 fetch 一个不在 host_permissions 里的 URL 会被 CORS / 安全检查拦截，
 * 即便目标 ACAO 头是开放的；走 optional_host_permissions 一次性授权后即放行。
 */
export async function ensureCustomHostPermission(
  baseUrl: string | undefined,
): Promise<{ ok: true } | { ok: false; reason: 'bad-url' | 'denied' }> {
  const pattern = customOriginPattern(baseUrl)
  if (!pattern) return { ok: false, reason: 'bad-url' }
  const has = await chrome.permissions.contains({ origins: [pattern] })
  if (has) return { ok: true }
  const granted = await chrome.permissions.request({ origins: [pattern] })
  return granted ? { ok: true } : { ok: false, reason: 'denied' }
}

export interface CallProviderOptions {
  provider: ProviderId
  apiKey: string
  model: string
  messages: { role: 'user' | 'system' | 'assistant'; content: string }[]
  // 仅 provider==='custom' 时使用，覆盖 spec.baseUrl。其他 provider 忽略此字段。
  baseUrl?: string
  responseFormat?: 'json_object'
  maxTokens?: number
  temperature?: number
  // 控制思考模型的推理强度。是否生效、能识别哪些值，取决于具体 provider/模型。
  // - OpenRouter：'off' → reasoning.enabled=false；'low/medium/high' → reasoning.effort
  // - GLM 原生 (智谱)：只有 thinking.disabled 开关，'off' 和 'low' 都映射成关闭
  // - DeepSeek 原生：V4 系列同样用 thinking.disabled 开关，'off' 和 'low' 映射成关闭
  //   （旧模型 deepseek-chat/reasoner 在 2026-07 之前被替换；旧模型可能忽略此参数）
  // - custom：同二档逻辑，'off'/'low' → thinking.disabled；不认此字段的端点会忽略它
  // 不传则使用模型默认。
  reasoning?: 'off' | 'low' | 'medium' | 'high'
  // 启用 SSE 流式响应。开启后会逐 chunk 调用 onChunk，最终 result.content
  // 仍是完整文本。OpenAI 兼容协议下三家 provider 都支持。
  stream?: boolean
  onChunk?: (delta: {
    contentDelta: string
    reasoningDelta: string
    contentSoFar: string
    reasoningSoFar: string
  }) => void
}

export type CallProviderResult =
  | { ok: true; content: string }
  | { ok: false; errorStatus?: number; errorMessage?: string }

export async function callProvider(opts: CallProviderOptions): Promise<CallProviderResult> {
  const spec = PROVIDERS[opts.provider]
  if (!opts.apiKey.trim()) {
    return { ok: false, errorMessage: 'API Key 不能为空' }
  }
  if (!opts.model.trim()) {
    return { ok: false, errorMessage: '模型 id 不能为空' }
  }
  // custom 走用户配置的 base URL；其他 provider 用 spec.baseUrl。
  const baseUrl = opts.provider === 'custom' ? (opts.baseUrl ?? '').trim() : spec.baseUrl
  if (!baseUrl) {
    return { ok: false, errorMessage: 'Base URL 不能为空' }
  }
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${opts.apiKey}`,
    'Content-Type': 'application/json',
  }
  // HTTP-Referer / X-Title 是 OpenRouter 的可选 attribution header，
  // 其他 provider 用不到，按 active provider 条件附加。
  if (opts.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com/aisensiy/my-bilibili-rcmd'
    headers['X-Title'] = 'My Bilibili Rcmd'
  }

  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
  }
  if (opts.responseFormat) body.response_format = { type: opts.responseFormat }
  if (typeof opts.maxTokens === 'number') body.max_tokens = opts.maxTokens
  if (typeof opts.temperature === 'number') body.temperature = opts.temperature
  if (opts.stream) body.stream = true
  if (opts.reasoning) {
    // 各 provider 的思考控制参数：
    // - OpenRouter：标准 reasoning.enabled / reasoning.effort（支持三档）
    // - GLM 原生 / DeepSeek V4 原生：thinking.type 只有 enabled|disabled 二档
    // - custom：略过——目标服务参数未知，不冒险发任何思考开关
    if (opts.provider === 'openrouter') {
      body.reasoning = opts.reasoning === 'off'
        ? { enabled: false }
        : { effort: opts.reasoning }
    } else if (
      opts.provider === 'glm' ||
      opts.provider === 'deepseek' ||
      opts.provider === 'custom'
    ) {
      // 二档 provider 无 medium/high 概念；只在用户明确想"少思考"时关掉。
      // custom 也走这条：很多自定义端点（GLM/DeepSeek 兼容、vLLM 等）默认开思考，
      // 不发关闭开关就会狂想几万字。只在 off/low 时发 thinking.disabled——这是最常见的
      // 关闭字段，且仅在用户明确要少思考时才发，未知端点忽略它即可，默认行为不变。
      if (opts.reasoning === 'off' || opts.reasoning === 'low') {
        body.thinking = { type: 'disabled' }
      }
    }
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      return { ok: false, errorStatus: response.status, errorMessage: errText }
    }
    if (opts.stream) return readStream(response, opts.onChunk)
    const data = await response.json()
    const choice = data?.choices?.[0]
    const message = choice?.message
    const content = message?.content
    if (typeof content === 'string' && content.length > 0) {
      return { ok: true, content }
    }
    // Thinking 模型（kimi、glm 在 OpenRouter 上默认开启思考）会把 max_tokens 用在
    // 推理上，content 返回 null，文本落在 reasoning 字段。把 reasoning 当作回退，
    // 否则用户看到的就是"响应缺少 content"这种无效错误信息。
    const reasoning = typeof message?.reasoning === 'string' ? message.reasoning : ''
    if (reasoning.length > 0) {
      return { ok: true, content: reasoning }
    }
    const finishReason = choice?.finish_reason
    const hint = finishReason === 'length'
      ? '（finish_reason=length，max_tokens 可能被思考预算吃光了，试着调大）'
      : finishReason
        ? `（finish_reason=${finishReason}）`
        : ''
    return { ok: false, errorMessage: `响应缺少 content 字段${hint}` }
  } catch (e) {
    return { ok: false, errorMessage: e instanceof Error ? e.message : String(e) }
  }
}

async function readStream(
  response: Response,
  onChunk: CallProviderOptions['onChunk'],
): Promise<CallProviderResult> {
  if (!response.body) return { ok: false, errorMessage: '流式响应没有 body' }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let contentSoFar = ''
  let reasoningSoFar = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      // SSE 按行分割，最后一段可能不完整，留在 buffer 等下次拼。
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (!data || data === '[DONE]') continue
        let parsed: any
        try { parsed = JSON.parse(data) } catch { continue }
        const delta = parsed?.choices?.[0]?.delta
        if (!delta) continue
        const contentDelta = typeof delta.content === 'string' ? delta.content : ''
        // OpenRouter 用 reasoning，DeepSeek/部分模型用 reasoning_content。
        const reasoningDelta = typeof delta.reasoning === 'string'
          ? delta.reasoning
          : typeof delta.reasoning_content === 'string'
            ? delta.reasoning_content
            : ''
        if (!contentDelta && !reasoningDelta) continue
        contentSoFar += contentDelta
        reasoningSoFar += reasoningDelta
        onChunk?.({ contentDelta, reasoningDelta, contentSoFar, reasoningSoFar })
      }
    }
  } catch (e) {
    return { ok: false, errorMessage: e instanceof Error ? e.message : String(e) }
  }

  if (contentSoFar.length > 0) return { ok: true, content: contentSoFar }
  if (reasoningSoFar.length > 0) return { ok: true, content: reasoningSoFar }
  return { ok: false, errorMessage: '流式响应未返回任何文本' }
}
