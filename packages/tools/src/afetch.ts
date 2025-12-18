import { isRecord, isString } from './type-guard'
import { buildURL } from './url'

export type AFetchMethod = 'get' | 'GET' | 'delete' | 'DELETE' | 'head' | 'HEAD' | 'options' | 'OPTIONS' | 'post' | 'POST' | 'put' | 'PUT' | 'patch' | 'PATCH' | 'purge' | 'PURGE' | 'link' | 'LINK' | 'unlink' | 'UNLINK'

/** fetch 参数 */
export interface AFetchOptions extends RequestInit {
  /** 请求方法 */
  method?: 'get' | 'post' | 'delete' | 'put' | 'head' | 'options' | AFetchMethod
  /** 基础 URL */
  baseURL?: string
  /** 查询字符串 */
  query?: Record<string, any> | string | URLSearchParams | null
  /**
   * 提交简单数据到请求体
   * @desc 默认通过 JSON 方式提交数据
   * @desc 可通过 dataType 指定其他方式(form-data, text)
   * @desc 其他数据类型请使用 `body` 手动处理
   */
  data?: Record<string, any> | null
  /**
   * 设置提交数据方式; @default `json`
   * @desc 仅在 `data` 存在时有效; 其他数据类型请使用 `body` 手动处理
   * @desc `json` 处理为 JSON.stringify(data) 且 `'Content-Type': 'application/json;charset=utf-8'`
   * @desc `form-data` 处理为 FormData(data)
   * @desc `query` 处理为 URLSearchParams(data)
   * @desc `NULL` 表示使用原始数据不处理
   */
  dataType?: 'json' | 'form-data' | 'query' | 'NULL'
  /** 是否调用 response.json(); false 时返回 Response  @default true */
  toJson?: boolean
  /** 开启调试模式 开启后会打印请求信息 */
  debug?: boolean
}

/** 构建 fetch 请求查询字符串 */
function buildFetchQuery(query: AFetchOptions['query']): URLSearchParams | undefined {
  if (!query) {
    return undefined
  }
  if (query instanceof URLSearchParams) {
    return query
  }
  if (isString(query)) {
    return new URLSearchParams(query)
  }
  if (isRecord(query)) {
    return new URLSearchParams(query)
  }
}

/** options 转为 fetch 请求体 */
function optionsToFetch(options: AFetchOptions): RequestInit {
  const ignoreKeys: (keyof AFetchOptions)[] = ['baseURL', 'query', 'data', 'dataType', 'toJson', 'debug']
  const realFetchOpts = { ...options }
  ignoreKeys.forEach((key) => {
    delete realFetchOpts[key]
  })
  return realFetchOpts
}

interface AFetchBody {
  dataType: AFetchOptions['dataType']
  body: FormData | URLSearchParams | string
}
function buildFetchBody(data: AFetchOptions['data'], dataType: AFetchOptions['dataType']): AFetchBody | undefined {
  if (!data) {
    return undefined
  }
  if (dataType === 'json') {
    return {
      dataType,
      body: JSON.stringify(data),
    }
  }
  if (dataType === 'form-data') {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value)
    })
    return {
      dataType,
      body: formData,
    }
  }
  if (dataType === 'query') {
    return {
      dataType,
      body: new URLSearchParams(data),
    }
  }
}

// 重载1: toJson为false时，返回Response
export async function afetch(url: string, options: AFetchOptions & { toJson: false }): Promise<Response>
// 重载2: toJson为true或未定义时，返回T
export async function afetch<T = any>(url: string, options?: AFetchOptions & { toJson?: true }): Promise<T>
// 重载3: 无options参数时，返回T（默认toJson=true）
export async function afetch<T = any>(url: string): Promise<T>

/**
 * 简单的 fetch 封装
 * @param url 请求地址
 * @param options 请求选项
 */
export async function afetch<T = any>(url: string, options?: AFetchOptions) {
  // 设置默认值
  options = options || {}
  options.dataType = options.dataType || 'json'
  options.toJson = options.toJson ?? true

  if (options.debug) {
    console.log('🚀 . afetch . 原始参数:', JSON.stringify(options))
  }

  /** 请求地址 和 查询参数 */
  const api = buildURL(url, options.baseURL)
  const searchBuilder = buildFetchQuery(options.query)
  if (searchBuilder) {
    api.search = searchBuilder.toString()
  }

  /** 请求头 */
  options.headers = new Headers(options.headers)

  /** 请求体 */
  if (!options.body) {
    const dataBuilder = buildFetchBody(options.data, options.dataType)
    if (dataBuilder) {
      if (dataBuilder.dataType === 'json') {
        options.headers.set('Content-Type', 'application/json;charset=utf-8')
      }
      options.body = dataBuilder.body
    }
  }

  if (options.debug) {
    // console.log('🚀 . afetch . 请求参数:', options, api.href)
    console.log('🚀 . afetch . fetch请求:', api.href, optionsToFetch(options))
  }
  if (options.toJson) {
    try {
      const response = await fetch(api.href, optionsToFetch(options))
      return await response.json() as T
    }
    catch (error) {
      if (options.debug) {
        console.log('🚀 . afetch . 请求失败:', error)
      }
      throw error
    }
  }
  else {
    return fetch(api.href, optionsToFetch(options))
  }
}

/**
 * 创建一个带有默认配置的 fetch 函数
 * @param baseOptions 默认配置
 * @param mergeFn 可选的合并函数，用于自定义默认配置和请求配置的合并逻辑
 */
export function afetchBase(
  baseOptions: AFetchOptions,
  mergeFn?: (baseOpts: AFetchOptions, reqOpts?: AFetchOptions) => AFetchOptions,
): AFetch {
  return async <T = any>(url: string, options?: AFetchOptions) => {
    // 如果用户提供了自定义合并函数，使用它
    if (mergeFn) {
      const mergedOptions = mergeFn(baseOptions, options)
      return afetch<T>(url, mergedOptions)
    }

    // 默认合并逻辑：智能合并对象类型的属性
    const mergedOptions: AFetchOptions = { ...baseOptions, ...options }

    // 合并 headers
    if (baseOptions.headers && options?.headers) {
      const baseHeaders = new Headers(baseOptions.headers)
      const reqHeaders = new Headers(options.headers)

      // 将请求 headers 合并到基础 headers 中
      reqHeaders.forEach((value, key) => {
        baseHeaders.set(key, value)
      })

      mergedOptions.headers = baseHeaders
    }

    return afetch<T>(url, mergedOptions)
  }
}

export type AFetch = typeof afetch
