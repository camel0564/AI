import type { ChatDeepSeekInput } from '@langchain/deepseek'
import type { ChatOllamaInput } from '@langchain/ollama'
import type { ChatOpenAIFields } from '@langchain/openai'
import { ChatDeepSeek } from '@langchain/deepseek'
import { ChatOllama } from '@langchain/ollama'
import { ChatOpenAI } from '@langchain/openai'

/**
 * miniMax 模型 兼容OpenAI的接口
 */
export function getMiniMax(args: ChatOpenAIFields = {}) {
  return new ChatOpenAI({
    configuration: {
      baseURL: 'https://api.minimaxi.com/v1',
    },
    apiKey: process.env.MINIMAX_API_KEY_TOKEN_PLAN,
    model: 'MiniMax-M2.7',
    modelKwargs: { reasoning_split: true }, // 关键：miniMax拆分思考过程, 兼容OpenAI的function call
    ...args,
  })
}

/**
 * deepseek 模型
 */
export function getDeepSeek(args: ChatDeepSeekInput = {}) {
  return new ChatDeepSeek({
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: 'deepseek-v4-flash',
    modelKwargs: {
      thinking: { type: 'disabled' }, // 这里需要禁用思考模式以兼容OpenAI的接口
    },
    ...args,
  })
}

/** 本地模型 可选 qwen2.5:7b 或 qwen3:8b */
export function getOllama(args: ChatOllamaInput = {}) {
  return new ChatOllama({
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5:7b',
    think: false,
    ...args,
  })
}
