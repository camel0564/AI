/**
 * 等待
 * @example sleep(randomInt(1000, 3000)) 随机等待1-3秒
 */
export const sleep = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout))

/** 声明 node process 类型，避免类型错误 */
declare const process: any;
/** 安全地获取环境变量，如果不可用则使用默认值 */
const getEnv = (key?: string) => {
  if (!key) return undefined;
  const isNode = typeof process !== 'undefined' && typeof process.env !== 'undefined';
  return isNode ? process.env[key] : undefined;
};

/**
 * 获取应用信息
 * @param pkg package.json 内容
 * @returns 应用信息
 */
export function getAppInfoByPkg(pkg: { name: string, version: string, port: number }) {
  const AppInfo = {
    name: pkg.name,
    version: pkg.version,
    port: parseInt(getEnv(`${pkg.name}_PORT`) || `${pkg.port}`),
  }
  console.log('🚀 AppInfo:', AppInfo);
  return AppInfo
}
