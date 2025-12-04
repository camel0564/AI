import pkg from '../../package.json' with { type: 'json' }
/** 应用信息 */
export const AppInfo = {
  name: pkg.name,
  version: pkg.version,
  port: Number.parseInt(process.env[`${pkg.name}_PORT`] || '3127'),
}
console.log('🚀 AppInfo:', AppInfo)
