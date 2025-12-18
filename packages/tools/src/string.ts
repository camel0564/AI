/**
 * 中划线转驼峰
 * @param name 需要转化的首字母
 * @param firstUpper 首字母是否大写
 */
export function kebaToCamel(name: string, firstUpper: boolean = false): string {
  name = firstUpper ? `-${name}` : name
  return name.replace(/(-[a-z])/g, match => match[1]!.toUpperCase())
}

/**
 * 驼峰转中划线
 */
export function camelTokeba(name: string) {
  return /[A-Z]/.test(name) ? name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase() : name
}

const _uuid = crypto?.randomUUID
  ? () => crypto.randomUUID()
  : () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })

export function genUUID(separator = '-'): string {
  return separator === '-' ? _uuid() : _uuid().replace(/-/g, separator)
}
