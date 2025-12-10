/**
 * 简化的OpenAI API调用模块
 */

import type { ChatParams, LLMConfig } from './llm.types.js'
import process from 'node:process'
import OpenAI from 'openai'

function createOpenAI(config: LLMConfig): OpenAI {
  const { apiKey, baseURL } = config

  // 确保API密钥已设置
  const key = apiKey || process.env.OPENAI_API_KEY

  // 创建OpenAI客户端
  return new OpenAI({
    apiKey: key,
    baseURL,
  })
}

function chatNoStream(client: OpenAI, params: ChatParams) {
  return client.chat.completions.create({
    messages: params.messages,
    model: params.model,
  })
}
