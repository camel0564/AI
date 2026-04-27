import type { Document } from '@langchain/core/documents'
import { TextLoader } from '@langchain/classic/document_loaders/fs/text'
import { RecursiveCharacterTextSplitter } from '@langchain/classic/text_splitter'
import { Chroma } from '@langchain/community/vectorstores/chroma'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama'
import { ChromaClient } from 'chromadb'
import { cell } from '../utils'

/**
 * 参见16章,完整的RAG实现
 * 一个基于私域数据回答问题的 RAG bot
 *
 * demo是一本小说<<草房子>>
 */
export default class RAGBot {
  static cells: string[] = []

  /** 文档名称 */
  docName = 'caofangzi'

  /**
   * 1.1 load 加载文档
   */
  @cell
  async loadDoc(docPath: string) {
    const loader = new TextLoader(docPath)
    const docTxt = await loader.load()
    // console.log('🚀 docTxt:', docTxt)
    return docTxt
  }

  /**
   * 1.2 split 切割文档
   */
  @cell
  async splitDoc(docs: Document[]) {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500, // 块大小 默认1000
      chunkOverlap: 100, // 相邻块的重叠部分 默认200
    })

    const splitDocs = await splitter.splitDocuments(docs)
    // console.log('🚀 splitDocs:', splitDocs)
    return splitDocs
  }

  /**
   * 2.1 挑选 embedding 模型
   */
  @cell
  async embeddings() {
    const embeddings = new OllamaEmbeddings({
      model: 'bge-m3',
    })
    return embeddings
  }

  /**
   * 获取向量数据库中的某个表的数据数量
   */
  async getCollectionCount(collectionName = this.docName) {
    const client = new ChromaClient({
      // path: 'http://localhost:8000',
    })
    const collection = await client.getCollection({ name: collectionName })
    const count = await collection.count()
    console.log(`Collection "${collectionName}" 中的文档数量: ${count}`)
    return count
  }

  /**
   * 2.2 保存数据到向量数据库
   */
  @cell
  async saveToDB(splitDocs: Document[], embeddings: OllamaEmbeddings) {
    // 防止重复添加 TODO 每一个片段给id，避免重复添加相同内容
    const count = await this.getCollectionCount()
    if (count !== undefined && count > 0) {
      return console.log(`向量数据库 ${this.docName} 已存在 ${count} 条数据，跳过保存。`)
    }

    // 保存数据到向量数据库
    const vectorStore = await this.openVectorStore(embeddings, this.docName)
    const ids = await vectorStore.addDocuments(splitDocs)
    return ids
  }

  /**
   * 链接一个向量数据库中的一个表 (类似: mysql 中的 table)
   */
  async openVectorStore(embeddings: OllamaEmbeddings, collectionName = this.docName) {
    const vectorStore = new Chroma(embeddings, {
      collectionName,
      // url: 'http://localhost:8000', // 默认不用传, 传递会有警告,或者传递(host/port/ssl)
    })
    // await vectorStore.ensureCollection() // 确保集合存在; 初始化集合。如果集合不存在，此方法会自动创建它。这里会有一个警告的bug
    return vectorStore
  }

  /**
   * retrieve 检索器
   */
  @cell
  async retrieve(vectorStore: Chroma) {
    const retriever = vectorStore.asRetriever(3)
    const res = await retriever.invoke('原文中，桑桑得的什么病,最后怎么治好的?')
    console.log('🚀 res:', res)
  }

  /**
   * 选择一款聊天模型
   */
  ollama() {
    const llm = new ChatOllama({
      baseUrl: 'http://localhost:11434',
      model: 'qwen3:8b',
      think: false,
    })
    return llm
  }

  @cell
  /**
   * RAG 流程
   */
  async main() {
    // #region 处理原始数据
    const docPath = `data/${this.docName}.txt`
    // 加载文档
    const docTxt = await this.loadDoc(docPath)
    // 切割文档
    const splitDocs = await this.splitDoc(docTxt)
    // #endregion

    // #region 向量数据库和retriever
    const embeddings = await this.embeddings() // 选择一款向量模型 (区别于聊天模型, 向量模型的用途是:文本和向量之间的相互转换)
    // 保存数据到向量数据库
    await this.saveToDB(splitDocs, embeddings)

    // 链接向量数据库
    const vectorStore = await this.openVectorStore(embeddings, this.docName)

    // 生成检索器
    const retriever = vectorStore.asRetriever(3)
    // const retrieverRes = await retriever.invoke('原文中，桑桑得的什么病,最后怎么治好的?')

    // 拼接检索结果中的所有文档内容 (给llm用的纯文本)
    function convertDocsToString(docs: Document[]): string {
      return docs.map(doc => doc.pageContent).join('\n')
    }

    /**
     * 构建一个获取数据库中相关上下文的 chain
     * RunnableSequence的作用: 顺序且链式的执行多个Runable
     * 每一个Runable都有一个输入和一个输出,
     * 输入是前一个Runable的输出, 输出是后一个Runable的输入
     */
    const contextRetriverChain = RunnableSequence.from([
      input => input.question, // 1. 从输入对象中提取`input.question`字段 并向下传递
      retriever, // 2. 根据问题检索相关上下文 并向下传递
      convertDocsToString, // 3. 拼接文档为一个字符串 并向下传递
    ])

    // const result = await contextRetriverChain.invoke({ question: '原文中，桑桑得的什么病,最后怎么治好的?' })
    // console.log('🚀 result:', result)
    // #endregion

    // #region Template
    const TEMPLATE = `
你是一个熟读曹文轩的《草房子》的终极原著党，精通根据作品原文详细解释和回答问题，你在回答时会引用作品原文。
并且回答时仅根据原文，尽可能回答用户问题，如果原文中没有相关内容，你可以回答“原文中没有相关内容”，

以下是原文中跟用户回答相关的内容：
{context}

现在，你需要基于原文，回答以下问题：
{question}`

    const prompt = ChatPromptTemplate.fromTemplate(TEMPLATE)
    // #endregion

    // #region 完整chain
    const llm = this.ollama()
    const ragChain = RunnableSequence.from([
      {
        context: contextRetriverChain, // 执行contextRetriverChain返回查询结果
        question: input => input.question, // 简单返回`input.question`字段
      }, // 如果参数是一个对象会转变为RunnableMap(并行执行chain任务)->并将结果返回为一个Map对象(本例中返回{question:xx, context:xx})
      prompt, // 填充提示词 上一个并行任务的 返回值(即:{question:xx, context:xx})
      llm, // 聊天大模型 根据提示词回答问题
      new StringOutputParser(), // llm返回的Msg格式化输出为字符串
    ])

    const answer = await ragChain.invoke({ question: '原文中，桑桑得的什么病,最后怎么治好的?' })
    console.log('🚀 answer:', answer)
    // #endregion
  }
}
