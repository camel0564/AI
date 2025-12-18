import { expect, it } from 'vitest'
import { camelTokeba, kebaToCamel } from './string'

it('utils.string', () => {
  expect(camelTokeba('fooBar')).toBe('foo-bar')
  expect(camelTokeba('foo-bar')).toBe('foo-bar')
  expect(camelTokeba('foo-bar')).toBe('foo-bar')
  expect(kebaToCamel('loading', true)).toBe('Loading')
})
