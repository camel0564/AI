// 导入工具函数模块
import * as utils from './utils.js'
// 从工具函数中导入可终止的异步迭代器和JSON解析器
import { AbortableAsyncIterator, parseJSON } from './utils.js'
// 导入whatwg-fetch以确保浏览器环境中fetch API的兼容性
import 'whatwg-fetch'

// 导入所有需要的类型定义
import type {
  ChatRequest,        // 聊天请求类型
  ChatResponse,       // 聊天响应类型
  Config,             // 配置类型
  CopyRequest,        // 复制模型请求类型
  CreateRequest,      // 创建模型请求类型
  DeleteRequest,      // 删除模型请求类型
  EmbedRequest,       // 嵌入请求类型
  EmbedResponse,      // 嵌入响应类型
  EmbeddingsRequest,  // 批量嵌入请求类型
  EmbeddingsResponse, // 批量嵌入响应类型
  ErrorResponse,      // 错误响应类型
  Fetch,              // Fetch函数类型
  GenerateRequest,    // 文本生成请求类型
  GenerateResponse,   // 文本生成响应类型
  ListResponse,       // 列表响应类型
  ProgressResponse,   // 进度响应类型
  PullRequest,        // 拉取模型请求类型
  PushRequest,        // 推送模型请求类型
  ShowRequest,        // 显示模型信息请求类型
  ShowResponse,       // 显示模型信息响应类型
  StatusResponse,     // 状态响应类型
  WebSearchRequest,   // 网络搜索请求类型
  WebSearchResponse,  // 网络搜索响应类型
  WebFetchRequest,    // 网络抓取请求类型
  WebFetchResponse,   // 网络抓取响应类型
  VersionResponse,    // 版本响应类型
} from './interfaces.js'

// 导入默认的Ollama服务器地址
import { defaultHost } from './constant.js'

/**
 * Ollama浏览器客户端类
 * 提供与Ollama服务器交互的所有API方法
 */
export class Ollama {
  // 客户端配置信息
  protected readonly config: Config
  // 用于发送HTTP请求的fetch函数
  protected readonly fetch: Fetch
  // 当前正在进行的流式请求列表，用于管理和中止请求
  protected readonly ongoingStreamedRequests: AbortableAsyncIterator<object>[] = []

  /**
   * 构造函数
   * @param config - 可选的配置参数
   * @param config.host - Ollama服务器地址，默认为http://127.0.0.1:11434
   * @param config.headers - 自定义请求头
   * @param config.fetch - 自定义fetch函数
   * @param config.proxy - 是否使用代理（暂未实现）
   */
  constructor(config?: Partial<Config>) {
    // 初始化配置对象
    this.config = {
      host: '',
      headers: config?.headers
    }

    // 如果不使用代理，格式化服务器地址
    if (!config?.proxy) {
      this.config.host = utils.formatHost(config?.host ?? defaultHost)
    }

    // 使用自定义fetch函数或默认的fetch API
    this.fetch = config?.fetch ?? fetch
  }

  /**
   * 中止所有正在进行的流式请求
   * 此方法会中止客户端实例当前运行的所有流式生成
   * 所有监听流的异步线程将抛出AbortError异常
   */
  public abort() {
    // 遍历所有正在进行的请求并中止它们
    for (const request of this.ongoingStreamedRequests) {
      request.abort()
    }
    // 清空请求列表
    this.ongoingStreamedRequests.length = 0
  }

  /**
   * 处理向Ollama服务器的请求
   * 如果请求是可流式的（stream=true），则返回一个AbortableAsyncIterator来生成响应消息
   * 否则，返回完整的响应对象
   * 
   * @param endpoint - 请求的API端点（如'chat'、'generate'等）
   * @param request - 请求对象，包含所有请求参数
   * @returns - 响应对象或生成响应消息的AbortableAsyncIterator
   * @throws - 如果响应体缺失或响应是错误的
   * @protected - 仅内部使用的方法
   */
  protected async processStreamableRequest<T extends object>(
    endpoint: string,
    request: { stream?: boolean } & Record<string, any>,
  ): Promise<T | AbortableAsyncIterator<T>> {
    request.stream = request.stream ?? false
    const host = `${this.config.host}/api/${endpoint}`
    if (request.stream) {
      const abortController = new AbortController()
      const response = await utils.post(this.fetch, host, request, {
        signal: abortController.signal,
        headers: this.config.headers
      })

      if (!response.body) {
        throw new Error('Missing body')
      }

      const itr = parseJSON<T | ErrorResponse>(response.body)
      const abortableAsyncIterator = new AbortableAsyncIterator(
        abortController,
        itr,
        () => {
          const i = this.ongoingStreamedRequests.indexOf(abortableAsyncIterator)
          if (i > -1) {
            this.ongoingStreamedRequests.splice(i, 1)
          }
        },
      )
      this.ongoingStreamedRequests.push(abortableAsyncIterator)
      return abortableAsyncIterator
    }
    const response = await utils.post(this.fetch, host, request, {
      headers: this.config.headers
    })
    return await response.json()
  }

