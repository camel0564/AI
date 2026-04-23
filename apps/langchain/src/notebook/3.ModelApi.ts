import process from 'node:process'
import { ChatOllama } from '@langchain/ollama'
import { cell } from '../utils'

/**
 * cell模板
 */
export default class ModelApi {
  static cells: string[] = []

  /**
   * ollama 模型
   */
  @cell
  ollama() {
    const llm = new ChatOllama({
      baseUrl: 'http://localhost:11434',
      model: 'qwen3:8b',
      think: false,
    })
    return llm
  }

  /**
   * 通过调用大模型API和模型进行交互
   */
  @cell
  async sendMsg() {
    const ollama = this.ollama()

    const aiMsg = await ollama.invoke([
      [
        'system',
        '用孙悟空的语言回答用户的问题，保持语言的风格. 语言积极且简洁',
      ],
      ['human', '学习 Langchain.js 难吗?'],
    ])
    console.log('🚀 aiMsg:', aiMsg)
  }

  /**
   * 环境变量
   * 1.设置 使用 import 'dotenv/config' 模块可自动注入 .env 文件
   * 2.获取 使用 process.env 可以获取环境变量
   */
  @cell
  async getEnv() {
    console.log('🚀 process.env:', process.env.HELLO_DOTENV)
    return process.env
  }
}
