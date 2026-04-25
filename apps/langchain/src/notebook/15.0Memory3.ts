import { BufferMemory } from '@langchain/classic/memory'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables'
import { ChatOllama } from '@langchain/ollama'
import { cell } from '../utils'

/**
 * 在 LCEL 中集成 memory
 */
export default class Memory3 {
  static cells: string[] = []

  getChatModel() {
    return new ChatOllama({ model: 'qwen2.5:7b' })
  }

  /**
   * 在 Chain 中集成 Memory
   *
   * 1. loadMemoryVariables 方法可以获取到记忆内容
   * 2. saveContext 可以保存记忆内容
   */
  @cell
  async memoryChain() {
    const chatModel = new ChatOllama({
      model: 'qwen2.5:7b',
      verbose: true,
    })
    const memory = new BufferMemory()

    const TEMPLATE = `
你是一个乐于助人的 ai 助手。尽你所能回答所有问题。

这是跟人类沟通的聊天历史:
{history}

据此回答人类的问题:
{input}
`
    const prompt = ChatPromptTemplate.fromTemplate(TEMPLATE)

    // 存储用户输入
    let tempInput = ''

    const chain = RunnableSequence.from([
      {
        input: new RunnablePassthrough(), // 透传用户输入
        memoryObject: async (input) => {
          const history = await memory.loadMemoryVariables({
            input,
          })
          console.log('🚀 history:', history)
          tempInput = input
          return history
        }, // 提取memory变量值 (这里函数也是Runnable对象)
      },
      RunnablePassthrough.assign({
        history: input => input.memoryObject.history,
      }), // 添加数据 {input: xx, +history: x}
      prompt,
      chatModel,
      new StringOutputParser(), // 基础3件套 llm输入输出内容
      new RunnablePassthrough({
        func: async (output: any) => {
          await memory.saveContext({
            input: tempInput,
          }, {
            output,
          })
        },
      }), // 将用户的输入和模型输出保存到memory中
    ])

    const res1 = await chain.invoke('我是小红')
    console.log('🚀 res1:', res1)
    const res2 = await chain.invoke('我叫什么名字?')
    console.log('🚀 res2:', res2)
  }
}
