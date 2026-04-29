import process from 'node:process'
import { ToolMessage } from '@langchain/core/messages'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { tool } from '@langchain/core/tools'
import { ChatDeepSeek } from '@langchain/deepseek'
import { ChatOllama } from '@langchain/ollama'
import { z } from 'zod'
import { cell } from '../utils'

/** getWeather 的 Zod schema */
const getWeaterSchema = z.object({
  city: z.string().describe('城市名，如 北京、上海'),
  unit: z.enum(['celsius', 'fahrenheit']).optional().describe('温度单位'),
})

/**
 * LangChain Tools — 在 LangChain 中使用 function calling
 *
 * 相比直接调用 OpenAI 原生接口，LangChain 提供了更高级的抽象：
 * - 用 `tool` + `zod` 定义工具，自动生成 JSON Schema
 * - 自动管理 tool_call → tool_result 的往返流程
 * - 与 Chain、Agent 等原生集成
 */
export default class LangChainTools {
  static cells: string[] = []

  private llm = new ChatOllama({
    baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    model: 'qwen2.5:7b',
  })

  private deepSeek = new ChatDeepSeek({
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: 'deepseek-v4-flash',
    modelKwargs: {
      thinking: { type: 'disabled' },
    }, // 需要关闭思考模式, 思考模式不能完全支持 OpenAI 的接口.
  })

  // ========== 工具定义 ==========

  /** 用 LangChain tool() 定义工具 — zod schema 自动转为 JSON Schema */
  private getWeather = tool(
    async ({ city, unit }) => {
      const tempUnit = unit === 'fahrenheit' ? '°F' : '°C'
      return JSON.stringify({ city, temperature: 26, unit: tempUnit, condition: '晴空万里' })
    },
    {
      name: 'get_weather',
      description: '获取指定城市的当前天气',
      schema: getWeaterSchema,
    },
  )

  /** 获取当前时间的工具 */
  private getCurrentTimeSchema = z.object({
    format: z.enum(['iso', 'locale']).optional().describe('时间格式：iso | locale，默认为 iso'),
  })

  private getCurrentTime = tool(
    async ({ format = 'iso' }) => {
      let currentTime: string
      switch (format) {
        case 'iso':
          currentTime = new Date().toISOString()
          break
        case 'locale':
          currentTime = new Date().toLocaleString()
          break
        default:
          currentTime = new Date().toString()
          break
      }
      return currentTime
    },
    {
      name: 'get_current_time',
      description: '获取当前时间，支持 iso 或 locale 格式',
      schema: this.getCurrentTimeSchema,
    },
  )

