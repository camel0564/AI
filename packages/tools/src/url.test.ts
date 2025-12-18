import { describe, expect, it } from 'vitest'
import { buildURL, getFileNameByUrl } from './url'

describe('utils.url', () => {
  it('utils.url.getFileNameByUrl', () => {
    expect(getFileNameByUrl('图片')).toBe('图片')
    expect(getFileNameByUrl('图片.png')).toBe('图片.png')
    expect(getFileNameByUrl('./logo.png')).toBe('logo.png')
    expect(getFileNameByUrl('/logo.png')).toBe('logo.png')
    expect(getFileNameByUrl('/Users/home/imgs/logo.png')).toBe('logo.png')
    expect(getFileNameByUrl('https://www.baidu.com/logo.png')).toBe('logo.png')
    expect(getFileNameByUrl('')).toBe('')
  })

  it('utils.url.buildURL', () => {
    expect(buildURL('/chat/completions', 'http://localhost:11434/').href).toBe('http://localhost:11434/chat/completions')
    expect(buildURL('./chat/completions', 'http://localhost:11434/').href).toBe('http://localhost:11434/chat/completions')
    expect(buildURL('chat/completions', 'http://localhost:11434/').href).toBe('http://localhost:11434/chat/completions')
    expect(buildURL('/chat', 'http://localhost:11434/v1/').href).toBe('http://localhost:11434/v1/chat')
    expect(buildURL('./chat', 'http://localhost:11434/v1/').href).toBe('http://localhost:11434/v1/chat')
    expect(buildURL('chat', 'http://localhost:11434/v1/').href).toBe('http://localhost:11434/v1/chat')

    // baseURL 没有 / 结尾的情况, 强制添加/
    expect(buildURL('/chat/completions', 'http://localhost:11434').href).toBe('http://localhost:11434/chat/completions')
    expect(buildURL('./chat/completions', 'http://localhost:11434').href).toBe('http://localhost:11434/chat/completions')
    expect(buildURL('chat/completions', 'http://localhost:11434').href).toBe('http://localhost:11434/chat/completions')
    expect(buildURL('/chat', 'http://localhost:11434/v1').href).toBe('http://localhost:11434/v1/chat')
    expect(buildURL('./chat', 'http://localhost:11434/v1').href).toBe('http://localhost:11434/v1/chat')
    expect(buildURL('chat', 'http://localhost:11434/v1').href).toBe('http://localhost:11434/v1/chat')

    // url 有 / 开头的情况, 强制去掉/
    expect(buildURL('/chat', 'http://localhost:11434/v1/').href).toBe('http://localhost:11434/v1/chat')
    // url 有 / 结尾的情况, 强制去掉/
    expect(buildURL('/chat/', 'http://localhost:11434/v1/').href).toBe('http://localhost:11434/v1/chat')
    expect(buildURL('///chat///', 'http://localhost:11434/v1/').href).toBe('http://localhost:11434/v1/chat')
    // 相对路径
    expect(buildURL('../chat/', 'http://localhost:11434/v1/v2').href).toBe('http://localhost:11434/v1/chat')
    // 无baseURL 情况
    expect(buildURL('http://localhost:11434/v1/chat').href).toBe('http://localhost:11434/v1/chat')
    expect(buildURL('http://localhost:11434/v1/chat/').href).toBe('http://localhost:11434/v1/chat')
  })
})
