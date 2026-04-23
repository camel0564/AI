import { TextLoader } from '@langchain/classic/document_loaders/fs/text'
import { RecursiveCharacterTextSplitter, SupportedTextSplitterLanguages } from '@langchain/classic/text_splitter'
import { cell } from '../utils'

/**
 * 2. Splitter：文本切分小块 Chunk
 *
 * 由于 LLM 上下文窗口大小有限制
 * 所以获取到数据后,需要进行分块处理
 *
 * 拆分文本块有2个关键参数
 * 1. `chunkSize` 1000 太大包含信息多个容易是llm分神,成本增加;太小信息不完整,质量差
 * 2. `chunkOverlap` 200 相邻块的重叠部分(为了尽量保证信息完整性)
 * 这2个参数在后期需要根据文档特征,人为的调优;或许还有其他方法.
 *
 * 可以用 chunkviz 可视化的查看分块结果 (https://chunkviz.up.railway.app/)
 */
export default class DocSplitter {
  static cells: string[] = []

  @cell
  async loadDoc() {
    const loader = new TextLoader('data/kongyiji.txt')
    const docs = await loader.load()
    // console.log('🚀 docs:', docs)
    return docs
  }

  /**
   * 文本拆分; 是最基础的.
   * 其他的拆分工具是再次基础上根据文档类型,增加了一些优化
   */
  @cell
  async splitDoc() {
    const docs = await this.loadDoc()
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 100, // 块大小 默认1000
      chunkOverlap: 20, // 相邻块的重叠部分 默认200
    })

    const splitDocs = await splitter.splitDocuments(docs)
    console.log('🚀 splitDocs:', splitDocs)
    return splitDocs
    // 可以用 chunkviz 可视化的查看分块结果 (https://chunkviz.up.railway.app/)
  }

  /**
   * 其他类型文件的拆分
   * 例如: js
   */
  @cell
  async chunkOther() {
    console.log('🚀 拆分工具支持的所有文本格式类型:', SupportedTextSplitterLanguages)

    const js = `
    function myFunction(name,job){
      console.log("Welcome " + name + ", the " + job);
    }

    myFunction('Harry Potter','Wizard')

    function forFunction(){
      for (let i=0; i<5; i++){
        console.log("这个数字是" + i)
      }
    }

    forFunction()
    `
    const splitter = RecursiveCharacterTextSplitter.fromLanguage('js', {
      chunkSize: 100,
      chunkOverlap: 0,
    })
    const jsChunk = await splitter.createDocuments([js])
    console.log('🚀 jsChunk:', jsChunk)
  }
}
