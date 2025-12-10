import { z } from 'zod'

/** 模型调优参数 */
const ModelSettingsSchema = z.object({
  temperature: z.number().min(0).max(2).default(0.7).optional().describe('温度参数，控制输出随机性'),
  topP: z.number().min(0).max(1).default(0.95).optional().describe('核采样参数，控制输出多样性'),
  maxTokens: z.number().int().min(10).default(2000).optional().describe('最大输出 token 数'),
}).catchall(z.any().describe('扩展其他模型调优参数')) // [key: string]: any 对应的 Zod 写法

/** LLM 配置 */
export const LLMConfigSchema = z.object({
  model: z.string().min(1).describe('模型名称（必填，非空字符串，示例：qwen3:8b）'),
  baseURL: z.url().describe('模型服务器URL eg: http://localhost:11434/v1'),
  apiKey: z.string().default('EMPTY').optional().describe('API密钥 环境变量优先，本地模型可省略'),
  modelType: z.enum(['qwen', 'oai']).default('qwen').optional().describe('模型类型'),
  modelSettings: ModelSettingsSchema.optional().describe('模型调优参数配置'),
})

/** LLM 配置 */
export type LLMConfig = z.infer<typeof LLMConfigSchema>
/** 模型调优参数 */
export type ModelSettings = z.infer<typeof ModelSettingsSchema>

/** 消息 */
export const ChatMsgSchema = z.object({
  /**
   * 消息的不同角色类型
   * @desc `user` 用户发送的消息。
   * @desc `assistant` 助手（大模型）回答的消息。
   * @desc `system` 用于告知模型“它是谁”以及“应如何回应”的系统提示词 `RAG` (权重大于用户消息,用于限制或补充用户消息)
   * @desc `function` 工具（函数）调用的结果。即: `MCP` tools()
   * @desc `developer` 和 `system` 类似，都是系统提示词，但是 `developer` 是开发者发送的消息。
   */
  role: z.enum(['system', 'developer', 'user', 'assistant', 'function']).describe('消息角色'),
  /** 消息内容 */
  content: z.union([z.string(), z.array(z.object({
    text: z.string().optional().describe('文本'),
    image: z.string().optional().describe('图片'),
    file: z.string().optional().describe('文件'),
    audio: z.string().optional().optional().describe('音频'),
    video: z.string().optional().optional().describe('视频'),
  }))]),
  /** 会话参与人的名称, 让模型知道是谁在发送消息 */
  name: z.string().optional(),
})

/** 消息接口 */
export type ChatMsg = z.infer<typeof ChatMsgSchema>

const FunctionCallSchema = z.object({
  /** 函数名称 */
  name: z.string().min(1).describe('函数名称（必填，非空字符串，示例：get_weather）'),
  /** 函数参数 */
  arguments: z.string().min(1).describe('函数参数（必填，非空字符串，示例：{"location": "北京"}）'),
  /** 函数描述 */
  description: z.string().min(1).describe('函数描述（必填，非空字符串，示例：获取指定位置的天气信息）'),
})

/** 模型函数调用 */
export type FunctionCall = z.infer<typeof FunctionCallSchema>

export const ChatConfigSchema = z.object({
  /** 消息 */
  messages: z.array(ChatMsgSchema).min(1).describe('消息列表（必填，至少包含一条消息）'),
  /** 模型可调用的函数列表 */
  functions: z.array(FunctionCallSchema).optional().describe('模型可调用的函数列表'),
})

/** 聊天配置 */
export type ChatConfig = z.infer<typeof ChatConfigSchema>
