import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export function registerReviewCodePrompt(server: McpServer) {
  server.registerPrompt(
    'review-code',
    {
      title: '代码检查',
      description: '检查代码是否符合最佳实践和潜在问题',
      argsSchema: { code: z.string() },
    },
    ({ code }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `请检查代码是否符合最佳实践和潜在问题:\n\n${code}`,
          },
        },
      ],
    }),
  )
}
