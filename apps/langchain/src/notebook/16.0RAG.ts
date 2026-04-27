import type { Document } from '@langchain/core/documents'
import { TextLoader } from '@langchain/classic/document_loaders/fs/text'
import { RecursiveCharacterTextSplitter } from '@langchain/classic/text_splitter'
import { Chroma } from '@langchain/community/vectorstores/chroma'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { RunnableLambda, RunnablePassthrough, RunnableSequence, RunnableWithMessageHistory } from '@langchain/core/runnables'
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama'
import { ChromaClient } from 'chromadb'
import { cell } from '../utils'
import { JSONChatHistory } from './15.1.JSONChatHistory'

function promptVerbose(promptName: string) {
  return RunnableLambda.from(async (promptValue: string) => {
    console.log(`\n🚀 ========== prompt start: ${promptName} ==========\n`)
    console.log('🚀 promptValue:\n', promptValue.toString())
    console.log(`\n🚀 ========== prompt ened: ${promptName} ===================\n`)
    return promptValue // 原样传递下去
  })
} // 打印提示词

/**
 * 完整的RAG实现
 *
 */
export default class RAG {
  static cells: string[] = []

  /** 文档名称 caofangzi */
  docName = 'caofangzi'

  /**
   * 1.1 load 加载文档
   */
  @cell
  async loadDoc(docPath: string) {
    const loader = new TextLoader(docPath)
    const docTxt = await loader.load()
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
   * 2.2 保存数据到向量数据库
   */
  @cell
  async saveToDB(splitDocs: Document[], embeddings: OllamaEmbeddings) {
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
    await vectorStore.ensureCollection() // 确保集合存在; 初始化集合。如果集合不存在，此方法会自动创建它。这里会有一个警告的bug,需要npm默认的embeding算法库即可
    return vectorStore
  }

  /**
   * 判断是否已经向量化
   */
  async isVectored(collectionName = this.docName) {
    const client = new ChromaClient({
      // path: 'http://localhost:8000',
    })
    const collection = await client.getCollection({ name: collectionName })
    const count = await collection.count()
    console.log(`Collection "${collectionName}" 中的文档数量: ${count}`)
    return count > 0
  }

  /**
   * 选择一款聊天模型
   */
  chatModel() {
    const llm = new ChatOllama({
      baseUrl: 'http://localhost:11434',
      model: 'qwen2.5:7b',
      think: false,
    })
    return llm
  }

  /**
   * 改写问题,使得下次聊天时没有看过对话历史的llm也能理解
   * @params {question} 用户提问
   * @params {history} 聊天历史记录
   * @returns {standalone_question} 改写后的提问
   */
  async rephraseChain() {
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        '给定以下对话和一个后续问题，请将后续问题重述为一个独立的问题。请注意，重述的问题应该包含足够的信息，使得没有看过对话历史的人也能理解。',
      ],
      new MessagesPlaceholder('history'),
      ['human', '将以下问题重述为一个独立的问题：\n{question}'],
    ])

    const model = new ChatOllama({
      model: 'qwen2.5:7b',
      temperature: 0.2, // 温度越低,越忠于事实,减少自由发挥.
    })
    const chain = RunnableSequence.from([
      prompt,
      // promptVerbose('改写问题 rephraseChain'),
      model,
      new StringOutputParser(),
    ])
    return chain
  }

  /**
   * 根据 参数 `standalone_question` 检索相关片段
   * @params {standalone_question} 问题
   * @retruns {context} 相关片段
   */
  async contextRetrieverChain() {
    // 链接向量数据库
    const embeddings = await this.embeddings()
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
    const contextRetrieverChain = RunnableSequence.from([
      input => input.standalone_question, // 1. 从输入对象中提取`input.question`字段 并向下传递
      retriever, // 2. 根据问题检索相关上下文 并向下传递
      convertDocsToString, // 3. 拼接文档为一个字符串 并向下传递
    ])
    // const result = await contextRetrieverChain.invoke({ question: '原文中，桑桑得的什么病,最后怎么治好的?' })
    return contextRetrieverChain
  }

  @cell
  /**
   * RAG 流程
   */
  async ragChainWithHistory() {
    // 防止重复添加
    if (!await this.isVectored()) {
      const docPath = `data/${this.docName}.txt`
      // 加载文档
      const docTxt = await this.loadDoc(docPath)
      // 切割文档
      const splitDocs = await this.splitDoc(docTxt)

      // 向量数据库和retriever
      const embeddings = await this.embeddings() // 选择一款向量模型 (区别于聊天模型, 向量模型的用途是:文本和向量之间的相互转换)
      // 保存数据到向量数据库
      await this.saveToDB(splitDocs, embeddings)
    }

    // #region Template
    const SYSTEM_TEMPLATE = `
你是一个熟读曹文轩的《草房子》的终极原著党，精通根据作品原文详细解释和回答问题，你在回答时会引用作品原文。
并且回答时仅根据原文，尽可能回答用户问题，如果原文中没有相关内容，你可以回答“原文中没有相关内容”，

以下是原文中跟用户回答相关的内容：
{context}
`
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', SYSTEM_TEMPLATE],
      new MessagesPlaceholder('history'), // 预留历史消息的位置
      ['human', '现在，你需要基于原文，回答以下问题：\n{standalone_question}`'], // 改写后的提问
    ])

    // 改写问题chain
    const rephraseChain = await this.rephraseChain()
    // 根据问题获取相关知识片段 chain
    const contextRetrieverChain = await this.contextRetrieverChain()

    // 改写提问 => 根据改写后的提问检索文档 => 生成回复
    const model = this.chatModel()
    const ragChain = RunnableSequence.from([
      RunnablePassthrough.assign({
        standalone_question: rephraseChain,
      }), // 执行后有 {question,history,standalone_question}
      RunnablePassthrough.assign({
        context: contextRetrieverChain,
      }), // 执行后有 {question,history,standalone_question, contenxt}
      prompt,
      // promptVerbose('检索文档 ragChain'),
      model,
      new StringOutputParser(),
    ])

    const ragChainWithHistory = new RunnableWithMessageHistory({
      runnable: ragChain,
      getMessageHistory: sessionId => new JSONChatHistory({ sessionId, dir: 'data-chat' }),
      historyMessagesKey: 'history',
      inputMessagesKey: 'question',
    })

    return ragChainWithHistory

    const res1 = await ragChainWithHistory.invoke(
      {
        // 第1次提问.这个故事的主角是谁？ -> 第2次提问. 介绍他的故事
        question: '介绍他的故事',
      },
      {
        configurable: { sessionId: `${this.docName}-history` },
      },
    )
    console.log('🚀 res1:', res1)
  }
}
