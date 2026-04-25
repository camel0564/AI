import { TextLoader } from '@langchain/classic/document_loaders/fs/text'
import { RecursiveCharacterTextSplitter } from '@langchain/classic/text_splitter'
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory'
import { Chroma } from '@langchain/community/vectorstores/chroma'
import { OllamaEmbeddings } from '@langchain/ollama'
import { ChromaClient } from 'chromadb'
import { cell } from '../utils'

/**
 * cell模板
 * 1. Embedding：把文本块转成向量
 * 2. VectorStore：向量数据库存起来
 * 3. Retriever：检索器，封装向量库，负责相似度搜索
 */
export default class Retriever {
  static cells: string[] = []

  /** 向量数据库的名称 */
  collectionName = 'kongyiji-vector'

  /**
   * 加载文本文件
   */
  async loadDoc() {
    const loader = new TextLoader('data/kongyiji.txt')
    const docs = await loader.load()
    return docs
  }

  /**
   * 文本拆分
   */
  async splitDoc() {
    const docs = await this.loadDoc()
    // 因为这个鲁迅小说的数据总长度为 2250，并且情节相对紧凑，所以我们的参数设置为100 20
    // 这样切分出来的块较小，也会节约 embedding 时的花费。
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 100,
      chunkOverlap: 20,
    })

    const splitDocs = await splitter.splitDocuments(docs)
    // console.log('🚀 splitDocs:', splitDocs)
    return splitDocs
  }

  /**
   * embedding
   * 文档向量 和 对话模型 之间的区别和联系
   */
  @cell
  async embeddings() {
    /**
     * bge-m3是广泛使用开源文档向量模型
     * 它必须在ollama上下载,才能使用
     * UI界面或者下载命令: ollama pull bge-m3
     *
     * 可以和qwen等聊天模型配合使用
     * 1. 文档向量: 负责文档和向量相互转换,查找相关文档
     * 2. 对话模型: 负责和用户交互,根据用户输入和向量模型查找到的文本资料内容生成回复
     */
    const embeddings = new OllamaEmbeddings({
      model: 'bge-m3',
    })

    // // 手动embedding一段文字查看一下
    // const splitDocs = await this.splitDoc()
    // const res = await embeddings.embedQuery(splitDocs[0].pageContent)
    // console.log('🚀 查看一下embedings后的向量长什么样:', res)

    return embeddings
  }

  /**
   * MemoryVectorStore 是langChain提供的一个在`开发时`使用的`内存向量数据库`
   *
   * 在真实项目中,应该使用`持久化向量数据库`来存储向量,而不是内存向量数据库
   */
  @cell
  async memoryVectorStore() {
    const splitDocs = await this.splitDoc()

    // 使用 MemoryVectorStore 构建向量数据库
    const embeddings = await this.embeddings()
    const vectorstore = new MemoryVectorStore(embeddings)
    await vectorstore.addDocuments(splitDocs)

    // 创建一个 retriever
    const retriever = vectorstore.asRetriever(2)

    // 用 retriever 检索相关文档
    const res = await retriever.invoke('茴香豆是做什么用的')
    console.log('🚀 1. 茴香豆是做什么用的?', res)
    const res2 = await retriever.invoke('下酒菜一般是什么？')
    console.log('🚀 2. 下酒菜一般是什么？', res2)
    const res3 = await retriever.invoke('孔乙己用什么谋生？')
    console.log('🚀 3. 孔乙己用什么谋生？', res3)
  }

  /**
   * 保存数据到本地向量数据库
   * 注意这里需要先启动chroma数据库 `npx chroma run`
   * 多次调用会重复添加数据(需添加唯一id优化)
   *
   * embedding需要一定的时间和费用,所以需要持久化;
   * 这里使用chroma向量数据库
   * 后期可以考虑用docker中部署其他的大型数据库,更简单/更强大;
   */
  @cell
  async dbSave() {
    const splitDocs = await this.splitDoc()

    const embeddings = await this.embeddings()
    // 替换数据库比较简单 这里和MemoryVectorStore用法基本一致;
    // const vectorStore = await FaissStore.fromDocuments(splitDocs, embeddings)
    const vectorStore = new Chroma(embeddings, {
      collectionName: this.collectionName,
      url: 'http://localhost:8000',
    })

    // 保存向量到数据库
    // TODO: 添加唯一hashid,避免重复添加
    const ids = await vectorStore.addDocuments(splitDocs)
    console.log(ids)
  }

  @cell
  async dbRetriever() {
    const vectorStore = await this.dbGetCollection()

    // 创建一个 retriever
    const retriever = vectorStore.asRetriever(2)

    // 用 retriever 检索相关文档
    const res = await retriever.invoke('茴香豆是做什么用的')
    console.log('🚀 1. 茴香豆是做什么用的?', res)
    const res2 = await retriever.invoke('下酒菜一般是什么？')
    console.log('🚀 2. 下酒菜一般是什么？', res2)
    const res3 = await retriever.invoke('孔乙己用什么谋生？')
    console.log('🚀 3. 孔乙己用什么谋生？', res3)
  }

  /**
   * 获取向量数据库中的集合 (类似: mysql 中的 table)
   * @param collectionName 集合名称
   */
  async dbGetCollection(collectionName = this.collectionName) {
    const embeddings = await this.embeddings()
    const vectorStore = new Chroma(embeddings, {
      collectionName,
      url: 'http://localhost:8000',
    })
    return vectorStore
  }

  // // 重置chroma表
  // async resetCollection(collectionName = this.collectionName) {
  //   const client = new ChromaClient({ path: 'http://localhost:8000' })
  //   try {
  //     await client.deleteCollection({ name: collectionName })
  //     console.log(`Collection "${collectionName}" 已删除。`)
  //     await client.createCollection({ name: collectionName })
  //     console.log(`Collection "${collectionName}" 已重新创建。`)
  //   }
  //   catch (error) {
  //     console.error(`重置 Collection 时出错:`, error)
  //   }
  // }

  // 获取chroma表中的文档数量
  async chromaClient() {
    const client = new ChromaClient({ path: 'http://localhost:8000' })
    // 注意：collectionName 必须与你在 LangChain 中使用的名称完全一致
    const collectionName = this.collectionName
    const collection = await client.getCollection({ name: collectionName })
    const count = await collection.count()
    console.log(`Collection "${collectionName}" 中的文档数量: ${count}`)
  }
}
