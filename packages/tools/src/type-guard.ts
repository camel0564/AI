// 类型守卫
const toString = Object.prototype.toString
export const isObject = (x: any): x is object => toString.call(x) === '[object Object]'
export const isRecord = <T = any>(x: any): x is Record<string, T> => toString.call(x) === '[object Object]'
export const isString = (x: unknown): x is string => toString.call(x) === '[object String]'
export const isBoolean = (x: unknown): x is boolean => toString.call(x) === '[object Boolean]'
export const isNumber = (x: unknown): x is number => toString.call(x) === '[object Number]'

export const isFunction = (x: unknown): x is AnyFn => typeof x === 'function'

export const isArray = <T = unknown>(x: unknown): x is T[] => Array.isArray(x)

export function isDefined<T>(x: T): x is NonNullable<T> {
  return x !== undefined && x !== null
}

export function isNullable(x: unknown): x is undefined | null {
  return x === undefined || x === null
}

/**
 * 数字 或者 字符串形式的数字 isNumeric
 */
export function isNumerLike(val: unknown): val is number {
  return !Number.isNaN(Number(val))
}

/** 是否为浏览器环境 */
export const isClient = typeof window !== 'undefined' && typeof document !== 'undefined'

export const defaultWindow = isClient ? window : undefined
export const defaultDocument = isClient ? window.document : undefined
type AnyFn = (...args: any[]) => any
/** 空函数 */
export function noop() { }