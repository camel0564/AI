import type { LLMConfig } from '@/llm/index'
import type { McpConfig } from '@/mcp/index'

/** Agent 配置对象类型定义 */
export interface AgentConfig {
  /** Agent名称 简短可读的人类标识符 */
  name: string
  /** 模型配置 */
  llm: LLMConfig
  /** 用于引导模型生成符合预期的输出 */
  systemPrompt: string[]
  /** 模型可调用的MCP服务器列表 */
  mcp?: McpConfig[]
}
