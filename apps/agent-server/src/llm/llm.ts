import type { ChatRequest, LLMConfig } from './llm.types'
import process from 'node:process'
import { isString } from '@ai/tools'
import { ChatRequestSchema, LLMConfigSchema } from './llm.types'

/**
 * 对兼容 openai v1接口的LLM封装类
 * @see https://docs.ollama.com/api/openai-compatibility#%2Fv1%2Fchat%2Fcompletions
 * @see https://platform.openai.com/docs/api-reference/chat/create
 */
export class LLM {
  /** LLM配置 */
  protected configs: LLMConfig
  /** 当前正在进行的流式请求列表，用于管理和中止请求 */
  protected streamingRequests: Map<string, AbortController> = new Map()

  constructor(llmConf: LLMConfig) {
    try {
      this.configs = LLMConfigSchema.parse(llmConf)
    }
    catch (error) {
      console.error('🚀 LLMConfig 参数错误:', error)
      throw error
    }
  }

  /** 调用OpenAI API 聊天接口 */
  async chat(request: ChatRequest) {
    /** 请求参数 */
    const querys = ChatRequestSchema.parse(request)
    const messages = this.formatMessages(querys)
    console.log('🚀 chat 请求参数:', { querys, messages })

    // const stream = await this.client.chat({
    //   ...querys,
    //   messages,
    //   tools: querys.functions,
    //   stream: false,
    //   think: querys.think,
    // })
    // let inThinking = false
    // let content = ''
    // let thinking = ''

    // for await (const chunk of stream) {
    //   if (chunk.message.thinking) {
    //     if (!inThinking) {
    //       inThinking = true
    //       process.stdout.write('[Thinking]:\n')
    //     }
    //     process.stdout.write(chunk.message.thinking)
    //     thinking += chunk.message.thinking
    //   }
    //   else if (chunk.message.content) {
    //     if (inThinking) {
    //       inThinking = false
    //       process.stdout.write('\n\n[Answer]:\n')
    //     }
    //     process.stdout.write(chunk.message.content)
    //     content += chunk.message.content
    //   }
    // }
    // // 打印结束符防止后续输出被覆盖
    // process.stdout.write('\n')

    // // 合并思考和回答,用于下一次请求 例如: 交给其他类型的agent处理
    // const new_messages = [{ role: 'assistant', thinking, content }]
  }

  async sendRequest(apiPath: string, request: any) {

  }

  /**
   * 格式化消息为各种模型需要的格式
   */
  formatMessages(request: ChatRequest): any[] {
    return request.messages.map((message) => {
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
