import process from 'node:process'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { PromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { tool } from '@langchain/core/tools'
import { ChatDeepSeek } from '@langchain/deepseek'
import { ChatOllama } from '@langchain/ollama'
import { z } from 'zod'
import { cell } from '../utils'

/**
 * 多领域路由 — Function Calling 分类 + 条件路由
 *
 * 核心思想: 先让 LLM 判断用户问题属于哪个领域，然后路由到该领域的专业 chain。
 *
 * 相比 prompt 硬解析分类，用 Function Calling：
 * - 输出被 schema 硬约束，不可能越界
 * - 不需要 StringOutputParser + zod.parse 兜底
 * - 加分类只需加 enum 成员
 */
export default class RouteChat {
  static cells: string[] = []

  private localLlm = new ChatOllama({
    baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    model: 'qwen2.5:7b',
  })

  private deepSeek = new ChatDeepSeek({
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: 'deepseek-v4-flash',
    modelKwargs: { thinking: { type: 'disabled' } },
  })

  // ===== Function Calling 分类器 =====

  /** 分类 tool：zod schema 自动转 JSON Schema */
  private classifierTool = tool(
    async ({ category }) => category,
    {
      name: 'classify_topic',
      description: '对用户问题所属的领域进行分类',
      schema: z.object({
        // category: z.string().describe('文本分类，如 科技、体育、娱乐、教育'), // 方案1:让 LLM 发挥理解力"而不是"强制归一
        category: z.enum(['computer', 'law', 'unknown']).describe('问题所属领域'), // 方案2: 如果下游需要严格分类消费（比如路由到不同处理管道）
      }),
    },
  )

  /** 分类：使用 function calling，tool_choice 约束必须调用分类工具 */
  private async classify(question: string) {
    const model = this.deepSeek.bindTools([this.classifierTool], {
      tool_choice: { type: 'function', function: { name: 'classify_topic' } },
    })

    const response = await model.invoke([
      ['system', `仔细思考，你有充足的时间进行严谨的思考，然后对用户的问题进行分类，
    当你无法分类到特定分类时，可以分类到 "unknown"`],
      ['human', question],
    ])

    const category: string = response.tool_calls?.[0]?.args?.category
    return category
  }

  // ===== 领域 Chain（RunnableSequence 模式）=====

  private computerChain = RunnableSequence.from([
    PromptTemplate.fromTemplate(`
你是一个计算机科学专家。用专业且易懂的方式回答问题。
注意："LLM" 指大语言模型，非法学硕士。

问题: {question}
回答:`),
    this.localLlm,
    new StringOutputParser(),
    {
      output: input => input,
      role: () => '计算机专家',
    },
  ])

  private lawChain = RunnableSequence.from([
    PromptTemplate.fromTemplate(`
你是一个法律专家。用严谨、专业的语言回答法律问题。
注意："LLM" 指法学硕士，非大语言模型。

问题: {question}
回答:`),
    this.localLlm,
    new StringOutputParser(),
    {
      output: input => input,
      role: () => '法律专家',
    },
  ])

  private generalChain = RunnableSequence.from([
    PromptTemplate.fromTemplate(`
你是一个通用助手。友好地回答用户的问题。

问题: {question}
回答:`),
    this.localLlm,
    new StringOutputParser(),
    {
      output: input => input,
      role: () => '通识专家',
    },
  ])

  private async routeAnswer(category: string, question: string) {
    switch (category) {
      case 'computer':
        return this.computerChain.invoke({ question })
      case 'law':
        return this.lawChain.invoke({ question })
      default:
        return this.generalChain.invoke({ question })
    }
  }

  /** 入口：function calling 分类 → 路由回答 */
  async ask(question: string) {
    const category = await this.classify(question)
    const { output, role } = await this.routeAnswer(category, question)
    return { category, answer: { output, role } }
  }

  /**
   * 基础演示 — 三个领域的问题自动分类并路由
   * 观察 tool_calls.args.category 的值
   */
  @cell
  async basicRouting() {
    const questions = [
      'Python 和 JavaScript 哪个更适合 AI 开发, 一句话回答？',
      '我国民法典关于离婚冷静期是如何规定的？3句话回答',
      '每天跑步五公里对心脏有好处吗？回答是或者否',
    ]

    for (const q of questions) {
      const { category, answer } = await this.ask(q)
      console.log(`\n👤 ${q}`)
      console.log(`🏷️ 分类: ${category}`)
      console.log(`🎭 ${answer.role}: 🤖 ${answer.output}`)
    }
  }

  /**
   * 指定分类 — 跳过分类器，验证每个领域的 prompt 效果
   */
  @cell
  async explicitRouting() {
    const testCases = [
      { category: 'computer', question: '请介绍一下这个领域的热门方向,一句话回答' },
      { category: 'law', question: '请介绍一下这个领域的热门方向,一句话回答' },
    ] as const

    for (const { category, question } of testCases) {
      const answer = await this.routeAnswer(category, question)
      console.log(`\n🔀 分支: ${category}`)
      console.log(`🤖 ${JSON.stringify(answer)}`)
    }
  }

  /**
   * 歧义场景 — 同一个缩写在不同领域含义不同
   * 路由到不同 prompt 后，提示词中的领域上下文消除了歧义
   */
  @cell
  async ambiguousTerms() {
    const questions = [
      'LLM 在 NLP 任务中表现如何？一句话回答',
      '我想申请美国顶尖法学院的 LLM 项目. 一句话回答',
    ]

    for (const q of questions) {
      const { category, answer } = await this.ask(q)
      console.log(`\n👤 ${q}`)
      console.log(`🏷️  分类: ${category}`)
      console.log(`🤖 ${JSON.stringify(answer)}`)
    }
  }
}
