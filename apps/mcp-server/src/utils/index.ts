import { getAppInfoByPkg } from '@ai/tools'
import pkg from '../../package.json' with { type: 'json' }
/** 应用信息 */
export const AppInfo = getAppInfoByPkg(pkg)
