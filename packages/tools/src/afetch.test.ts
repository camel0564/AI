import { expect, it } from 'vitest'
import { afetch, afetchBase } from './afetch'

interface Res {
  args: { q1: string }
  json: { d: string, dd: string }
  url: string
  origin: string
  headers: Record<string, string>
}

const http = afetchBase({
  baseURL: 'https://echo.apifox.com',
  debug: false,
})

it('测试 fetch 请求', async () => {
  // get 请求
  const res = await afetch<Res>('https://echo.apifox.com/get', {
    method: 'get',
    query: { q1: 'hello' },
  })
  expect(res.args.q1).toEqual('hello')
})

it('测试 post 请求', async () => {
  const res2 = await http<Res>('/post', {
    method: 'post',
    data: { d: 'd1', dd: 'd2' },
    query: { q1: 'hello2' },
  })
  expect(res2.json.d).toEqual('d1')
})

// 5s 延迟
it('测试 5s 延迟', async () => {
  const abortController = new AbortController()
  setTimeout(() => abortController.abort(), 2000) // 两秒后取消
  const res3 = await http<Res>('/delay/5', {
    method: 'get',
    query: { q1: '3s' },
    signal: abortController.signal,
  }).catch((err: DOMException) => {
    console.log('🚀 取消fetch成功:', err?.message)
  })
  expect(res3).toEqual(undefined)
}, 30000)
