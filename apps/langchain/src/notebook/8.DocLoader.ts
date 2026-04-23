import path from 'node:path'
import process from 'node:process'
import { DirectoryLoader } from '@langchain/classic/document_loaders/fs/directory'
import { TextLoader } from '@langchain/classic/document_loaders/fs/text'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio'
import { GithubRepoLoader } from '@langchain/community/document_loaders/web/github'
import { SerpAPILoader } from '@langchain/community/document_loaders/web/serpapi'
import { Document } from '@langchain/core/documents'
import { cell } from '../utils'

/**
 * 1. Loader 加载 txt/pdf/网页 转换为 原始文档
 *
 * 数据源的加载 RAG的本质是给 chat bot 外挂数据源
 * Langchain 提供了多种 loader 来加载不同的数据
 */
export default class DocLoader {
  static cells: string[] = []

  // 文档抽象类
  @cell
  async document() {
    const test = new Document({
      pageContent: '这是一个测试文档',
      metadata: {
        source: 'test Title',
      },
    })
    console.log(test)
  }

  // 加载 txt 文件
  @cell
  async loadTxt() {
    const filePath = path.join(process.cwd(), 'data/fanren.txt')
    const loaderTxt = new TextLoader(filePath)
    const docTxt = await loaderTxt.load()
    console.log('🚀 docTxt:', docTxt)
  }

  // 加载 pdf 文件
  @cell
  async loadPdf() {
    const loader = new PDFLoader('data/test.pdf')
    console.log('🚀 loader:', loader)
    const pdf = await loader.load()
    console.log('🚀 pdf:', pdf[0].metadata)
  }

  // 加载目录下的所有不同格式文件的文档
  @cell
  async loadDir() {
    const loader = new DirectoryLoader(
      './data',
      {
        '.pdf': path => new PDFLoader(path),
        '.txt': path => new TextLoader(path),
      },
    )

    const docs = await loader.load()
    console.log('🚀 docs:', docs)
  }

  /**
   * 加载github
   * 例如使用某个开源库文档不全或者遇到问题,
   * 让 AI 去github仓库寻找答案
   */
  @cell
  async loadGithub() {
    const loader = new GithubRepoLoader(
      'https://github.com/hanfengv-cell/tui',
      {
        branch: 'main', // 分支名称
        recursive: false, // 是否递归加载子目录
        unknown: 'warn', // 对未知文件类型的处理策略
        maxConcurrency: 5, // 最大并发数
        ignorePaths: ['*.json'], // 忽略的文件路径
        accessToken: process.env.GITHUB_ACCESS_TOKEN, // 没有设置也能访问,但有频率限制
      },
    )
    const gitRepo = await loader.load()
    console.log('🚀 gitRepo:', gitRepo)
  }

  /**
   * 加载静态html网页
   * langChain 还支持加载js动态渲染的网页; 例如: Playwright/Puppeteer 等 参考官方文档即可
   */
  @cell
  async loadWeb() {
    const loader = new CheerioWebBaseLoader('https://www.gov.cn/guoqing/', {
      selector: '.box1_txt_con',
    })

    const webDoc = await loader.load()
    console.log('🚀 webDoc:', webDoc)
  }

  /**
   * 搜索引擎加载 类似bing,百度智能搜索 但是收费
   * 免费版本每天100次请求
   */
  @cell
  async loadSearch() {
    const apiKey = process.env.SERP_API_KEY
    const question = '什么是 langchain.js'
    const loader = new SerpAPILoader({ q: question, apiKey })
    const answer = await loader.load()
    console.log('🚀 answer:', answer)
  }
}
