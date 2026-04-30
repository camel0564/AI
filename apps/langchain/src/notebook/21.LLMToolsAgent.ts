import process from 'node:process'
import { AgentExecutor, createOpenAIToolsAgent } from '@langchain/classic/agents'
import { Calculator } from '@langchain/community/tools/calculator'
import { SerpAPI } from '@langchain/community/tools/serpapi'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { ChatDeepSeek } from '@langchain/deepseek'
import { cell } from '../utils'

/**
 * OpenAI Tools Agent — 使用 LLM 原生的 tool calling 能力实现 Agent
 *
 * 缺点: 更加黑盒, 思考,决策过程不可见;
 *
 * 相比 ReAct 模式，OpenAI Tools Agent 依赖模型自身的 function calling 微调，
 * 能稳定生成合法的工具调用参数，不会出现低性能模型的 parse 报错。
 * prompt 极其简洁，因为模型本身已具备自主决策工具调用的能力。
 *
 * prompt (hwchase17/openai-tools-agent):
 *   [
 *     ["system", "You are a helpful assistant"],
 *     {chat_history},
 *     ["HUMAN", "{input}"],
 *     {agent_scratchpad}
 *   ]
 */
export default class LLMToolsAgent {
  static cells: string[] = []

  private deepSeek = new ChatDeepSeek({
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: 'deepseek-v4-flash',
    modelKwargs: { thinking: { type: 'disabled' } },
    temperature: 0.1,
  })

  @cell
  async basicOpenAIToolsAgent() {
    // 工具
    const tools = [new SerpAPI(process.env.SERP_KEY), new Calculator()]

    // 本地定义 OpenAI Tools Agent 提示模板
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', 'You are a helpful assistant'],
      ['placeholder', '{chat_history}'],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}'],
    ])

    const agent = await createOpenAIToolsAgent({
      llm: this.deepSeek,
      tools,
      prompt,
    })

    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true,
    })

    const result = await agentExecutor.invoke({
      input: '我有 18 美元，现在相当于多少人民币？',
    })

    console.log('🚀 结果:', result)
  }
}
