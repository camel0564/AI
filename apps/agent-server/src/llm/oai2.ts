/**
 * 纯函数式的OpenAI LLM实现（TypeScript）
 * 使用openai ts sdk，不使用任何class
 */

import type { ContentItem, FunctionCall, FunctionDefinition, GenerateConfig, LLMResponse, Message } from './types'
import OpenAI from 'openai'
import { ModelServiceError } from './types'

// OpenAI客户端配置类型
export interface OpenAIClientConfig {
  model?: string
  apiKey?: string
  baseUrl?: string
  timeout?: number
}

// 创建OpenAI客户端
function createOpenAIClient(config: OpenAIClientConfig): OpenAI {
  const {
    apiKey = process.env.OPENAI_API_KEY || 'EMPTY',
    baseUrl = process.env.OPENAI_API_BASE || '',
    timeout = 30000,
  } = config

  return new OpenAI({
    apiKey: apiKey.trim(),
    baseURL: baseUrl.trim() || undefined,
    timeout,
  })
}

// 转换消息格式以适配OpenAI API
function convertMessagesToOpenAIMessages(messages: Message[]): OpenAI.ChatCompletionMessageParam[] {
  return messages.map((msg) => {
    const openAIMsg: OpenAI.ChatCompletionMessageParam = {
      role: msg.role as any,
      content: '',
    }

    // 处理不同类型的内容
    if (typeof msg.content === 'string') {
      openAIMsg.content = msg.content
    }
    else if (Array.isArray(msg.content)) {
      openAIMsg.content = msg.content.map((item: ContentItem) => {
        if (item.text) {
          return { type: 'text', text: item.text }
        }
        else if (item.image) {
          return { type: 'image_url', image_url: { url: item.image } }
        }
        return { type: 'text', text: JSON.stringify(item) }
      })
    }

    // 处理函数调用
    if (msg.function_call) {
      openAIMsg.function_call = {
        name: msg.function_call.name,
        arguments: msg.function_call.arguments,
      }
      openAIMsg.name = msg.name
    }

    return openAIMsg
  })
}

// 转换OpenAI响应为Qwen-Agent消息格式
function convertOpenAIResponseToMessages(
  response: OpenAI.ChatCompletion | OpenAI.ChatCompletionChunk,
): Message[] {
  const messages: Message[] = []

  if ('choices' in response && response.choices.length > 0) {
    const choice = response.choices[0]
    const message = choice.message

    if (message) {
      const qwenMsg: Message = {
        role: message.role as any,
        content: message.content || '',
      }

      // 处理函数调用
      if (message.function_call) {
        qwenMsg.function_call = {
          name: message.function_call.name,
          arguments: message.function_call.arguments,
        }
        qwenMsg.name = message.name
      }

      messages.push(qwenMsg)
    }
  }

  return messages
}

// 处理流式响应
async function* handleStreamResponse(
  stream: AsyncIterable<OpenAI.ChatCompletionChunk>,
  deltaStream: boolean = false,
): AsyncGenerator<Message[], void, unknown> {
  if (deltaStream) {
    // 增量流式输出
    for await (const chunk of stream) {
      if ('choices' in chunk && chunk.choices.length > 0) {
        const choice = chunk.choices[0]
        if (choice.delta && choice.delta.content) {
          yield [{
            role: 'assistant',
            content: choice.delta.content,
          }]
        }
      }
    }
  }
  else {
    // 累积流式输出
    let fullContent = ''
    let fullFunctionCall: FunctionCall | undefined

    for await (const chunk of stream) {
      if ('choices' in chunk && chunk.choices.length > 0) {
        const choice = chunk.choices[0]
        if (choice.delta) {
          // 累积内容
          if (choice.delta.content) {
            fullContent += choice.delta.content
          }

          // 累积函数调用
          if (choice.delta.function_call) {
            if (!fullFunctionCall) {
              fullFunctionCall = {
                name: choice.delta.function_call.name || '',
                arguments: choice.delta.function_call.arguments || '',
              }
            }
            else {
              if (choice.delta.function_call.name) {
                fullFunctionCall.name += choice.delta.function_call.name
              }
              if (choice.delta.function_call.arguments) {
                fullFunctionCall.arguments += choice.delta.function_call.arguments
              }
            }
          }

          // 生成当前累积的消息
          const messages: Message[] = []
          if (fullContent) {
            messages.push({
              role: 'assistant',
              content: fullContent,
            })
          }
          if (fullFunctionCall) {
            messages.push({
              role: 'assistant',
              content: '',
              function_call: fullFunctionCall,
            })
          }

          if (messages.length > 0) {
            yield messages
          }
        }
      }
    }
  }
}

// 转换生成配置为OpenAI API参数
function convertGenerateConfig(
  config: GenerateConfig = {},
): Omit<OpenAI.ChatCompletionCreateParams, 'messages' | 'model'> {
  const openAIParams: Omit<OpenAI.ChatCompletionCreateParams, 'messages' | 'model'> = {
    temperature: config.temperature,
    top_p: config.top_p,
    max_tokens: config.max_tokens,
    stop: config.stop,
    presence_penalty: config.presence_penalty,
    frequency_penalty: config.frequency_penalty,
  }

  // 处理函数调用相关参数
  if (config.function_choice) {
    openAIParams.function_call = config.function_choice as any
  }

  // 移除undefined值
  Object.keys(openAIParams).forEach((key) => {
    if (openAIParams[key as keyof typeof openAIParams] === undefined) {
      delete openAIParams[key as keyof typeof openAIParams]
    }
  })

  return openAIParams
}

// 核心聊天函数（支持流式和非流式）
export async function openAIChat(
  messages: Message[],
  config: OpenAIClientConfig = {},
  functions?: FunctionDefinition[],
  stream: boolean = false,
  deltaStream: boolean = false,
  generateCfg?: GenerateConfig,
): Promise<LLMResponse> {
  try {
    const client = createOpenAIClient(config)
    const openAIMessages = convertMessagesToOpenAIMessages(messages)
    const openAIParams = convertGenerateConfig(generateCfg)
    const model = config.model || 'gpt-4o-mini'

    // 处理函数定义
    if (functions && functions.length > 0) {
      openAIParams.functions = functions as any
    }

    if (stream) {
      // 流式响应
      const streamResponse = await client.chat.completions.create({
        model,
        messages: openAIMessages,
        stream: true,
        ...openAIParams,
      })

      return handleStreamResponse(streamResponse, deltaStream) as any
    }
    else {
      // 非流式响应
      const response = await client.chat.completions.create({
        model,
        messages: openAIMessages,
        stream: false,
        ...openAIParams,
      })

      return convertOpenAIResponseToMessages(response)
    }
  }
  catch (error) {
    throw new ModelServiceError(
      error as Error,
      'OpenAI_API_Error',
      error instanceof Error ? error.message : 'Unknown OpenAI API error',
    )
  }
}

// 快速聊天函数（简化版）
export async function openAIQuickChat(
  prompt: string,
  config: OpenAIClientConfig = {},
  generateCfg?: GenerateConfig,
): Promise<string> {
  const messages: Message[] = [
    { role: 'user', content: prompt },
  ]

  const response = await openAIChat(messages, config, undefined, false, false, generateCfg)

  if (Array.isArray(response) && response.length > 0) {
    const msg = response[0]
    if (typeof msg.content === 'string') {
      return msg.content
    }
  }

  return 'No response received'
}

// 导出默认函数
export default {
  chat: openAIChat,
  quickChat: openAIQuickChat,
}
