import { z } from 'zod'
import { de } from 'zod/locales'

/**
 * 模型调优参数
 * @see https://zhuanlan.zhihu.com/p/24484122371
 * @see https://finisky.github.io/illustrated-decoding-strategies/
 */
const ModelConfigSchema = z.object({
  /**
   * 控制下一个 token 的概率大小
   * @example 医疗诊断回答：0.1-0.5（需严谨性）
   * @example 诗歌创作：0.7-1.0（鼓励创意）
   */
  temperature: z.number().min(0).max(2).default(0.7).optional().describe('温度'),
  /**
   * 控制下一个 token 的概率大小的另一种算法; 参考 `temperature`
   */
  top_p: z.number().min(0).max(1).default(0.75).optional().describe('核采样(核: 即核心token)'),
  /** 自动调整 或 null */
  max_tokens: z.number().int().min(10).nullable().default(null).optional().describe('最大输出 token 数'),
}).catchall(z.any().describe('扩展其他模型调优参数')) // [key: string]: any 对应的 Zod 写法

/** LLM 配置 */
export const LLMConfigSchema = z.object({
  baseURL: z.url().describe('模型服务器URL eg: http://localhost:11434/v1'),
  apiKey: z.string().default('EMPTY').optional().describe('API密钥 环境变量优先，本地模型可省略'),
  debug: z.boolean().default(false).optional().describe('是否开启调试模式'),
})

/** LLM 配置 */
export type LLMConfig = z.infer<typeof LLMConfigSchema>
/** 模型调优参数 */
export type ModelConfig = z.infer<typeof ModelConfigSchema>

/** 多媒体消息内容列表 */
const MediaMsg = z.array(z.object({
  type: z.union([
    z.literal('text'),
    z.literal('image_url'),
    z.literal('input_audio'),
    z.custom<string & {}>(val => typeof val === 'string'),
  ]),
  text: z.string().optional(),
}).catchall(z.any().describe('扩展其他模型调优参数')))

/** 消息 */
export const ChatMsgSchema = z.object({
  /**
   * 消息的不同角色类型
   * @desc `user` 用户发送的消息。
   * @desc `assistant` 助手（大模型）回答的消息。
   * @desc `system` `仅支持文本`; 用于告知模型“它是谁”以及“应如何回应”的系统提示词 (权重大于用户消息) o1 模型后使用 developer 替代 system 角色
   * @desc `function` 工具（函数）调用的结果。即: `MCP` tools()
   */
  role: z.enum(['system', 'developer', 'user', 'assistant', 'function']).describe('消息角色'),
  /** 消息内容 文字 或 多媒体 */
  content: z.union([z.string(), MediaMsg]),
  /** 会话参与人的名称, 让模型知道是谁在发送消息 */
  name: z.string().optional(),
  /** 大模型推理消息, 仅在 `think` 为 `true` 时返回 */
  thinking: z.string().optional().describe('思考中消息'),
})

/** 消息接口 */
export type ChatMsg = z.infer<typeof ChatMsgSchema>

const ToolSchema = z.object({
  type: z.literal('function').describe('函数调用类型'),
  function: z.object({
    /** 函数名称 */
    name: z.string().min(1).describe('函数名称（必填，非空字符串，示例：get_weather）'),
    /** 函数参数 （JSON Schema 格式） */
    parameters: z.any().describe('函数参数（必填，非空字符串，示例：{"location": "北京"}）'),
    /** 函数描述 */
    description: z.string().min(1).optional().describe('函数描述（必填，非空字符串，示例：获取指定位置的天气信息）'),
  }),
})

// /** 模型函数调用 */
// export type Tool = z.infer<typeof ToolSchema>

export const ChatRequestSchema = z.object({
  /** 模型 必填 */
  model: z.string().describe('模型名称（必填，非空字符串，示例：qwen3:8b）'),
  /** 消息 必填 */
  messages: z.array(ChatMsgSchema).describe('消息列表（必填，至少包含一条消息）'),
  /** 函数工具列表（可选） */
  tools: z.array(ToolSchema).optional().describe('模型可调用的函数工具列表'),
  /** 模型参数 */
  options: ModelConfigSchema.optional().describe('模型调优参数配置'),
  /** 响应格式（目前仅支持 "json"） */
  format: z.literal('json').optional().describe('强制输出为 JSON 格式'),
  /** 是否开启深度思考 */
  think: z.union([z.boolean(), z.enum(['high', 'medium', 'low'])]).optional().describe('是否启用思考模式（仅部分模型支持）'),
  /** 是否流式输出 */
  stream: z.boolean().default(false).optional().describe('是否流式输出'),
  /** 模型保活时间,防止不断重启,提升响应速度 number 秒数 */
  keep_alive: z.number().default(600).optional().describe('模型保活时间（秒数）'),
})

/** 聊天请求参数 */
export type ChatRequest = z.infer<typeof ChatRequestSchema>

/** 聊天响应 */
export interface ChatResponse {
  /** 使用的模型名称 */
  model: string
  /** 响应创建的时间戳 */
  created_at: Date
  /** 模型生成的消息对象 */
  message: ChatMsg
  /** 响应是否完成 */
  done: boolean
  /** 响应完成的原因 */
  done_reason: string
  /** 整个请求处理的总时长（微秒） */
  total_duration: number
  /** 模型加载的时长（微秒） */
  load_duration: number
  /** 提示词评估的令牌数量 */
  prompt_eval_count: number
  /** 提示词评估的时长（微秒） */
  prompt_eval_duration: number
  /** 生成的令牌数量 */
  eval_count: number
  /** 生成令牌的时长（微秒） */
  eval_duration: number
  /** 令牌概率信息，包含每个生成令牌的概率分布 可选 */
  logprobs?: Logprob[]
}

interface TokenLogprob {
  token: string
  logprob: number
}

export interface Logprob extends TokenLogprob {
  top_logprobs?: TokenLogprob[]
}
