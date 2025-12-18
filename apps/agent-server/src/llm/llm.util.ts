import type { ChatRequest } from './llm.types'
import { isString } from '@ai/tools'

/**
 * 格式化消息为各种模型需要的格式
 */
export function formatMessages(msgs: ChatRequest['messages']): any[] {
  return msgs.map((message) => {
    let content = ''
    if (isString(message.content)) {
      content = message.content
    }
    else {
      content = JSON.stringify(message.content)
    }
    return {
      role: message.role,
      content,
    }
  })
}

/**
 * 解析大模型流式返回的 JSON 字符串,并返回一个异步迭代器
 */
export async function* streamToJson<T = any>(stream: ReadableStream<Uint8Array>): AsyncGenerator<T> {
  /**
   * 缓冲区
   * 极端情况下: 大模型流式返回的json可能不完整，需要拼接起来;
   * 每次读取到的 chunk 可能不是一个完整的 JSON 对象，大模型以换行符为一个完整json的标志;
   */
  let buffer = ''
  /** 用于将 chunk 转换为字符串 */
  const decoder = new TextDecoder()
  for await (const chunk of stream) {
    // 读取下一个数据块(chunk)
    buffer += decoder.decode(chunk, { stream: true })
    // 将缓冲区按json结束标记(换行符)分割，每行就是一个完整的 JSON 对象
    const parts = buffer.split('\n')
    buffer = parts.pop() ?? '' // 剩余的内容作为下一次循环的缓冲区(下一行的部分json字符串)
    // 解析当前流返回的完整json
    for (const part of parts) {
      try {
        const json = JSON.parse(part) as T // 解析 JSON 并生成结果
        // console.log('🚀 json:', json)
        yield json
      }
      catch (_error) {
        console.warn('invalid json: ', part)
      }
    }
  }
}

/**
 * 带取消功能 `abort` 的异步迭代器
 */
export class AsyncIteratorCancel<T extends object> {
  private readonly abortController: AbortController
  private readonly itr: AsyncGenerator<T | ErrorConstructor>
  private readonly doneCallback: () => void

  constructor(
    abortController: AbortController,
    itr: AsyncGenerator<T | ErrorConstructor>,
    doneCallback: () => void,
  ) {
    this.abortController = abortController
    this.itr = itr
    this.doneCallback = doneCallback
  }

  abort() {
    this.abortController.abort()
  }

  async* [Symbol.asyncIterator]() {
    for await (const message of this.itr) {
      if ('error' in message) {
        throw new Error(message.error as string)
      }
      yield message
      if ((message as any).done || (message as any).status === 'success') {
        this.doneCallback()
        return
      }
    }
    throw new Error('Did not receive done or success response in stream.')
  }
}

/**
 * 按字符串长度动态计算 max_tokens
 * 核心逻辑：min(max(300, 字符串长度//3), 4000)
 * @param inputText 输入文本
 */
function autoMaxTokens(inputText: string) {
  // 1. 获取输入文本的字符串长度（替代 tokens 计算）
  const inputLength = inputText.length

  // 2. 核心逻辑：和 Python 等价（// 对应 Math.floor 整数除法）
  const baseValue = Math.floor(inputLength / 3) // 对应 input_tokens // 3
  const dynamicValue = Math.max(300, baseValue) // 最低 300
  const finalMaxTokens = Math.min(dynamicValue, 4000) // 最高 4000

  return {
    /** 最大输出 token 数 */
    max_tokens: finalMaxTokens,
    /** 兼容: openai o系列推理模型 */
    max_completion_tokens: finalMaxTokens,
  }
}
