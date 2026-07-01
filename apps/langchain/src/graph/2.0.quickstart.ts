import type { ToolMessage } from '@langchain/core/messages'
import type { ConditionalEdgeRouter, GraphNode } from '@langchain/langgraph'
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { tool } from '@langchain/core/tools'
import {
  END,
  MessagesValue,
  ReducedValue,
  START,
  StateGraph,
  StateSchema,
} from '@langchain/langgraph'
import { z } from 'zod/v4'
import { getMiniMax } from '../utils/llm'
import 'dotenv/config'

/**
 * 1. 工具和模型绑定
 */
const model = getMiniMax({
  temperature: 0,
})

const add = tool(
  ({ a, b }) => a + b,
  {
    name: 'add',
    description: 'Add two numbers',
    schema: z.object({
      a: z.number().describe('First number'),
      b: z.number().describe('Second number'),
    }),
  },
)

const multiply = tool(
  ({ a, b }) => a * b,
  {
    name: 'multiply',
    description: 'Multiply two numbers',
    schema: z.object({
      a: z.number().describe('First number'),
      b: z.number().describe('Second number'),
    }),
  },
)

const toolsByName = {
  [add.name]: add,
  [multiply.name]: multiply,
}
const tools = Object.values(toolsByName)
const modelWithTools = model.bindTools(tools)

/**
 * 2. 状态
 * 这个图的状态用于存储消息和大语言模型调用次数。
 */
const MessagesState = new StateSchema({
  messages: MessagesValue,
  llmCalls: new ReducedValue(
    z.number().default(0) as any, // ZodDefault 与 SerializableSchema 类型不完全兼容，需要 as any 转换
    { reducer: (x, y) => x + y },
  ),
})

/**
 * 3. 模型节点
 * 模型节点用于调用大语言模型（LLM）并决定是否调用工具。
 */
const llmCall: GraphNode<typeof MessagesState> = async (state) => {
  const response = await modelWithTools.invoke([
    new SystemMessage(
      '你是一位得力的助手，负责处理一组输入数据的算术运算。',
    ),
    ...state.messages,
  ])
  return {
    messages: [response],
    llmCalls: 1,
  }
}

/**
 * 4. 工具节点
 * 工具节点用于调用工具并返回结果。
 */
const toolNode: GraphNode<typeof MessagesState> = async (state) => {
  const lastMessage = state.messages.at(-1)

  if (lastMessage == null || !AIMessage.isInstance(lastMessage)) {
    return { messages: [] }
  }

  const result: ToolMessage[] = []
  for (const toolCall of lastMessage.tool_calls ?? []) {
    const tool = toolsByName[toolCall.name as keyof typeof toolsByName]
    const observation = await tool.invoke(toolCall)
    result.push(observation)
  }

  return { messages: result }
}

/**
 * 结束逻辑
 * 根据大模型是否发起工具调用来路由至工具节点或结束流程。
 */
const shouldContinue: ConditionalEdgeRouter<typeof MessagesState, 'toolNode'> = (state) => {
  const lastMessage = state.messages.at(-1)

  // Check if it's an AIMessage before accessing tool_calls
  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return END
  }

  // If the LLM makes a tool call, then perform an action
  if (lastMessage.tool_calls?.length) {
    return 'toolNode'
  }

  // Otherwise, we stop (reply to the user)
  return END
}

/**
 * 编译并执行图
 * 该智能体使用StateGraph类构建，并通过compile方法进行编译。
 */
const agent = new StateGraph(MessagesState)
  .addNode('llmCall', llmCall)
  .addNode('toolNode', toolNode)
  .addEdge(START, 'llmCall')
  .addConditionalEdges('llmCall', shouldContinue, ['toolNode', END])
  .addEdge('toolNode', 'llmCall')
  .compile()
const result = await agent.invoke({
  messages: [new HumanMessage('3+4=?')],
})

for (const message of result.messages) {
  console.log(message.toFormattedString())
}
