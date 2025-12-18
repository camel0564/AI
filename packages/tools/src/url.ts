/**
 * 智能拼接 URL，解决 baseURL 路径被忽略的问题
 * @param url 请求地址 如果存在baseURL, 则url强制去掉`/`开头和结尾
 * @param baseURL 基础 URL 强制以 `/` 结尾
 * @returns 完整的 URL 对象, 且 href 无`/`结尾
 */
export function buildURL(url: string, baseURL?: string): URL {
  const stdUrl = url.replace(/^\/*|\/*$/g, '') // 强制去掉开头和结尾的/
  // 如果没有 baseURL，直接解析
  if (!baseURL) {
    return new URL(stdUrl)
  }
  const stdBase = baseURL.replace(/\/*$/, '/') // 结尾强制增加/
  return new URL(stdUrl, stdBase)
}

/**
 * 从url中 获取文件名称
 */
export function getFileNameByUrl(filePath = '') {
  if (!filePath)
    return ''

  filePath = filePath.includes('/') ? filePath : `/${filePath}`
  const mats = filePath.match(/\/([^/?#]+)(\?|#|$)/)
  return mats?.[1] || ''
}
