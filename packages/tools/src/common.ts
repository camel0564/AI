/**
 * 等待
 * @example sleep(randomInt(1000, 3000)) 随机等待1-3秒
 */
export const sleep = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout))

/**
 * 获取应用信息
 * @param pkg package.json 内容
 * @returns 应用信息
 */
export function getAppInfoByPkg(pkg: { name: string, version: string, port: number }) {
  const AppInfo = {
    name: pkg.name,
    version: pkg.version,
    port: parseInt(process.env[`${pkg.name}_PORT`] || `${pkg.port}`),
  }
  console.log('🚀 AppInfo:', AppInfo);
  return AppInfo
}