  /**
   * 基础用法 — LangChain 自动管理 tool_call 往返
   * model.invoke 一次调用即可拿到最终结果
   */
  @cell
  async basicToolCall() {
    const modelWithTools = this.llm.bindTools([this.getWeather, this.getCurrentTime])
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', 'You are a helpful assistant'],
      ['human', '{input}'],
    ])

    const chain = prompt.pipe(modelWithTools)

    const response = await chain.invoke({ input: '现在时间是多少？' })

    console.log('🚀 response:', response)
    console.log('🤖 回答:', response.content)
    console.log('🔧 tool_calls:', response.tool_calls)
  }

  /**
   * 手动处理 tool_call + tool_result 完整链路
   * 适用于: 需要实际执行业务逻辑（查 DB / 调 API）的场景
   */
  @cell
  async manualToolCall() {
    const model = this.llm.bindTools([this.getWeather, this.getCurrentTime])

    let response = await model.invoke([
      ['system', '你是一个有用的助手。请使用中文回答。'],
      ['human', '北京今天天气怎么样？'],
    ])

    console.log('🔧 tool_calls:', JSON.stringify(response.tool_calls, null, 2))

    if (response.tool_calls) {
      const tools = [this.getWeather, this.getCurrentTime]
      const toolResults = await Promise.all(
        response.tool_calls.map(async (tool) => {
          const fn = tools.find(t => t.name === tool.name) as any
          if (!fn)
            throw new Error(`Unknown tool: ${tool.name}`)
          const result = await fn.invoke(tool.args)
          return new ToolMessage({ content: result, tool_call_id: tool.id! })
        }),
      )

      console.log('🚀 toolResults:', toolResults)
      response = await model.invoke([
        ['system', '你是一个有用的助手。请使用中文回答。'],
        ['human', '北京今天天气怎么样？'],
        response, // 第一次返回的AImsg
        ...toolResults, // 工具调用结果
      ])

      console.log('🤖 最终回答:', response.content)
    }
  }

  /**
   * 使用 tool_choice 控制工具调用行为
   * - tool_choice: 'none' → 不调用任何工具
   * - tool_choice: { type: 'function', function: { name } } → 强制调用指定工具
   */
  @cell
  async toolChoice() {
    const llm = new ChatDeepSeek({
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: 'deepseek-v4-flash',
      modelKwargs: {
        thinking: { type: 'disabled' },
      }, // 需要关闭思考模式, 思考模式不能完全支持 OpenAI 的接口.
    })

    // 1. tool_choice: 'none' — 禁止调用任何工具
    console.log('=== 场景1: tool_choice: "none" ===')
    const modelNoTools = llm.bindTools([this.getWeather, this.getCurrentTime], {
      tool_choice: 'none',
    })

    const response1 = await modelNoTools.invoke([
      ['system', '你是一个有用的助手。'],
      ['human', '北京今天天气怎么样？'],
    ])
    console.log('💬 直接回答（未调用工具）:', response1.content) // 很抱歉，我无法实时获取最新的天气数据。建议您打开手机上的天气应用或访问中国气象局等官方网站，查询北京今天的实时天气情况。
    console.log('🔧 tool_calls:', response1.tool_calls) // []

    // 2. tool_choice: 强制调用指定工具
    console.log('\n=== 场景2: 强制调用 get_weather ===')
    const modelForceWeather = llm.bindTools([this.getWeather, this.getCurrentTime], {
      tool_choice: {
        type: 'function',
        function: { name: 'get_weather' },
      },
    })

    const response2 = await modelForceWeather.invoke([
      ['system', '你是一个有用的助手。'],
      ['human', '你能做什么？'], // 即使用户问题与天气无关，也会强制调用 get_weather
    ])
    console.log('🔧 强制调用工具:', JSON.stringify(response2.tool_calls, null, 2)) // get_weather()

    // 3. tool_choice: 'auto' — 让模型自主选择（默认行为）
    console.log('\n=== 场景3: tool_choice: "auto" (默认) ===')
    const modelAuto = llm.bindTools([this.getWeather, this.getCurrentTime], {
      tool_choice: 'auto',
    })
    const response3 = await modelAuto.invoke([
      ['system', '你是一个有用的助手。'],
      ['human', '现在几点了？'],
    ])
    console.log('🔧 自动选择工具:', JSON.stringify(response3.tool_calls, null, 2)) // get_current_time()
  }

  /** 文本标签工具 — 对文本进行自动分类和打标签 */
  private tagText = tool(
    async ({ text, category, tags, sentiment, language }: {
      text: string
      category: string
      tags: string[]
      sentiment: 'positive' | 'negative' | 'neutral' // 积极/消极/中性
      language: string // 文本的核心语言（应为ISO 639-1代码）
    }) => {
      return JSON.stringify({ text, category, tags, sentiment, language, status: '已标注' })
    },
    {
      name: 'tag_text',
      description: '对文本进行分类、打标签和情感分析',
      schema: z.object({
        text: z.string().describe('原始文本'),
        category: z.string().describe('文本分类，如 科技、体育、娱乐、教育'),
        tags: z.array(z.string()).describe('关键词标签列表'),
        sentiment: z.enum(['positive', 'negative', 'neutral']).describe('情感倾向'),
        language: z.string().describe('文本的核心语言（应为ISO 639-1代码）'),
      }),
    },
  )

  /**
   * 文本标注 — 自动分类 + 打标签 + 情感分析
   * 常用于: 舆情监控、内容审核、CRM 工单分类
   */
  @cell
  async textTagging() {
    const model = this.deepSeek.bindTools([this.tagText], {
      tool_choice: {
        type: 'function',
        function: { name: 'tag_text' },
      },
    })

    const articles = [
      '国足2-1逆转日本队，晋级世界杯决赛圈创造历史',
      'hello world',
      '写代码太难了，👴 不干了',
      '我非常喜欢langChain',
    ]

    for (const text of articles) {
      const response = await model.invoke([
        ['system', '你对文本进行分类、打标签和情感分析。'],
        ['human', text],
      ])
      console.log(`📝 ${text}`)
      console.log('🚀 response:', response)
      console.log(`🏷️  ${JSON.stringify(response.tool_calls?.[0]?.args)}\n`)
    }
  }

  /**
   * 人物关系提取 — 演示嵌套 schema 的使用
   * 从文本中提取多个人物信息和他们之间的关系
   */
  @cell
  async personRelationExtraction() {
    // 人物信息 schema - 提取关于一个人的基本信息
    const personExtractionSchema = z.object({
      name: z.string().describe('人的名字'),
      // 人的年龄，可选字段,因为年龄可能是没有的，避免 llm 硬编一个
      age: z.number().optional().describe('人的年龄，可选字段'),
    }).describe('提取关于一个人的信息')

    // 人物关系提取 schema - 从文本中提取多人信息和他们之间的关系
    const relationExtractSchema = z.object({
      people: z.array(personExtractionSchema).describe('提取所有人'),
      relation: z.string().describe('人之间的关系，尽量简洁'),
    }).describe('提取文本中人物及其关系')

    // 人物关系提取工具
    const extractPersonRelation = tool(
      async ({ people, relation }: {
        people: { name: string, age?: number }[]
        relation: string
      }) => {
        return JSON.stringify({ people, relation, status: '已提取' })
      },
      {
        name: 'extract_person_relation',
        description: '从文本中提取人物信息和他们之间的关系',
        schema: relationExtractSchema,
      },
    )

    const model = this.deepSeek.bindTools([extractPersonRelation], {
      tool_choice: 'any',
    })

    const testCases = [
      '张三今年30岁，他和李四是大学同学，李四28岁。',
      '马云创立了阿里巴巴，张勇曾担任阿里巴巴CEO。',
      '小明和小红是兄妹，他们的父母是老王和王太太。',
    ]

    for (const text of testCases) {
      console.log(`\n📝 输入文本: ${text}`)
      const response = await model.invoke([
        ['system', '你是一个信息提取助手。从文本中提取人物信息和关系。'],
        ['human', text],
      ])
      console.log(`🏷️  提取结果: ${JSON.stringify(response.tool_calls?.[0]?.args, null, 2)}`)
    }
  }

  /**
   * 组合多个工具 — LLM 根据用户意图自动选择合适的工具
   * 无需硬编码路由逻辑
   */
  @cell
  async multiTools() {
    const model = this.llm.bindTools([this.getWeather, this.tagText])

    const requests = [
      '北京明天天气如何？',
      '这篇报道讲的是中国航天员完成太空行走，振奋人心！帮忙分析一下',
    ]

    for (const req of requests) {
      console.log(`👤 ${req}`)
      const response = await model.invoke([
        ['system', '你是一个有用的助手。根据用户问题选择合适的工具。'],
        ['human', req],
      ])

      if (response.tool_calls) {
        for (const tc of response.tool_calls) {
          console.log(`🔧 选择工具: ${tc.name}()`, JSON.stringify(tc.args))
        }
      }
      else {
        console.log('🤖 直接回答:', response.content)
      }
      console.log('')
    }
  }
}
