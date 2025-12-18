import type { AFetch } from '@ai/tools'
import type { ChatRequest, ChatResponse, LLMConfig } from './llm.types'
import { afetchBase } from '@ai/tools'
import { ChatRequestSchema, LLMConfigSchema } from './llm.types'
import { AsyncIteratorCancel, formatMessages, streamToJson } from './llm.util'

/**
 * 对兼容 openai v1接口的LLM封装类
 * @see https://docs.ollama.com/api/openai-compatibility#%2Fv1%2Fchat%2Fcompletions
 * @see https://platform.openai.com/docs/api-reference/chat/create
 */
export class LLM {
  /** LLM配置 */
  protected configs: LLMConfig
  /** HTTP请求 */
  protected fetch: AFetch
  /** 当前正在进行的流式请求列表，用于管理和中止请求 */
  protected streamingRequests: Set<AsyncIteratorCancel<object>> = new Set()

  constructor(llmConf: LLMConfig) {
    try {
      this.configs = LLMConfigSchema.parse(llmConf)
      this.fetch = afetchBase({ baseURL: this.configs.baseURL, debug: llmConf.debug })
    }
    catch (error) {
      console.error('🚀 LLMConfig 参数错误:', error)
      throw error
    }
  }

  /** 重载1: 流式响应 */
  chat(
    request: ChatRequest & { stream: true },
  ): Promise<AsyncIteratorCancel<ChatResponse>>
  /** 重载2: 非流式响应 */
  chat(request: ChatRequest & { stream?: false }): Promise<ChatResponse>

  /** 调用OpenAI API 聊天接口 */
  async chat(request: ChatRequest) {
    /** 请求参数 */
    const querys = ChatRequestSchema.parse(request)
    if (querys.messages) {
      querys.messages = formatMessages(querys.messages)
    }
    if (querys.stream) {
      return this.fetchStreamRequest('/api/chat', request)
    }
    else {
      return this.fetchRequest('/api/chat', request)
    }
  }

  /** 普通api请求 */
  async fetchRequest(url: string, options: ChatRequest): Promise<ChatResponse> {
    return await this.fetch<ChatResponse>(url, { method: 'POST', data: options })
  }

  /** 流式api请求, 中途可取消 */
  async fetchStreamRequest(url: string, options: ChatRequest): Promise<AsyncIteratorCancel<ChatResponse>> {
    const abortControl = new AbortController()
    const response = await this.fetch(url, {
      signal: abortControl.signal,
      toJson: false,
      method: 'POST',
      data: options,
    })
    if (!response.body) {
      throw new Error('Missing body')
    }
    const jsonStream = streamToJson<ChatResponse>(response.body)
    const abortItr = new AsyncIteratorCancel(abortControl, jsonStream, () => {
      this.streamingRequests.delete(abortItr)
    })
    this.streamingRequests.add(abortItr)
    return abortItr
  }
}
