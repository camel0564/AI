import { ChatMessageHistory } from '@langchain/classic/memory'

import { AIMessage, getBufferString, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { RunnablePassthrough, RunnableSequence, RunnableWithMessageHistory } from '@langchain/core/runnables'
import { ChatOllama } from '@langchain/ollama'
import { cell } from '../utils'

/**
 * Memory 让机器人拥有记忆
 *
 * 1. `History` 完整记录聊天记录
 * 3. `Memory` 在History上筛选最近几天的相关的聊天信息摘要
 */
export default class Memory {
  static cells: string[] = []

  /**
   * 聊天记录是什么
   */
  @cell
  async historyApi() {
    const history = new ChatMessageHistory()
    await history.addMessage(new HumanMessage('你好'))
    await history.addMessage(new AIMessage('有什么我可以帮助你的吗？'))

    const messages = await history.getMessages()
    console.log('🚀 messages:', messages)
  }

  /**
   * 聊天模型 new ChatOllama()
   */
  getChatModel() {
    const chatModel = new ChatOllama({
      model: 'qwen3:8b',
      think: false,
    })
    return chatModel
  }

  /**
   * 手动维护 history (仅用于理解history原理)
   */
  @cell
  async historyManual() {
    const chatModel = this.getChatModel()
    // 系统提示词
    const instructionMsg = new SystemMessage(`你是一位乐于助人的助手。请尽你所能回答所有问题。
    你善于言辞，并能从上下文中提供大量具体细节。
    如果你不知道某个问题的答案，就如实说你不知道。`)
    const prompt = ChatPromptTemplate.fromMessages([
      instructionMsg,
      new MessagesPlaceholder('history_message'), // 占位符, 后续可以通过history_message属性替换为需要给llm的任何历史消息
    ])

    const chain = prompt.pipe(chatModel)

    // 历史消息
    const history = new ChatMessageHistory()
    await history.addMessage(new HumanMessage('你好,我的名字是Tom'))

    // 聊天模型的回复
    const res1 = await chain.invoke({
      history_message: await history.getMessages(),
    })
    console.log('🚀 res1:', res1)
    await history.addMessage(res1)
    await history.addMessage(new HumanMessage('我叫什么名字?'))
    const res2 = await chain.invoke({
      history_message: await history.getMessages(),
    })
    console.log('🚀 res2:', res2)
  }

  /**
   * 利用LangChain自动维护 chat history
   */
  @cell
  async history() {
    const chatModel = this.getChatModel()
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一位乐于助人的助手。请尽你所能回答所有问题。'],
      new MessagesPlaceholder('history_message'), // 对应下面的 historyMessagesKey
      ['human', '{input}'], // 对应下面的 inputMessagesKey 和用户输入对象的key
    ])

    const history = new ChatMessageHistory()
    const chain = prompt.pipe(chatModel).pipe(new StringOutputParser())

    // RunnableWithMessageHistory 可以自动记录历史消息
    const chainWithHistory = new RunnableWithMessageHistory({
      runnable: chain,
      getMessageHistory: _sessionId => history, // 返回历史消息 (这里可以根据会话id,返回对应的历史消息)
      inputMessagesKey: 'input', // 用户提问的 key 的名称 (提取用户输入的问题)
      historyMessagesKey: 'history_message', // 历史消息的 key 的名称(自动注入历史消息)
    })

    const res1 = await chainWithHistory.invoke({
      input: '你好我的名字叫Jerry',
    }, {
      configurable: { sessionId: 'none' },
    })
    console.log('🚀 res1:', res1)
    const res2 = await chainWithHistory.invoke({ input: '我叫什么名字?' }, { configurable: { sessionId: 'none' } })
    console.log('🚀 res2:', res2)
    // 查看历史消息
    console.log(history.getMessages())
  }

  /**
   * 用于生成摘要的 Chain
   * 用法参见 `this.testSummaryChain()`
   */
  async summaryChain() {
    const chatModel = this.getChatModel()
    // 提示词: 生成摘要信息
    const prompt = ChatPromptTemplate.fromTemplate(`
逐步总结所提供的对话内容，在之前的摘要基础上添加新的对话行，并返回一份新的尽可能简洁的摘要。

当前摘要：
{summary}

新的对话内容：
{new_lines}

新摘要：
`)

    const summaryChain = RunnableSequence.from([
      prompt,
      chatModel,
      new StringOutputParser(),
    ])

    return summaryChain
  }

  /** summaryChain的用法 */
  async testSummaryChain() {
    const summaryChain = await this.summaryChain()
    const summary1 = await summaryChain.invoke({
      summary: '',
      new_lines: '你好,我的名字是小明',
    })
    console.log('🚀 summary1:', summary1)
    const summary2 = await summaryChain.invoke({
      summary: summary1,
      new_lines: '我喜欢红色，那种热烈又张扬的颜色，像火焰也像晚霞，总能让人一眼就注意到。每个人心里都有自己偏爱的色彩，它会悄悄透露性格和心情。红色于我而言是热情和勇气，那对你来说呢？在这么多颜色当中，你最中意的是哪一种？',
    })
    console.log('🚀 summary2:', summary2)
  }

  /**
   * 自动生成 chat history 的摘要
   *
   * 这里摘要就是历史对话的总结,类似记忆一样,记住chat history 中有价值的信息.
   */
  @cell
  async historySummary() {
    const summaryChain = await this.summaryChain()
    // this.testSummaryChain() // summaryChain 的用法

    const chatModel = this.getChatModel()
    const instructionMsg = `你是一个乐于助人的助手。请尽你所能回答所有问题。

以下是对话历史的摘要：
{history_summary}
`
    const chatPrompt = ChatPromptTemplate.fromMessages([
      ['system', instructionMsg],
      ['human', '{input}'],
    ])

    let summary = ''
    /** 历史消息 */
    const history = new ChatMessageHistory()

    /**
     * RunnablePassthrough 的用法
     * 1. 没有参数 new RunnablePassthrough() 仅将input传递给下一个chain
     * 2. 方法参数,则传递input的同时执行一个方法; new RunnablePassthrough({func: (input)=> void})
     * 3. assign() 不影响input并且添加新的值到对象
     */
    const chatChain = RunnableSequence.from([
      {
        input: new RunnablePassthrough({
          func: (input: string) => history.addUserMessage(input),
        }),
      }, // 一个 RunnableMap 对象, 将input添加到历史消息,并将input传递给下一个chain
      RunnablePassthrough.assign({
        history_summary: () => summary,
      }),
      chatPrompt,
      chatModel,
      new StringOutputParser(),
      new RunnablePassthrough({
        // 这里的input参数是聊天模型的输出回答
        func: async (input: any) => {
          // 将chatModel的输出信息添加到history
          history.addAIMessage(input) // 此时history中包含了2条信息: 用户的问题和助手的回答信息
          const messages = await history.getMessages()
          // 将history的信息转为字符串
          const new_lines = getBufferString(messages)
          console.log('🚀 new_lines:\n', new_lines)
          // 使用summaryChain生成新的摘要信息
          const newSummary = await summaryChain.invoke({
            summary,
            new_lines,
          })
          // 保留最新的摘要信息
          summary = newSummary
          console.log('🚀 summary:', summary)
          // 清空本次对话的history, 这样每一次对话都只有最新的消息 + 摘要信息
          history.clear()
        },
      }),
    ])

    await chatChain.invoke('我喜欢红色，那种热烈又张扬的颜色，像火焰也像晚霞，总能让人一眼就注意到。每个人心里都有自己偏爱的色彩。红色于我而言是热情和勇气，你喜欢什么颜色?')
    await chatChain.invoke('请你猜一下我喜欢肯德基还是麦当劳?')
  }
}
