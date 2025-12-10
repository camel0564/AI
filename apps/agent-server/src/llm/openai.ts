/**
 * OpenAI API 兼容模型
 */

import type { ChatConfig, LLMConfig } from './llm.types'
import process from 'node:process'
import Client from 'openai'
import { ChatConfigSchema, LLMConfigSchema } from './llm.types'

export class LLM {
  /** OpenAI客户端 */
  protected client: Client
  /** LLM配置 */
  protected configs: LLMConfig

  constructor(llmConf: LLMConfig) {
    try {
      this.configs = LLMConfigSchema.parse(llmConf)
      console.log('🚀 this.configs:', this.configs)
      this.client = this.initOpenAI(this.configs)
    }
    catch (error) {
      console.error('🚀 LLMConfig 参数错误:', error)
      throw error
    }
  }

  /** 初始化OpenAI客户端 */
  initOpenAI(llmConf: LLMConfig) {
    const { apiKey, baseURL } = llmConf

    // 确保API密钥已设置
    const key = apiKey || process.env.OPENAI_API_KEY

    // 创建OpenAI客户端
    return new Client({
      apiKey: key,
      baseURL,
    })
  }

  /** 调用OpenAI API 聊天接口 */
  async chat(chatConf: ChatConfig) {
    const { messages, functions } = ChatConfigSchema.parse(chatConf)

    const request = {
      model: this.configs.model,
      input: messages,
      tools: functions,
    } as any
    console.log('🚀 request:', request)
    const response = await this.client.responses.create(request)
    console.log('🚀 response:', response)
  }
}
