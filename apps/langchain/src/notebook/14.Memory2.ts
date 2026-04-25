import { ConversationChain } from '@langchain/classic/chains'
import { BufferMemory, BufferWindowMemory, ConversationSummaryBufferMemory, ConversationSummaryMemory, ENTITY_MEMORY_CONVERSATION_TEMPLATE, EntityMemory } from '@langchain/classic/memory'
import { PromptTemplate } from '@langchain/core/prompts'
import { ChatOllama } from '@langchain/ollama'
import { cell } from '../utils'

/**
 * 本节所讲的API已经过时, 主要为了理解记忆机制
 *
 * 重点关注不同的记忆机制的特点.
 */
export default class Memory2 {
  static cells: string[] = []

  getChatModel() {
    return new ChatOllama({ model: 'qwen2.5:7b' })
  }

  /**
   * 方案1. 全记住 BufferMemory
   * 最基础: 完整记忆聊天记录
   *
   * {"input": "x",history": "所有历史对话"}
   */
  @cell
  async bufferMemory() {
    const chatModel = this.getChatModel()
    const memory = new BufferMemory()
    const chain = new ConversationChain({
      llm: chatModel,
      memory,
      verbose: true,
    })
    const res1 = await chain.call({ input: '我是小明' })
    console.log('🚀 res1:', res1)
    const res2 = await chain.call({ input: '我叫什么？' })
    console.log('🚀 res2:', res2)
  }

  /**
   * 方案2. 最近几个 BufferWindowMemory
   * 为聊天记录增加了一个窗口, 只记忆k个对话
   *
   * {"input": "x",history": "k个对话"}
   */
  @cell
  async BufferWindowMemory() {
    const model = this.getChatModel()
    const memory = new BufferWindowMemory({ k: 1 })
    const chain = new ConversationChain({ llm: model, memory, verbose: true })
    const res1 = await chain.call({ input: '我是小明' })
    console.log('🚀 res1:', res1)
  }

  /**
   * 方案3. 摘要
   * 使用 llm 渐进式的总结聊天记录生成 summary
   *
   * {"input": "x", "summary": "历史对话的摘要信息"}
   */
  @cell
  async ConversationSummaryMemory() {
    // 摘要
    const summaryModel = this.getChatModel()
    const memory = new ConversationSummaryMemory({
      memoryKey: 'summary',
      llm: summaryModel,
    })

    const model = this.getChatModel()
    const prompt = PromptTemplate.fromTemplate(`
你是一个乐于助人的助手。尽你所能回答所有问题。

这是聊天记录的摘要:
{summary}
Human: {input}
AI:`)
    const chain = new ConversationChain({ llm: model, prompt, memory, verbose: true })

    const res1 = await chain.call({ input: '我是小明' })
    const res2 = await chain.call({ input: '我叫什么？' })
  }

  /**
   * 方案3 结合方案3和方案1
   *
   * 根据上下文历史的token数量,如果过大就切换到summary;较小就用全部的原始聊天记录
   */
  @cell
  async ConversationSummaryBufferMemory() {
    const summaryModel = this.getChatModel()
    const memory = new ConversationSummaryBufferMemory({
      llm: summaryModel,
      maxTokenLimit: 200,
    })
    const chatModel = this.getChatModel()
    const chain = new ConversationChain({ llm: chatModel, memory, verbose: true })
    const res1 = await chain.call({ input: '我是小明,你是谁' })
    console.log('🚀 res1:', res1)
  }

  /**
   * 方案4 模拟人类对话,建立各种实体（Entity）的记忆
   * 多了一个 entity字段 记录各种实体(事物)的特点;
   * { "entities": {
   *     "康师傅": "康师傅是一家合资公司，主要从事方便食品的生产和销售，包括各种品牌的方便面和其他速食产品。",
   *     "小明": "18岁"
   * }
   */
  @cell
  async entityMemory() {
    const memoryModel = new ChatOllama({ model: 'qwen2.5:7b' })
    const memory = new EntityMemory({
      llm: memoryModel,
      chatHistoryKey: 'history',
      entitiesKey: 'entities',
    })
    const chatModel = this.getChatModel()
    const chain = new ConversationChain({
      llm: chatModel,
      prompt: ENTITY_MEMORY_CONVERSATION_TEMPLATE,
      memory,
      verbose: true,
    })
    const res1 = await chain.call({ input: '我叫小明，今年 18 岁' })
    const res2 = await chain.call({ input: '康师傅 是一家合资公司，主要是售卖方便面的公司' })
    console.log('🚀 res2:', res2)
    const res3 = await chain.call({ input: '介绍小明和 康师傅' })
    console.log('🚀 res3:', res3)
  }
}
