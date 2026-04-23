import { autoLoadNotebooks } from './autoload-note'
import 'dotenv/config'

// 自动加载notebook中的ts文件,并执行最后一个对象的最后一个方法
autoLoadNotebooks().catch(console.error)
