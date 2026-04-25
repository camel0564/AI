import process from 'node:process'
import { ContextualCompressionRetriever } from '@langchain/classic/retrievers/contextual_compression'
import { LLMChainExtractor } from '@langchain/classic/retrievers/document_compressors/chain_extract'
import { MultiQueryRetriever } from '@langchain/classic/retrievers/multi_query'
import { ScoreThresholdRetriever } from '@langchain/classic/retrievers/score_threshold'
import { ChatOllama } from '@langchain/ollama'
import { cell } from '../utils'
import Retriever from './10.Retriever'

/**
 * retriever常见的优化方式
 * 1. 加入更多llm
 * 2. 调参
 */
export default class RetrieverTuner {
  static cells: string[] = []

  ollama() {
    const llm = new ChatOllama({
      baseUrl: 'http://localhost:11434',
      model: 'qwen3:8b',
      think: false,
    })
    return llm
  }

  /**
   * 优化方式1 multiQueryRetriever
   *
   * 解决 llm 缺陷的方式就是引入更多 llm
   *
   * 核心思路: 自然语言表述有时模糊,有歧义;引入聊天大模型先处理一遍用户问题,生成更准确详细的提示词
   *
   * 流程举例: (以3个角度,每个角度2条数据(k值)为例)
   * 1. 用户问题: 茴香豆是做什么用的?
   * 2. 使用聊天大模型,扩充为3条(多条)不同的措辞问法.(茴香豆的用途有哪些？/茴香豆在哪些方面有应用？/茴香豆可以用来做什么？)
   * 3. 使用数据库的reteriever查询多条数据(每个问题返回2条数据则返回->3*2=6条)
   * 4. 从6条数据中,选择最相关的2条数据返回
   */
  @cell
  async multiQueryRetriever() {
    const vectorStore = await new Retriever().dbGetCollection()

    const llm = this.ollama()
    const retriever = MultiQueryRetriever.fromLLM({
      llm, // MultiQueryRetriever 会使用llm 改写每一个用户输入的问题
      retriever: vectorStore.asRetriever(2), // k值 (db返回数据条数) MultiQueryRetriever 会使用数据库的reteriever查询2条数据
      queryCount: 3, // (问题角度数量) 对每条输入的问题会扩充为3条不同的措辞问法.(角度不同,但是意思相同)
      verbose: true, // langChain通用参数,打印内部的执行过程,学习和debug用
    })
    const res = await retriever.invoke('茴香豆是做什么用的?')
    console.log('🚀 res:', res)
  }

  /**
   * 根据用户问题，对已检索到的一批文档做 “过滤 + 精炼”，只留下真正相关的片段，减少冗余、节省 Token、提升回答质量
   */
  @cell
  async docCompressoror() {
    // 另一种更详细的开启verbose模式,打印内部的执行过程,学习和debug用
    process.env.LANGCHAIN_VERBOSE = 'true'

    const vectorStore = await new Retriever().dbGetCollection()
    const llm = this.ollama()

    // 从文档中提取出最相关的片段
    const compressor = LLMChainExtractor.fromLLM(llm)

    const retriever = new ContextualCompressionRetriever({
      baseCompressor: compressor, // 压缩上下文(提取相关片段)的chain; 支持自己实现
      baseRetriever: vectorStore.asRetriever(2), // k值 操作db,返回2条数据
    })

    const res = await retriever.invoke('孔乙己喝了几碗酒')
    console.log('🚀 res:', res)
  }

  /**
   * 如何确定需要返回的相关文档数量?(k值)
   * 事实上，这个非常难设置的
   * 可以采用scoreThreshold算法设置
   * vectorStore.asRetriever(2) 这里的2就是k值
   */
  @cell
  async scoreThresholdRetriever() {
    const vectorStore = await new Retriever().dbGetCollection()
    const retriever = ScoreThresholdRetriever.fromVectorStore(vectorStore, {
      minSimilarityScore: 0.8, // 文档相似度阈值 一般0.8
      maxK: 5, // 最大返回文档数量
      kIncrement: 1, // 每次增加对比的文档数量
    })

    const res = await retriever.invoke('茴香豆是做什么用的?')
    console.log('🚀 res:', res)
  }
}
