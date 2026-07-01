import type { GraphNode } from '@langchain/langgraph'
import { END, MessagesValue, START, StateGraph, StateSchema } from '@langchain/langgraph'
import 'dotenv/config'

// 定义状态
const State = new StateSchema({
  // 因为 MessagesValue 的 reducer 是追加（append），所以在节点中返回 { messages: [newMsg] } 时，不会覆盖原有消息，而是把新消息拼接到历史消息后面。
  messages: MessagesValue,
})
console.log('🚀 State:', State)

// 定义节点函数
const mockLlm: GraphNode<typeof State> = (state) => {
  console.log('🚀 state:', state)
  return { messages: [{ role: 'ai', content: 'hello world' }] } // 此消息会push到State.messages数组后面
}

// START → mock_llm → END
const graph = new StateGraph(State)
  .addNode('mock_llm', mockLlm)
  .addEdge(START, 'mock_llm')
  .addEdge('mock_llm', END)
  .compile()

// 执行图
const res = await graph.invoke({ messages: [{ role: 'user', content: 'hi!' }] })
console.log('🚀 res:', res)
