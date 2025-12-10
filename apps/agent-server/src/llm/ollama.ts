/**
 * OpenAI API 兼容模型
 */

import type { Message as ClientMessage } from 'ollama/src/interfaces.js'
import type { ChatConfig, LLMConfig } from './llm.types.js'
import process from 'node:process'
import { isString } from '@ai/tools'
import { Ollama as Client } from 'ollama'
import { ChatConfigSchema, LLMConfigSchema } from './llm.types.js'

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
    const ollama = new Client({
      host: baseURL,
      headers: key ? { Authorization: `Bearer ${key}` } : undefined,
    })
    return ollama
  }

  /** 调用OpenAI API 聊天接口 */
  async chat(chatConf: ChatConfig) {
    const { messages, functions } = ChatConfigSchema.parse(chatConf)
    const model = this.configs.model
    const msgs = this.formatMessages(messages)
    console.log('🚀 msgs:', model, msgs)
    const response = await this.client.chat({
      model,
      messages: msgs,
      stream: true,
    })
    console.log('🚀 response:', response)
    for await (const part of response) {
      process.stdout.write(part.message.content || part.message.thinking || '...')
    }
  }

  formatMessages(messages: ChatConfig['messages']): ClientMessage[] {
    return messages.map((message) => {
      let content = ''
      if (isString(message.content)) {
        content = message.content
      }
      else {
        content = JSON.stringify(message.content)
      }
      return {
        role: message.role,
        content,
      }
    })
  }
}
