import { expect, it } from 'vitest'
import { LLM } from './ollama'

function testLlm() {
  const llmChat = new LLM({
    model: 'qwen3:8b',
    baseURL: 'http://localhost:11434',
  })
  llmChat.chat({
    messages: [
      { role: 'developer', content: '像一个海盗一样回答问题。' },
      { role: 'user', content: '在 JavaScript 中，分号是可选的吗？' },
    ],
  })
}

it('llm.ollama.chat 测试简单聊天', () => {
  expect(testLlm())
})
