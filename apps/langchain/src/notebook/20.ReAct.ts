import process from 'node:process'
import { Calculator } from '@langchain/community/tools/calculator'
import { SerpAPI } from '@langchain/community/tools/serpapi'
import { ChatDeepSeek } from '@langchain/deepseek'
import { ChatOllama } from '@langchain/ollama'
import { createAgent, tool } from 'langchain'
import z from 'zod'
import { cell } from '../utils'

/**
 * ReAct 交互模式
 * reasoning(推理)+acting(行动)
 * ReAct 的意义是在于，这个框架将 llm 的推理能力、调用工具能力、观察能力结合在一起
 */
export default class ReAct {
  static cells: string[] = []

  private localLlm = new ChatOllama({
    baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    model: 'qwen2.5:7b',
    temperature: 0.1,
  })

  private deepSeek = new ChatDeepSeek({
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: 'deepseek-v4-flash',
    modelKwargs: { thinking: { type: 'disabled' } },
    temperature: 0.1,
    maxTokens: 1000,
  })

  @cell
  async hello() {
    console.log('hello world')
  }

  @cell
  async basic() {
    // 1. 模型
    const model = this.deepSeek

    /**
     * 自定义工具 查询用户订单
     */
    const fetchUserOrders = tool(
      /** 工具执行逻辑（支持 async/await → 可查数据库/调用API） */
      async ({ userId }) => {
        try {
          // 真实场景：这里可以调用 MySQL / MongoDB / 外部接口
          console.log(`【工具调用】查询用户 ${userId} 的订单...`)

          // 模拟后端返回
          return {
            userId,
            orders: [
              { orderId: 'ORD2025001', product: 'MacBook Pro', amount: 12999, status: '已发货' },
              { orderId: 'ORD2025002', product: 'AirPods Pro', amount: 1899, status: '待支付' },
            ],
          }
        }
        catch (err: any) {
          return `查询失败：${err?.message}`
        }
      },
      {
        name: 'fetch_user_orders',
        description: '根据用户ID查询该用户的订单列表、商品、金额、状态',
        schema: z.object({
          userId: z.string().describe('用户ID，例如 user_12345'),
        }),
      },
    )
    // const prompt = await pull<PromptTemplate>('hwchase17/react')

    const agent = createAgent({
      model,
      tools: [
        new SerpAPI(process.env.SERP_KEY), // 联网搜索引擎 类似google搜索,
        new Calculator(), // 数学计算工具(llm本身不擅长精确计算),
        fetchUserOrders,
      ],
      systemPrompt: 'You are a helpful assistant.',
    })

    const res = await agent.invoke({
      messages: [
        // { role: 'user', content: '我有 17 美元，现在相当于多少人民币？' },
        { role: 'user', content: '用户 user_789 的订单有哪些？总金额是多少？' },
      ],
    })
    console.log('🚀 res:', res)
  }
}
