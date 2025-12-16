import { expect, it } from 'vitest'
import { afetch } from './afetch'

it('测试 fetch 请求', () => {
  return afetch('https://www.baidu.com').then((res) => {
    expect(res.status).toBe(200)
  })
})
