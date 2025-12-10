import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { completable } from '@modelcontextprotocol/sdk/server/completable.js'
import { z } from 'zod'

/**
 * 具有上下文感知的补全提示词
 */
export function registerTeamGreetingPrompt(server: McpServer) {
  server.registerPrompt(
    'team-greeting',
    {
      title: '团队欢迎',
      description: '为团队成员生成欢迎消息',
      argsSchema: {
        department: completable(z.string(), (value) => {
          // Department suggestions
          return ['研发', '销售', '营销', '售后'].filter(d => d.startsWith(value))
        }),
        name: completable(z.string(), (value, context) => {
          // Name suggestions based on selected department
          const department = context?.arguments?.department
          if (department === '研发') {
            return ['Alice', 'Bob', 'Charlie'].filter(n => n.startsWith(value))
          }
          else if (department === '销售') {
            return ['David', 'Eve', 'Frank'].filter(n => n.startsWith(value))
          }
          else if (department === '营销') {
            return ['Grace', 'Henry', 'Iris'].filter(n => n.startsWith(value))
          }
          return ['Guest'].filter(n => n.startsWith(value))
        }),
      },
    },
    ({ department, name }) => ({
      messages: [
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: `你好 ${name}, 欢迎加入 ${department} 团队！`,
          },
        },
      ],
    }),
  )
}
