/**
 * LLM模块的消息类型定义
 */

/**
 * 消息角色列表
 */
export const ROLES = ['system', 'user', 'assistant', 'function'] as const

/**
 * 消息角色类型
 * 定义了消息的不同角色类型。
 * @desc `user` 用户发送的消息。
 * @desc `assistant` 助手（大模型）回答的消息。
 * @desc `system` 系统消息，通常用于设定助手的行为 `RAG` (权重大于用户消息,用于限制或补充用户消息)
 * @desc `function` 工具（函数）调用的结果。即: `MCP` tools()
 */
export type Role = typeof ROLES[number]

/** 定义消息内容中的不同类型项 */
export interface MsgContent {
  /** 文本内容 */
  text?: string
  /** 图片内容，通常是base64编码的字符串 */
  image?: string
  /** 文件内容，通常是base64编码的字符串 */
  file?: string
  /** 音频内容，通常是base64编码的字符串或包含音频信息的记录 */
  audio?: string | Record<string, any>
  /** 视频内容，通常是base64编码的字符串或包含视频信息的数组 */
  video?: string | Array<any>
}

/** 模型函数调用 */
export interface FunctionCall {
  /** 函数名称 */
  name: string
  /** 函数参数 */
  arguments: string
  /** 函数描述 */
  description: string
}

/** 消息接口 */
export interface ChatMessage {
  /** 消息角色 */
  role: Role
  /** 消息内容 */
  content: string | MsgContent[]
  /**
   * 推理内容
   *
   * 用于存储模型的推理过程内容。这个字段允许将模型的思考过程与最终的回答内容分开。
   * 这对于理解和调试模型的行为非常有用，尤其是在复杂任务中。
   * 当使用支持该字段的新版 Qwen 模型（如 QwQ-32B）时，模型会自动填充此字段。
   * 在前端展示时，可以通过特殊标记（如 `[THINK]`）将推理内容与回答内容区分开来。
   */
  reasoning_content?: string | MsgContent[]
  /** 消息名称 */
  name?: string
  /** 函数调用 */
  function_call?: FunctionCall
  /** 额外信息 */
  extra?: Record<string, any>
}

/**
 * 聊天参数接口
 */
export interface ChatParams {
  /** 消息列表 */
  messages: ChatMessage[]
  /** 模型名称 */
  model: string
  /** 是否流式输出 */
  stream?: boolean
  /** 温度参数，控制生成的随机性 */
  temperature?: number
  /** 最大令牌数，限制生成的响应长度 */
  max_tokens?: number
  [key: string]: any
}

// LLM配置类型
export interface LLMConfig {
  /** 模型名称 eg: qwen3:8b */
  model: string
  /** 模型服务器URL eg: http://localhost:11434/v1 */
  baseURL?: string
  /** 模型类型 oai: openAI兼容的模型 */
  modelType?: 'oai'
  /** API密钥 环境变量:OPENAI_API_KEY 本地模型一般无需设置 */
  apiKey?: string
}

// 生成配置类型
export interface GenerateConfig {
  lang?: 'en' | 'zh'
  max_input_tokens?: number
  stop?: string[]
  temperature?: number
  [key: string]: any
}
