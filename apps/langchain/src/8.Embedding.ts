/* eslint-disable antfu/no-top-level-await */
// 2.1 TextLoader
import path from 'node:path'
import { TextLoader } from '@langchain/classic/document_loaders/fs/text'

// 2. loader

import { Document } from '@langchain/core/documents'
/**
 * 数据源的加载 RAG的本质是给 chat bot 外挂数据源
 * Langchain 提供了多种 loader 来加载不同的数据
 */

// 1. Document对象 是 langchain 对所有数据源的统一抽象

const test = new Document({
  pageContent: '这是一个测试文档',
  metadata: {
    source: 'test Title',
  },
})

console.log(test)

const filePath = path.resolve(__dirname, 'data/fanren.txt')
const loader = new TextLoader(filePath)

const docs = await loader.load()
console.log('🚀 docs:', docs)