  /**
   * 将图像编码为base64格式
   * 如果图像已经是字符串，则直接返回（假设已经是base64编码）
   * 
   * @param image - 要编码的图像，可以是Uint8Array或base64字符串
   * @returns - base64编码的图像字符串
   */
  async encodeImage(image: Uint8Array | string): Promise<string> {
    if (typeof image !== 'string') {
      // 如果是Uint8Array类型，将其转换为base64编码
      const uint8Array = new Uint8Array(image);
      let byteString = '';
      const len = uint8Array.byteLength;
      // 将Uint8Array转换为字节字符串
      for (let i = 0; i < len; i++) {
        byteString += String.fromCharCode(uint8Array[i]);
      }
      // 使用btoa函数将字节字符串转换为base64编码
      return btoa(byteString);
    }
    // 如果已经是字符串，直接返回（假设已经是base64编码）
    return image;
  }

  /**
   * 根据文本提示生成响应（重载1：流式响应）
   * @param request - 生成请求对象，包含stream: true
   * @returns - 生成响应消息的AbortableAsyncIterator
   */
  generate(
    request: GenerateRequest & { stream: true },
  ): Promise<AbortableAsyncIterator<GenerateResponse>>
  
  /**
   * 根据文本提示生成响应（重载2：非流式响应）
   * @param request - 生成请求对象，stream可选且默认为false
   * @returns - 完整的生成响应对象
   */
  generate(request: GenerateRequest & { stream?: false }): Promise<GenerateResponse>
  
  /**
   * 根据文本提示生成响应
   * 
   * @param request - 生成请求对象
   * @param request.model - 要使用的模型名称
   * @param request.prompt - 发送给模型的提示文本
   * @param request.images - 可选的图像输入（Uint8Array或base64字符串）
   * @param request.stream - 是否启用流式响应
   * @param request.options - 配置运行时的选项
   * @returns - 完整的响应对象或生成响应消息的AbortableAsyncIterator
   */
  async generate(
    request: GenerateRequest,
  ): Promise<GenerateResponse | AbortableAsyncIterator<GenerateResponse>> {
    if (request.images) {
      request.images = await Promise.all(request.images.map(this.encodeImage.bind(this)))
    }
    return this.processStreamableRequest<GenerateResponse>('generate', request)
  }

  /**
   * 与模型进行聊天（重载1：流式响应）
   * @param request - 聊天请求对象，包含stream: true
   * @returns - 聊天响应消息的AbortableAsyncIterator
   */
  chat(
    request: ChatRequest & { stream: true },
  ): Promise<AbortableAsyncIterator<ChatResponse>>
  
  /**
   * 与模型进行聊天（重载2：非流式响应）
   * @param request - 聊天请求对象，stream可选且默认为false
   * @returns - 完整的聊天响应对象
   */
  chat(request: ChatRequest & { stream?: false }): Promise<ChatResponse>
  
  /**
   * 与模型进行聊天
   * 
   * @param request - 聊天请求对象
   * @param request.model - 要使用的模型名称
   * @param request.messages - 聊天历史消息数组
   * @param request.images - 可选的图像输入（Uint8Array或base64字符串）
   * @param request.stream - 是否启用流式响应
   * @param request.tools - 模型可以调用的工具列表
   * @param request.options - 配置运行时的选项
   * @returns - 完整的响应对象或生成响应消息的AbortableAsyncIterator
   */
  async chat(
    request: ChatRequest,
  ): Promise<ChatResponse | AbortableAsyncIterator<ChatResponse>> {
    if (request.messages) {
      for (const message of request.messages) {
        if (message.images) {
          message.images = await Promise.all(
            message.images.map(this.encodeImage.bind(this)),
          )
        }
      }
    }
    return this.processStreamableRequest<ChatResponse>('chat', request)
  }

