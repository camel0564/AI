import { it } from 'vitest'
import { LLM } from './llm'

const llm = new LLM({
  baseURL: 'http://localhost:11434',
  apiKey: 'EMPTY',
  debug: true,
})

it('基本聊天', async () => {
  const res = await llm.chat({
    model: 'qwen3:8b',
    messages: [
      { role: 'system', content: '用中文回答' },
      { role: 'user', content: '写一首四句五言的绝句' },
    ],
    stream: false,
    think: false,
  })
  console.log('🚀 res:', res)
}, 10 * 60 * 1000)

it('基本聊天-流式', async () => {
  const streamRes = await llm.chat({
    model: 'qwen3:8b',
    messages: [
      { role: 'system', content: '用中文回答' },
      { role: 'user', content: '写一首两句五言的绝句' },
    ],
    stream: true,
    think: false,
  })
  console.log('🚀 streamRes:', streamRes)
  for await (const res of streamRes) {
    console.log('🚀 res:', res)
  }
}, 10 * 60 * 1000)

it('基本聊天-流式取消', async () => {
  const streamRes = await llm.chat({
    model: 'qwen3:8b',
    messages: [
      { role: 'system', content: '用中文回答' },
      { role: 'user', content: '写一首两句五言的绝句' },
    ],
    stream: true,
    think: true,
  })
  console.log('🚀 streamRes:', streamRes)
  setTimeout(() => {
    streamRes.abort()
  }, 3000)
  for await (const res of streamRes) {
    console.log('🚀 res:', res)
  }
}, 10 * 60 * 1000)
