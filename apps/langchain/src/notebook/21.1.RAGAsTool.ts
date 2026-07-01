import process from 'node:process'
import { AgentExecutor, createOpenAIToolsAgent } from '@langchain/classic/agents'
import { Calculator } from '@langchain/community/tools/calculator'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { DynamicTool } from '@langchain/core/tools'
import { ChatOpenAI } from '@langchain/openai'
import { cell } from '../utils'
import RAG from './16.0RAG'

/**
 * RAG 作为工具的 Agent
 *
 * 将 RAG chain 封装为 Tool，让 Agent 可以自主调用知识库
 */
export default class RAGAsTool {
  static cells: string[] = []

  private minimax = new ChatOpenAI({
    configuration: {
      baseURL: 'https://api.minimaxi.com/v1', // 放在这里
    },
    // minimaxGroupId: process.env.MINIMAX_GROUP_ID,
    apiKey: process.env.MINIMAX_API_KEY,
    model: 'MiniMax-M2.7-highspeed',
    temperature: 0.1,
  })

  @cell
  async ragAsTool() {
    // 初始化 RAG
    const rag = new RAG()
    const ragChainWithHistory = await rag.ragChainWithHistory()

    // const res1 = await ragChainWithHistory.invoke(
    //   {
    //     question: '桑桑是谁?',
    //   },
    //   {
    //     configurable: { sessionId: `caofangzi-history` },
    //   },
    // )
    // console.log('🚀 res1:', res1)

    // 创建 RAG 工具
    const ragTool = new DynamicTool({
      name: 'search_book_content',
      description:
        '当用户询问关于《草房子》这本书的内容时，比如角色信息、剧情、结局等，应该使用此工具搜索相关原文内容。输入应该是用户的问题。',
      func: async (question: string) => {
        const result = await ragChainWithHistory.invoke(
          { question },
          { configurable: { sessionId: 'rag-agent-session' } },
        )
        return result
      },
    })

    // 工具列表
    const tools = [ragTool, new Calculator()]

    // Agent 提示模板
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个有帮助的助手，可以回答问题和使用工具。'],
      ['placeholder', '{chat_history}'],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}'],
    ])

    const agent = await createOpenAIToolsAgent({
      llm: this.minimax,
      tools,
      prompt,
    })

    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true,
    })

    // 测试 1: 需要检索书的内容
    const result1 = await agentExecutor.invoke({
      input: '《草房子》这本书桑桑的老师是谁？',
    })
    console.log('🚀 RAG 查询结果:', result1)

    // // 测试 2: 普通计算
    // const result2 = await agentExecutor.invoke({
    //   input: '计算一下 234 * 567 等于多少？',
    // })
    // console.log('🚀 计算结果:', result2)
  }
}
