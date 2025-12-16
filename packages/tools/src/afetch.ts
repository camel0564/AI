import { isRecord, isString } from './type-guard'

export type AFetchMethod = 'get' | 'GET' | 'delete' | 'DELETE' | 'head' | 'HEAD' | 'options' | 'OPTIONS' | 'post' | 'POST' | 'put' | 'PUT' | 'patch' | 'PATCH' | 'purge' | 'PURGE' | 'link' | 'LINK' | 'unlink' | 'UNLINK'

/** fetch 参数 */
export interface AFetchOptions extends RequestInit {
  /** 基础 URL */
  baseURL?: string
  /** 请求方法 */
  method?: 'get' | 'post' | 'delete' | 'put' | 'head' | 'options' | AFetchMethod
  /** 查询字符串 */
  query?: Record<string, any> | string | URLSearchParams | null
  /**
   * @description 默认通过 JSON 方式提交数据
   * @description 可通过 dataType 指定其他方式(form-data, text)
   * @description 其他数据类型请使用 `body` 手动处理
   */
  data?: Record<string, any> | null
  /**
   * @description 设置提交数据方式; 仅在 `data` 存在时有效 其他数据类型请使用 `body` 手动处理
   * @description `json` 处理为 JSON.stringify(data) 且 `'Content-Type': 'application/json;charset=utf-8'`
   * @description `form-data` 处理为 FormData(data)
   * @description `query` 处理为 URLSearchParams(data)
   */
  dataType?: 'json' | 'form-data' | 'query'
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

/**
 * 简单的 fetch 封装
 * @param url 请求地址
 * @param options 请求选项
 */
export async function afetch<T = any>(url: string, options?: AFetchOptions) {
  options = options || {}
  if (options.debug) {
    console.log('🚀 . afetch . 传入原始参数:', JSON.stringify(options))
  }

  /** 请求地址 和 查询参数 */
  const api = new URL(url, options.baseURL)
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
    console.log('🚀 . afetch . 请求参数:', options, api.href)
  }
  try {
    const response = await fetch(api.href, options)
    return await response.json() as T
  }
  catch (error) {
    console.log('🚀 . afetch . 请求失败:', error)
    throw error
  }
}
