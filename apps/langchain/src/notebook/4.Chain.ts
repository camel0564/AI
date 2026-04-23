import { HumanMessage } from '@langchain/core/messages'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatOllama } from '@langchain/ollama'
import ModelApi from './3.ModelApi'
import { cell } from '../utils'

/**
 * LCEL / Chain: 链式调用
 * 基于 Runnable 类接口实现
 * Runnable 对象有 invoke/batch/stream 3个常用方法
 */
export default class Chain {
  static cells: string[] = []

  /**
   * 简单的Chain 即:链式调用
   */
  @cell
  chain() {
    const llm = new ModelApi().ollama()
    const outputParse = new StringOutputParser()
    // 使用pipe链式调用
    const chain = llm.pipe(outputParse)
    return chain
  }

  /**
   * Runnable 对象的 invoke 方法，用于单次调用
   */
  @cell
  async invoke() {
    const chain = this.chain()
    // invoke 单个执行
    const msg1 = await chain.invoke([
      new HumanMessage('hello'),
    ])
    console.log(msg1)
  }

  /**
   * Runnable 对象的 batch 方法，用于批量调用
   */
  @cell
  async batch() {
    const chain = this.chain()
    const results = await chain.batch([
      [new HumanMessage('你是谁?')],
      [new HumanMessage('1+1=?')],
    ])
    console.log('🚀 results:', results)
  }

  /**
   * Runnable 对象的 stream 方法，用于流式调用
   */
  @cell
  async stream() {
    const chain = this.chain()
    const stream = await chain.stream([
      new HumanMessage('讲一个笑话'),
    ])
    for await (const chunk of stream) {
      console.log(chunk)
    }
  }

  /**
   * fallback 可以在chain任何环节失败时给出备用解决方案
   *
   * 例如一个复杂的chain,可以设置一个非常简单的chain作为兜底方案,可以在极端环境下保证至少有输出。
   */
  @cell
  async fallback() {
    // 模拟失败的LLM模型
    const fakeLLM = new ChatOllama({
      baseUrl: 'http://localhost:80',
      model: 'xxx',
      maxRetries: 0,
    })

    // await fakeLLM.invoke("hello")

    const realLLM = new ChatOllama({
      baseUrl: 'http://localhost:11434',
      model: 'qwen3:8b',
      think: false,
    })

    const outputParse = new StringOutputParser()
    const llmWithFallback = fakeLLM
      .withFallbacks({ fallbacks: [realLLM] })
      .pipe(outputParse)

    const msg = await llmWithFallback.invoke('hello')
    console.log(msg)
  }
}
