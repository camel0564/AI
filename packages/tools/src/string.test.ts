import { expect, it } from 'vitest'
import { camelTokeba, getFileNameByPath, kebaToCamel } from './string'

it('utils.string', () => {
  expect(getFileNameByPath('图片')).toBe('图片')
  expect(getFileNameByPath('图片.png')).toBe('图片.png')
  expect(getFileNameByPath('./logo.png')).toBe('logo.png')
  expect(getFileNameByPath('/logo.png')).toBe('logo.png')
  expect(getFileNameByPath('/Users/home/imgs/logo.png')).toBe('logo.png')
  expect(getFileNameByPath('https://www.baidu.com/logo.png')).toBe('logo.png')
  expect(getFileNameByPath('')).toBe('')

  expect(camelTokeba('fooBar')).toBe('foo-bar')
  expect(camelTokeba('foo-bar')).toBe('foo-bar')
  expect(camelTokeba('foo-bar')).toBe('foo-bar')
  expect(kebaToCamel('loading', true)).toBe('Loading')
})
