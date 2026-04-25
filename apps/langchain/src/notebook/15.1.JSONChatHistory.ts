import type {
  BaseMessage,
  StoredMessage,
} from '@langchain/core/messages'
import fs from 'node:fs'
import path from 'node:path'
import { ConversationChain } from '@langchain/classic/chains'
import { BufferMemory } from '@langchain/classic/memory'
import { BaseListChatMessageHistory } from '@langchain/core/chat_history'
import {
  AIMessage,
  HumanMessage,
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
} from '@langchain/core/messages'
import { ChatOllama } from '@langchain/ollama'
import { cell } from '../utils'

/**
 * 持久化history
 */
export default class HistoryToLocal {
  static cells: string[] = []

  getChatModel() {
    return new ChatOllama({ model: 'qwen2.5:7b' })
  }

  /**
   * 测试保存聊天记录到本地json文件
   */
  @cell
  async testSaveHistory() {
    const history = new JSONChatHistory({
      dir: 'data-chat',
      sessionId: 'test',
    })

    history.clear()
    await history.addMessages([
      new HumanMessage('Hi, 我叫小明'),
      new AIMessage('你好，小明！很高兴认识你。有什么问题或者需要帮助的吗？'),
    ])

    const historyMessages = await history.getMessages()
    // 因为设置了lc_namespace 所以可以正确的发序列化historyMessages
    console.log('🚀 historyMessages:', historyMessages)

    const chatModel = this.getChatModel()
    const memory = new BufferMemory({
      chatHistory: history, // 传入自定义的history类
    })
    const chain = new ConversationChain({ llm: chatModel, memory })
    const res1 = await chain.call({ input: '我叫什么？' })
    console.log('🚀 res1:', res1)
    const currentHistory = await history.getMessages()
    console.log('🚀 currentHistory:', currentHistory)
  }
}

/**
 * history 持久化到数据库中
 *
 * 默认情况下,history存在内存中,
 * 我们需要将历史聊天持久化到任意数据库中.(mysql,redis等)
 */

export interface JSONChatHistoryInput {
  /** 会话id */
  sessionId: string
  /** 存储聊天记录 json 文件的目录 */
  dir: string
}

/**
 * 消息保存为json类
 */
class JSONChatHistory extends BaseListChatMessageHistory {
  // 这里消息会序列化和反序列化, 需要用到langChain的消息历史存储类(langchain.stores.message); 写死即可;
  lc_namespace = ['langchain', 'stores', 'message']

  sessionId: string
  dir: string

  constructor(fields: JSONChatHistoryInput) {
    super(fields)
    this.sessionId = fields.sessionId
    this.dir = fields.dir
  }

  // 添加消息
  async addMessage(message: BaseMessage): Promise<void> {
    const messages = await this.getMessages()
    messages.push(message)
    await this.saveMessagesToFile(messages)
  }

  // 添加多条消息
  async addMessages(messages: BaseMessage[]): Promise<void> {
    const existingMessages = await this.getMessages()
    const allMessages = existingMessages.concat(messages)
    await this.saveMessagesToFile(allMessages)
  }

  // 清除消息
  async clear(): Promise<void> {
    const filePath = path.join(this.dir, `${this.sessionId}.json`)
    try {
      fs.unlinkSync(filePath)
    }
    catch (error) {
      console.error(`Failed to clear chat history from ${filePath}`, error)
    }
  }

  /**
   * 反序列化 message.json 为 Message数组对象
   */
  async getMessages(): Promise<BaseMessage[]> {
    const filePath = path.join(this.dir, `${this.sessionId}.json`)
    try {
      if (!fs.existsSync(filePath)) {
        this.saveMessagesToFile([])
        return []
      }

      const data = fs.readFileSync(filePath, { encoding: 'utf-8' })
      const storedMessages = JSON.parse(data) as StoredMessage[]
      return mapStoredMessagesToChatMessages(storedMessages)
    }
    catch (error) {
      console.error(`Failed to read chat history from ${filePath}`, error)
      return []
    }
  }

  /**
   * 序列化message保存为json文件
   */
  private async saveMessagesToFile(messages: BaseMessage[]): Promise<void> {
    const filePath = path.join(this.dir, `${this.sessionId}.json`)
    const serializedMessages = mapChatMessagesToStoredMessages(messages)
    try {
      fs.writeFileSync(filePath, JSON.stringify(serializedMessages, null, 2), {
        encoding: 'utf-8',
      })
    }
    catch (error) {
      console.error(`Failed to save chat history to ${filePath}`, error)
    }
  }
}
