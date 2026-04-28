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

  // /** 信息提取工具 — 从非结构化文本中提取结构化数据 */
  // private extractMovieInfo = tool(
  //   async ({ title, year, director, rating }: {
  //     title: string
  //     year: number
  //     director: string
  //     rating: number
  //   }) => {
  //     return JSON.stringify({ title, year, director, rating, status: '已提取' })
  //   },
  //   {
  //     name: 'extract_movie_info',
  //     description: '从用户评论中提取电影信息',
  //     schema: z.object({
  //       title: z.string().describe('电影名称'),
  //       year: z.number().describe('上映年份'),
  //       director: z.string().describe('导演'),
  //       rating: z.number().min(1).max(10).describe('评分'),
  //     }),
  //   },
  // )

  // /** 文本标签工具 — 对文本进行自动分类和打标签 */
  // private tagText = tool(
  //   async ({ text, category, tags, sentiment }: {
  //     text: string
  //     category: string
  //     tags: string[]
  //     sentiment: 'positive' | 'negative' | 'neutral'
  //   }) => {
  //     return JSON.stringify({ text, category, tags, sentiment, status: '已标注' })
  //   },
  //   {
  //     name: 'tag_text',
  //     description: '对文本进行分类、打标签和情感分析',
  //     schema: z.object({
  //       text: z.string().describe('原始文本'),
  //       category: z.string().describe('文本分类，如 科技、体育、娱乐、教育'),
  //       tags: z.array(z.string()).describe('关键词标签列表'),
  //       sentiment: z.enum(['positive', 'negative', 'neutral']).describe('情感倾向'),
  //     }),
  //   },
  // )

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
  async toolChoiceControl() {
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

  // /**
  //  * 信息提取 — 从用户评论中提取结构化数据
  //  * 常用于: 简历解析、表单自动填充、评论分析
  //  * 通过 tool_choice 强制指定工具，让 LLM 只做提取不生成多余内容
  //  */
  // @cell
  // async infoExtraction() {
  //   // bindTools 第二个参数传入工具调用配置
  //   const model = this.llm.bindTools([this.extractMovieInfo], {
  //     tool_choice: 'any',
  //   })

  //   const response = await model.invoke([
  //     ['system', '你是一个信息提取助手。从用户评论中提取结构化信息。'],
  //     ['human', '昨天看了《流浪地球3》，郭帆导演的作品真是越来越棒了，特效炸裂！上映年份2027，我给9分！'],
  //   ])

  //   console.log('📦 提取结果:', JSON.stringify(response.tool_calls, null, 2))
  // }

  // /**
  //  * 文本标注 — 自动分类 + 打标签 + 情感分析
  //  * 常用于: 舆情监控、内容审核、CRM 工单分类
  //  */
  // @cell
  // async textTagging() {
  //   const model = this.llm.bindTools([this.tagText], {
  //     tool_choice: 'any',
  //   })

  //   const articles = [
  //     '英伟达发布新一代GPU，性能提升3倍，股价大涨8%',
  //     '国足2-1逆转日本队，晋级世界杯决赛圈创造历史',
  //     '教育部发布"双减"新规，进一步减轻学生课业负担',
  //   ]

  //   for (const text of articles) {
  //     const response = await model.invoke([
  //       ['system', '你对文本进行分类、打标签和情感分析。'],
  //       ['human', text],
  //     ])
  //     console.log(`📝 ${text}`)
  //     console.log(`🏷️  ${JSON.stringify(response.tool_calls?.[0]?.args)}\n`)
  //   }
  // }

  // /**
  //  * 组合多个工具 — LLM 根据用户意图自动选择合适的工具
  //  * 无需硬编码路由逻辑
  //  */
  // @cell
  // async multiTools() {
  //   const model = this.llm.bindTools([this.getWeather, this.tagText])

  //   const requests = [
  //     '北京明天天气如何？',
  //     '这篇报道讲的是中国航天员完成太空行走，振奋人心！帮忙分析一下',
  //   ]

  //   for (const req of requests) {
  //     console.log(`👤 ${req}`)
  //     const response = await model.invoke([
  //       ['system', '你是一个有用的助手。根据用户问题选择合适的工具。'],
  //       ['human', req],
  //     ])

  //     if (response.tool_calls) {
  //       for (const tc of response.tool_calls) {
  //         console.log(`🔧 选择工具: ${tc.name}`, JSON.stringify(tc.args))
  //       }
  //     }
  //     else {
  //       console.log('🤖 直接回答:', response.content)
  //     }
  //     console.log('')
  //   }
  // }
}
