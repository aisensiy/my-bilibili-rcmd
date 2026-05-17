// LLM 提供商抽象层。三家共用 OpenAI-compatible 的 chat completions 格式，
// 只是 base URL 不同。模型 id 由用户在 UI 里手输（每家文档里查），
// 代码不维护硬编码清单。

export type ProviderId = 'openrouter' | 'glm' | 'deepseek'

export interface ProviderSpec {
  label: string
  baseUrl: string          // 不含尾部斜杠；callProvider 会拼 /chat/completions
  keyUrl: string           // "去 XX 拿 key →" 链接
  blurb: string            // 一句话差异说明
  modelPlaceholder: string // 给模型输入框的 placeholder 示例（不是 default 值）
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
    keyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    blurb: '国内服务，低延迟',
    modelPlaceholder: '例：glm-4-flash',
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    blurb: '国内服务，便宜',
    modelPlaceholder: '例：deepseek-chat',
  },
}

export interface CallProviderOptions {
  provider: ProviderId
  apiKey: string
  model: string
  messages: { role: 'user' | 'system' | 'assistant'; content: string }[]
  responseFormat?: 'json_object'
  maxTokens?: number
  temperature?: number
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
  const url = `${spec.baseUrl}/chat/completions`
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
