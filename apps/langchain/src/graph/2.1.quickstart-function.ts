import type { BaseMessage } from '@langchain/core/messages'
import type { ToolCall } from '@langchain/core/messages/tool'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { tool } from '@langchain/core/tools'
import {
  addMessages,
  entrypoint,
  task,
} from '@langchain/langgraph'
import * as z from 'zod'
import { getMiniMax } from '../utils/llm'
import 'dotenv/config'

/**
 * 1.定义模型和工具
 */
const model = getMiniMax({ temperature: 0 })
// 工具
const add = tool(({ a, b }) => a + b, {
  name: 'add',
  description: 'Add two numbers',
  schema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
})

const multiply = tool(({ a, b }) => a * b, {
  name: 'multiply',
  description: 'Multiply two numbers',
  schema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
})

// 绑定工具
const toolsByName = {
  [add.name]: add,
  [multiply.name]: multiply,
}
const tools = Object.values(toolsByName)
const modelWithTools = model.bindTools(tools)

/**
 * 2. 模型节点 用于调用大语言模型（LLM）并决定是否调用工具。
 */
const callLlm = task({ name: 'callLlm' }, async (messages: BaseMessage[]) => {
  return modelWithTools.invoke([
    new SystemMessage(
      '你是一个专业的算术助手，负责执行算术运算。',
    ),
    ...messages,
  ])
})

/**
 * 3. 工具节点 用于调用工具并返回结果。
 */
const callTool = task({ name: 'callTool' }, async (toolCall: ToolCall) => {
  const tool = toolsByName[toolCall.name as keyof typeof toolsByName]
  return tool.invoke(toolCall)
})

/**
 * 4. 智能体节点 用于协调模型和工具节点，直到没有工具调用为止。
 */
const agent = entrypoint({ name: 'agent' }, async (messages: BaseMessage[]) => {
  let modelResponse = await callLlm(messages)

  while (true) {
    if (!modelResponse.tool_calls?.length) {
      break
    }

    // Execute tools
    const toolResults = await Promise.all(
      modelResponse.tool_calls.map(toolCall => callTool(toolCall)),
    )
    messages = addMessages(messages, [modelResponse, ...toolResults])
    modelResponse = await callLlm(messages)
  }

  return messages
})

// Invoke

const result = await agent.invoke([new HumanMessage('一加二等于几?')])

for (const message of result) {
  // console.log(`[${message.type}]: ${message.text}`)
  console.log(message.toFormattedString())
}
