import { OutputFixingParser } from '@langchain/classic/output_parsers'
import {
  CommaSeparatedListOutputParser,
  StringOutputParser,
  StructuredOutputParser,
} from '@langchain/core/output_parsers'
import { PromptTemplate } from '@langchain/core/prompts'
import { ChatOllama } from '@langchain/ollama'
import { z } from 'zod'
import { cell } from '../utils'

/**
 * OutputParser 的主要作用
 *
 * 1. 解析并兼容不同大模型的文本输出格式 (Message.content字段)
 * 2. 结构化输出 例如: JSON, XML, CSV
 */
export default class OutputParser {
  static cells: string[] = []

  /**
   * 基础解析器
   * 相当于读取Message.content字段中的文本内容
   */
  @cell
  async baseParser() {
    const llm = new ChatOllama({ model: 'qwen3:8b', think: false })
    const parser = new StringOutputParser()
    const chain = llm.pipe(parser)

    const res = await chain.invoke('hi')
    console.log(res)
  }

  /**
   * 2. 结构化输出 例如: JSON, XML, CSV
   * 本质上 Langchain 会根据你给出的key-value 封装出一个完善的提示词;
   * 提示词结构如下:
   * 1. 先告诉 LLM 输出类型为JSON
   * 2. 举例子,说明输出的格式正确和错误的情况;
   * 3. 再次强调 LLM 输出格式的重要性
   * 4. 最后给出我们指定的 JSON 格式和对应的描述
   */
  @cell
  async jsonParser() {
    const parser = StructuredOutputParser.fromNamesAndDescriptions({
      answer: '用户问题的答案',
      evidence: '你回答用户问题所依据的答案',
      confidence: '问题答案的可信度评分，格式是百分数',
    })
    // console.log(parser.getFormatInstructions())

    const llm = new ChatOllama({ model: 'qwen3:8b', think: false })
    const prompt = PromptTemplate.fromTemplate('尽可能的回答用户的问题 \n{instructions} \n{question}')
    const chain = prompt.pipe(llm).pipe(parser)

    const res = await chain.invoke({
      instructions: parser.getFormatInstructions(),
      question: '孙悟空是谁?是谁创作的?',
    })

    console.log(res)
  }

  /**
   * 输出格式化为数组 List Output Parser;
   * 还有其他很多Parser原理类似
   */
  @cell
  async listParser() {
    const prompt = PromptTemplate.fromTemplate(`列出3个{country}的著名互联网公司官网地址.
{instructions}`)

    const listOutParser = new CommaSeparatedListOutputParser()
    console.log('🚀 listOutParser:', listOutParser.getFormatInstructions())
    const llm = new ChatOllama({ model: 'qwen3:8b', think: false })
    const chain = prompt.pipe(llm).pipe(listOutParser)

    const res = await chain.invoke({
      country: '中国',
      instructions: listOutParser.getFormatInstructions(),
    })

    console.log(res)
  }

  /**
   * 修复错误的输出格式; Auto Fix Parser
   * 如果回答不符合预期格式, 让模型自己修复输出的格式
   */
  @cell
  async autoFixParser() {
    const schema = z.object({
      answer: z.string().describe('用户问题的答案'),
      confidence: z.number().min(0).max(100).describe('问题答案的可信度评分，满分 100'),
    })

    const prompt = PromptTemplate.fromTemplate('尽可能的回答用户的问题 \n{instructions} \n{question}')
    const parser = StructuredOutputParser.fromZodSchema(schema)
    const llm = new ChatOllama({ model: 'qwen3:8b', think: false })
    const chain = prompt.pipe(llm).pipe(parser)

    const res = await chain.invoke({
      instructions: parser.getFormatInstructions(),
      question: '孙悟空是谁?是谁创作的?',
    })
    console.log('🚀 res:', res)

    const fixParser = OutputFixingParser.fromLLM(llm, parser)

    const wrongOutput = {
      answer: '孙悟空是中国古典小说《西游记》中的主要角色，由明代作家吴承恩创作。',
      confidence: '90%',
    }

    const output = await fixParser.parse(JSON.stringify(wrongOutput))
    console.log('🚀 output:', output)
  }
}
