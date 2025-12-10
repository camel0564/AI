import process from 'node:process'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express from 'express'
import { registerReviewCodePrompt, registerTeamGreetingPrompt } from './prompts/index'
import { registerGithubResource, registerHolidaysResource, registerUserProfileResource } from './resource/index'
import { registerHomeServiceTool, registerOrderTool, registerWeatherTool } from './tools/index'
import { AppInfo } from './utils/index'

const AppName = AppInfo.name

/** Create an MCP server */
const server = new McpServer({
  name: AppName,
  version: '1.0.0',
})

// #region Tools
registerWeatherTool(server)
registerHomeServiceTool(server)
registerOrderTool(server)
// #endregion Tools

// #region Resources
// 静态资源 Static resource
registerHolidaysResource(server)

// 分页资源 (参数 补全)
registerUserProfileResource(server)

// 多参数资源
registerGithubResource(server)
// #endregion Resources

// #region Prompts
registerReviewCodePrompt(server)

registerTeamGreetingPrompt(server)
// #endregion Prompts

// http 方式
const app = express()
app.use(express.json())
app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })

  res.on('close', () => {
    transport.close()
  })

  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)
})
app.get('/mcp', async (_req, res) => {
  res.send({ msg: `${AppName} 启动成功` })
}) // 必须处理get请求 返回200,否则警告

const port = Number.parseInt(process.env[`${AppName}_PORT`] || '3127')
app.listen(port, () => {
  console.log(`🚀 ${AppName} running on http://localhost:${port}/mcp`)
}).on('error', (error) => {
  console.error('Server error:', error)
  process.exit(1)
})