  /**
   * 创建新模型（重载1：流式响应）
   * @param request - 创建请求对象，包含stream: true
   * @returns - 进度响应消息的AbortableAsyncIterator
   */
  create(
    request: CreateRequest & { stream: true },
  ): Promise<AbortableAsyncIterator<ProgressResponse>>
  
  /**
   * 创建新模型（重载2：非流式响应）
   * @param request - 创建请求对象，stream可选且默认为false
   * @returns - 完整的进度响应对象
   */
  create(request: CreateRequest & { stream?: false }): Promise<ProgressResponse>
  
  /**
   * 从数据创建新模型
   * 
   * @param request - 创建请求对象
   * @param request.model - 要创建的模型名称
   * @param request.from - 要派生的基础模型
   * @param request.stream - 是否启用流式响应
   * @param request.quantize - 量化精度级别（如q8_0、q4_K_M等）
   * @param request.template - 与模型一起使用的提示模板
   * @returns - 完整的响应对象或生成进度消息的AbortableAsyncIterator
   */
  async create(
    request: CreateRequest
  ): Promise<ProgressResponse | AbortableAsyncIterator<ProgressResponse>> {
    return this.processStreamableRequest<ProgressResponse>('create', {
      ...request
    })
  }

  /**
   * 从Ollama注册表拉取模型（重载1：流式响应）
   * @param request - 拉取请求对象，包含stream: true
   * @returns - 进度响应消息的AbortableAsyncIterator
   */
  pull(
    request: PullRequest & { stream: true },
  ): Promise<AbortableAsyncIterator<ProgressResponse>>
  
  /**
   * 从Ollama注册表拉取模型（重载2：非流式响应）
   * @param request - 拉取请求对象，stream可选且默认为false
   * @returns - 完整的进度响应对象
   */
  pull(request: PullRequest & { stream?: false }): Promise<ProgressResponse>
  
  /**
   * 从Ollama注册表拉取模型
   * 
   * @param request - 拉取请求对象
   * @param request.model - 要拉取的模型名称
   * @param request.stream - 是否启用流式响应
   * @param request.insecure - 是否从不验证身份的服务器拉取
   * @returns - 完整的响应对象或生成进度消息的AbortableAsyncIterator
   */
  async pull(
    request: PullRequest,
  ): Promise<ProgressResponse | AbortableAsyncIterator<ProgressResponse>> {
    return this.processStreamableRequest<ProgressResponse>('pull', {
      name: request.model,
      stream: request.stream,
      insecure: request.insecure,
    })
  }

  /**
   * 将模型推送到Ollama注册表（重载1：流式响应）
   * @param request - 推送请求对象，包含stream: true
   * @returns - 进度响应消息的AbortableAsyncIterator
   */
  push(
    request: PushRequest & { stream: true },
  ): Promise<AbortableAsyncIterator<ProgressResponse>>
  
  /**
   * 将模型推送到Ollama注册表（重载2：非流式响应）
   * @param request - 推送请求对象，stream可选且默认为false
   * @returns - 完整的进度响应对象
   */
  push(request: PushRequest & { stream?: false }): Promise<ProgressResponse>
  
  /**
   * 将模型推送到Ollama注册表
   * 
   * @param request - 推送请求对象
   * @param request.model - 要推送的模型名称
   * @param request.stream - 是否启用流式响应
   * @param request.insecure - 是否推送到不验证身份的服务器
   * @returns - 完整的响应对象或生成进度消息的AbortableAsyncIterator
   */
  async push(
    request: PushRequest,
  ): Promise<ProgressResponse | AbortableAsyncIterator<ProgressResponse>> {
    return this.processStreamableRequest<ProgressResponse>('push', {
      name: request.model,
      stream: request.stream,
      insecure: request.insecure,
    })
  }

  /**
   * 从服务器删除模型
   * 
   * @param request - 删除请求对象
   * @param request.model - 要删除的模型名称
   * @returns - 包含操作状态的响应对象
   */
  async delete(request: DeleteRequest): Promise<StatusResponse> {
    await utils.del(
      this.fetch,
      `${this.config.host}/api/delete`,
      { name: request.model },
      { headers: this.config.headers }
    )
    return { status: 'success' }
  }

  /**
   * 将模型从一个名称复制到另一个名称
   * 
   * @param request - 复制请求对象
   * @param request.source - 要复制的源模型名称
   * @param request.destination - 要复制到的目标模型名称
   * @returns - 包含操作状态的响应对象
   */
  async copy(request: CopyRequest): Promise<StatusResponse> {
    await utils.post(this.fetch, `${this.config.host}/api/copy`, { ...request }, {
      headers: this.config.headers
    })
    return { status: 'success' }
  }

