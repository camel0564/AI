import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

// 兼容 CommonJS 和 ES Module 的 __dirname 获取方式
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const notebookPath = path.join(__dirname, './notebook')
// console.log('🚀 notebookPath:', notebookPath)

/**
 * 类似 juypter notebook 自动执行最新的一个demo
 */
interface Plugin {
  /** 方法名数组 */
  cells: string[]
}

// 获取当前目录下所有匹配 /^\d+\..*\.ts$/ 的文件
const files = fs.readdirSync(notebookPath)
const pluginFiles = files.filter(file => /^\d+\..*\.ts$/.test(file))
// console.log('🚀 pluginFiles:', pluginFiles)

const sortedFiles = pluginFiles.sort((a, b) => {
  const numA = Number.parseFloat(a.match(/^(\d|\.)+/)?.[0] || '0')
  const numB = Number.parseFloat(b.match(/^(\d|\.)+/)?.[0] || '0')
  return numA - numB
})
// console.log('🚀 sortedFiles:', sortedFiles)

/**
 * 异步动态导入所有模块
 * TODO: 增加命令行参数,指定要执行的notebook文件和方法
 */
export async function autoLoadNotebooks() {
  const plugins: Plugin[] = []

  for (const file of sortedFiles) {
    const filePath = path.join(notebookPath, file)
    // 动态导入模块
    const module = await import(filePath)
    // 假设每个模块默认导出一个 Plugin 对象
    const plugin: any = module.default
    plugins.push(plugin)
  }
  // console.log('🚀 plugins:', plugins)
  console.log(`🚀 已自动导入 ${plugins.length} 个notebook\n`)

  // 运行最新类的最后一个方法
  runLastCell(plugins)
}

// 执行加载
// autoLoadNotebooks().catch(console.error)

/**
 * 运行最后一个 cell
 */
async function runLastCell(plugins: any[]) {
  const Cell = plugins[plugins.length - 1]
  const cellIns = new Cell()
  if (cellIns) {
    const methodName = Cell.cells.pop()
    const method = cellIns[methodName]

    // 启动实时计时器
    const startTime = Date.now()
    let timerId: NodeJS.Timeout | null = null

    // 清除之前同一行的输出（可选）
    const updateTimer = () => {
      const elapsed = (Date.now() - startTime) / 1000
      process.stdout.write(`\r[${elapsed.toFixed(2)}s]    `) // \r 回到行首，覆盖之前的输出
    }

    timerId = setInterval(updateTimer, 100) // 每 100ms 刷新一次显示

    // 换行并输出最终结果
    await method.call(cellIns)
    if (timerId) {
      clearInterval(timerId)
    }
    const totalTime = (Date.now() - startTime) / 1000
    console.log(`\n✅ 执行完成: ${Cell.name}.${methodName}() | 总耗时: ${totalTime.toFixed(2)}s`)
  }
}
