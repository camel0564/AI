import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'

/** 注册 github 仓库资源 */
export function registerGithubResource(server: McpServer) {
  server.registerResource(
    'repository',
    new ResourceTemplate('github://repos/{owner}/{repo}', {
      list: undefined,
      complete: {
        // Provide intelligent completions based on previously resolved parameters
        repo: (value, context) => {
          if (context?.arguments?.owner === 'org1') {
            return ['project1', 'project2', 'project3'].filter(r => r.startsWith(value))
          }
          return ['default-repo'].filter(r => r.startsWith(value))
        },
      },
    }),
    {
      title: 'GitHub Repository',
      description: 'Repository information eg: vuejs/core',
    },
    async (uri, { owner, repo }) => ({
      contents: [
        {
          uri: uri.href,
          text: `Repository: ${owner}/${repo}`,
        },
      ],
    }),
  )
}