  /**
   * 列出服务器上的所有模型
   * 
   * @returns - 包含模型列表的响应对象
   * @throws - 如果响应体缺失
   */
  async list(): Promise<ListResponse> {
    const response = await utils.get(this.fetch, `${this.config.host}/api/tags`, {
      headers: this.config.headers
    })
    return (await response.json()) as ListResponse
  }

  /**
   * 显示模型的元数据
   * 
   * @param request - 显示请求对象
   * @param request.model - 要显示的模型名称
   * @param request.system - 可选，覆盖返回的模型系统提示
   * @param request.template - 可选，覆盖返回的模型模板
   * @returns - 包含模型元数据的响应对象
   */
  async show(request: ShowRequest): Promise<ShowResponse> {
    const response = await utils.post(this.fetch, `${this.config.host}/api/show`, {
      ...request,
    }, {
      headers: this.config.headers
    })
    return (await response.json()) as ShowResponse
  }

  /**
   * 将文本输入嵌入为向量
   * 
   * @param request - 嵌入请求对象
   * @param request.model - 用于生成嵌入的模型名称
   * @param request.input - 用于生成嵌入的文本输入
   * @param request.truncate - 是否截断输入以适应模型支持的最大上下文长度
   * @returns - 包含嵌入向量的响应对象
   */
    async embed(request: EmbedRequest): Promise<EmbedResponse> {
      const response = await utils.post(this.fetch, `${this.config.host}/api/embed`, {
        ...request,
      }, {
        headers: this.config.headers
      })
      return (await response.json()) as EmbedResponse
    }

  /**
   * 将文本提示嵌入为向量（批量版本）
   * 
   * @param request - 嵌入请求对象
   * @param request.model - 用于生成嵌入的模型名称
   * @param request.input - 用于生成嵌入的文本输入数组
   * @returns - 包含嵌入向量的响应对象
   */
  async embeddings(request: EmbeddingsRequest): Promise<EmbeddingsResponse> {
    const response = await utils.post(this.fetch, `${this.config.host}/api/embeddings`, {
      ...request,
    }, {
      headers: this.config.headers
    })
    return (await response.json()) as EmbeddingsResponse
  }

  /**
   * 列出服务器上当前运行的模型
   * 
   * @returns - 包含运行中模型列表的响应对象
   * @throws - 如果响应体缺失
   */
  async ps(): Promise<ListResponse> {
    const response = await utils.get(this.fetch, `${this.config.host}/api/ps`, {
      headers: this.config.headers
    })
    return (await response.json()) as ListResponse
  }

  /**
   * 返回Ollama服务器版本
   * 
   * @returns - 包含服务器版本信息的响应对象
   */
  async version(): Promise<VersionResponse> {
    const response = await utils.get(this.fetch, `${this.config.host}/api/version`, {
      headers: this.config.headers,
    })
    return (await response.json()) as VersionResponse
  }

  /**
   * 使用Ollama网络搜索API执行网络搜索
   * 
   * @param request - 搜索请求对象
   * @param request.query - 搜索查询字符串（必填）
   * @param request.max_results - 可选，要返回的最大结果数（默认5，最大10）
   * @returns - 包含搜索结果的响应对象
   * @throws - 如果请求无效或服务器返回错误
   */
  async webSearch(request: WebSearchRequest): Promise<WebSearchResponse> {
    if (!request.query || request.query.length === 0) {
      throw new Error('Query is required')
    }
    const response = await utils.post(this.fetch, `https://ollama.com/api/web_search`, { ...request }, {
      headers: this.config.headers
    })
    return (await response.json()) as WebSearchResponse
  }

  /**
   * 使用Ollama网络抓取API抓取单个网页
   * 
   * @param request - 抓取请求对象
   * @param request.url - 要抓取的URL（必填）
   * @returns - 包含抓取结果的响应对象
   * @throws - 如果请求无效或服务器返回错误
   */
  async webFetch(request: WebFetchRequest): Promise<WebFetchResponse> {
    if (!request.url || request.url.length === 0) {
      throw new Error('URL is required')
    }
    const response = await utils.post(this.fetch, `https://ollama.com/api/web_fetch`, { ...request }, { headers: this.config.headers })
    return (await response.json()) as WebFetchResponse
  }
}

// 创建并导出默认的Ollama客户端实例
export default new Ollama()

// 从主入口点导出所有类型，以便导入类型的包不需要指定路径
export * from './interfaces.js'