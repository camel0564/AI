import { expect, it } from 'vitest'
import { getNumberInteger, isNumeric, numberClamp, numberClamp2 } from './number'

// case转化
it('utils.case', () => {
  expect(getNumberInteger(1.1)).toBe(1)
  expect(getNumberInteger(1.9)).toBe(1)

  expect(isNumeric(1.9)).toBe(true)
  expect(isNumeric('1.9')).toBe(true)
  expect(isNumeric('aa')).toBe(false)

  expect(numberClamp(3, 0, 10)).toBe(3)
  expect(numberClamp(-3, 0, 10)).toBe(0)
  expect(numberClamp(20, 0, 10)).toBe(10)

  expect(numberClamp2(3, 0, 10)).toBe(3)
  expect(numberClamp2(3, 10, 0)).toBe(3)
})
