/**
 * OpenAI API 兼容模型
 */

import type { Message as ClientMessage } from 'ollama'
import type { ChatConfig, LLMConfig } from './llm.types'
import process from 'node:process'
import { isString } from '@ai/tools'
import { Ollama as Client } from 'ollama'
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
    const ollama = new Client({
      host: baseURL,
      headers: key ? { Authorization: `Bearer ${key}` } : undefined,
    })
    return ollama
  }

  /** 调用OpenAI API 聊天接口 */
  async chat(chatConf: ChatConfig) {
    const model = this.configs.model
    const cfgs = ChatConfigSchema.parse(chatConf)
    const msgs = this.formatMessages(cfgs.messages)
    console.log('🚀 chat 配置:', { model, cfgs, msgs })

    const stream = await this.client.chat({
      model,
      messages: msgs,
      tools: cfgs.functions,
      stream: false,
      think: cfgs.think,
    })
    let inThinking = false
    let content = ''
    let thinking = ''

    for await (const chunk of stream) {
      if (chunk.message.thinking) {
        if (!inThinking) {
          inThinking = true
          process.stdout.write('[Thinking]:\n')
        }
        process.stdout.write(chunk.message.thinking)
        thinking += chunk.message.thinking
      }
      else if (chunk.message.content) {
        if (inThinking) {
          inThinking = false
          process.stdout.write('\n\n[Answer]:\n')
        }
        process.stdout.write(chunk.message.content)
        content += chunk.message.content
      }
    }
    // 打印结束符防止后续输出被覆盖
    process.stdout.write('\n')

    // 合并思考和回答,用于下一次请求 例如: 交给其他类型的agent处理
    const new_messages = [{ role: 'assistant', thinking, content }]
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
