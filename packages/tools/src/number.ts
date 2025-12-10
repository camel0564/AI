import { isNumerLike } from './type-guard'

/**
 * 是否为数字或字符串形式的数字
 */
export const isNumeric = (value: number | string) => isNumerLike(value)

/**
 * 获取整数部分
 */
export function getNumberInteger(x: number) {
  x = Number(x)
  return x < 0 ? Math.ceil(x) : Math.floor(x)
}

/**
 * 获取小数部分
 */
export function getNumberDecimal(x: number) {
  x = Number(x)
  return x % 1
}

/**
 * 是否四舍五入 (小数部分是否大于0.5)
 */
export function numberIsRound(x: number) {
  x = Number(x)
  return Math.round(x % 1) !== 0
}

/**
 * 用于将一个数值限制在指定的范围内 (不低于下边界 且 不超过上边界)
 * @param num 要限制的数值
 * @param min 下边界 最小值
 * @param max 上边界 最大值
 * @returns num | min | max
 */
export function numberClamp(num: number, min: number, max: number) {
  return Math.max(Math.min(num, max), min) //
}

/**
 * 作用同numberClamp 但不要求传入顺序
 */
export function numberClamp2(num: number, a: number, b: number) {
  // const top = Math.max(a, b) // 上边界
  // const bottom = Math.min(a, b) // 下边界
  // const notOverflow = Math.min(num, top) // 不超过上边界: 返回num 或 最大值
  // return Math.max(notOverflow, bottom) // 不低于下边界 且 不超过上边界
  return Math.max(Math.min(num, Math.max(a, b)), Math.min(a, b))
}

/** 小数转百分比 */
export const toPercentage = (num: number) => Number((num * 100).toFixed(2))
/** 随机整数 */
export const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min)
