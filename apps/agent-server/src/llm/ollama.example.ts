import { LLM } from './ollama'

function testLlm() {
  const llmChat = new LLM({
    model: 'qwen3:8b',
    baseURL: 'http://localhost:11434',
  })
  llmChat.chat({
    messages: [
      { role: 'system', content: '用中文回答' },
      { role: 'system', content: '像一个海盗一样回答问题。' },
      { role: 'system', content: '回答中添加一些emoji表情' },
      { role: 'user', content: '在 JavaScript 中，分号是可选的吗？' },
    ],
  })
}

testLlm()
