import process from 'node:process'
import OpenAI from 'openai'
import { cell } from '../utils'

/**
 * Function Calling — 使用 OpenAI 原生接口实现
 * 让模型根据用户意图选择合适的函数并生成参数
 */
export default class FunctionCall {
  static cells: string[] = []

  private client = new OpenAI({
    baseURL: 'http://localhost:11434/v1',
    apiKey: process.env.OPENAI_API_KEY ?? 'EMPTY',
  })

  /** 定义工具 */
  private tools: OpenAI.ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: '获取指定城市的当前天气',
        parameters: {
          type: 'object',
          properties: {
            city: { type: 'string', description: '城市名，如 北京、上海' },
          },
          required: ['city'],
          additionalProperties: false,
        },
      },
    },
  ]

  /** 模拟工具执行 */
  private async callFunction(name: string, args: Record<string, unknown>) {
    if (name === 'get_weather') {
      const city = args.city as string
      // 模拟天气查询
      return JSON.stringify({ city, temperature: 26, unit: '°C', condition: '晴' })
    }
    throw new Error(`Unknown function: ${name}`)
  }

  /**
   * 基础 Function Calling — 模型自动选择工具
   * 模型会判断何时需要调用函数，返回 function_call
   */
  @cell
  async basicFunctionCall() {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: '你是一个有用的助手。请使用中文回答。' },
      { role: 'user', content: '北京今天天气怎么样？' },
    ]

    const response = await this.client.chat.completions.create({
      model: 'qwen3:8b',
      messages,
      tools: this.tools,
    })

    const msg = response.choices[0].message
    console.log('🚀 模型回复:', msg)

    // 如果模型选择调用函数
    if (msg.tool_calls) {
      for (const toolCall of msg.tool_calls) {
        const name = toolCall.function.name
        const args = JSON.parse(toolCall.function.arguments)
        console.log(`\n🔧 调用工具: ${name}`, args)

        const result = await this.callFunction(name, args)
        console.log('📦 工具返回:', result)

        // 将 tool_call 和 tool_result 追加回对话
        messages.push(msg)
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        })
      }

      // 让模型根据工具结果生成最终回答
      const final = await this.client.chat.completions.create({
        model: 'qwen3:8b',
        messages,
      })
      console.log('\n🤖 最终回答:', final.choices[0].message.content)
    }
  }

  /**
   * 多轮对话中的 Function Calling
   * 演示用户连续提问，模型在上下文中自主选择调用工具
   */
  @cell
  async multiTurnFunctionCall() {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: '你是一个有用的助手。请使用中文回答。' },
    ]

    const questions = [
      '你好',
      '北京今天天气怎么样？',
      '上海呢？',
    ]

    for (const question of questions) {
      console.log(`\n👤 用户: ${question}`)
      messages.push({ role: 'user', content: question })

      const response = await this.client.chat.completions.create({
        model: 'qwen3:8b',
        messages,
        tools: this.tools,
      })

      const msg = response.choices[0].message

      if (msg.tool_calls) {
        messages.push(msg)
        for (const toolCall of msg.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments)
          console.log(`🔧 调用工具: ${toolCall.function.name}`, args)
          const result = await this.callFunction(toolCall.function.name, args)
          messages.push({ role: 'tool', tool_call_id: toolCall.id, content: result })
        }

        const final = await this.client.chat.completions.create({
          model: 'qwen3:8b',
          messages,
        })
        console.log(`🤖 助手: ${final.choices[0].message.content}`)
        messages.push(final.choices[0].message)
      }
      else {
        console.log(`🤖 助手: ${msg.content}`)
        messages.push(msg)
      }
    }
  }

  /**
   * 强制函数调用 — 使用 tool_choice: { type: 'function', function: { name } }
   * 让模型必须调用指定函数
   */
  @cell
  async forcedFunctionCall() {
    const response = await this.client.chat.completions.create({
      model: 'qwen3:8b',
      messages: [
        { role: 'system', content: '你是一个有用的助手。' },
        { role: 'user', content: '你能做些什么？' },
      ],
      tools: this.tools,
      tool_choice: { type: 'function', function: { name: 'get_weather' } },
    })

    const msg = response.choices[0].message
    console.log('🚀 强制调用结果:', msg)
    // 即使问题与天气无关，模型也会调用 get_weather
  }
}
