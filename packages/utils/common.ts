/**
 * 等待
 * @example sleep(randomInt(1000, 3000)) 随机等待1-3秒
 */
export const sleep = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout))
