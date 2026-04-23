import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate, HumanMessagePromptTemplate, PipelinePromptTemplate, PromptTemplate, SystemMessagePromptTemplate } from '@langchain/core/prompts'
import { ChatOllama } from '@langchain/ollama'
import { cell } from '../utils'

/**
 * prompt 是大模型的核心, 传统方式基于字符串拼接;
 * 有了 Langchain 提供的模板工具,
 * 可以更方便,工程化建构和管理 prompt
 */
export default class Prompt {
  static cells: string[] = []

  /**
   * Prompt 基础模板
   * 1. 变量花括号不能有空格
   * 2. 双花括号可以转义自身
   */
  @cell
  async basePrompt() {
    const greetingPrompt = new PromptTemplate({
      inputVariables: ['timeOfDay', 'name'],
      template: 'Good {timeOfDay}! {name} {{test}}',
    })

    const formattedGreetingPrompt = await greetingPrompt.format({ timeOfDay: 'morning', name: 'Tom' })

    console.log(formattedGreetingPrompt)
  }

  /**
   * 可以分阶段一步一步的填充参数
   *
   * partial 函数可以不必等到所有参数都填充,就可以创建 prompt
   */
  @cell
  async partialPrompt() {
    const prompt = new PromptTemplate({
      inputVariables: ['timeOfDay', 'name'],
      template: 'Good {timeOfDay}! {name}',
    })

    const partialPrompt = await prompt.partial({ timeOfDay: 'morning' })

    const formatted = await partialPrompt.format({ name: 'Tom' })

    console.log(formatted)
  }

  /**
   * 变量使用函数的形式
   *
   * 注意默认函数不能传递参数,但可通过闭包来实现;
   */
  @cell
  async functionPrompt() {
    const datePromptTpl = new PromptTemplate({
      inputVariables: ['date', 'activity'],
      template: 'On {date}, I will {activity}',
    })

    const getCurrentDateStr = () => new Date().toLocaleDateString()

    const partialDatePrompt = await datePromptTpl.partial({ date: getCurrentDateStr })

    const formattedParkPrompt = await partialDatePrompt.format({
      activity: '去爬山',
    })

    console.log(formattedParkPrompt)
  }

  /**
   * 变量使用闭包的形式
   *
   * 变量 可以使用闭包的形式,来实现参数的传递
   */
  @cell
  async closurePrompt() {
    const promptTpl = new PromptTemplate({
      inputVariables: ['greeting'],
      template: '{greeting}!',
    })

    const getCurrentDateStr = () => new Date().toLocaleDateString()

    const genGreeting = (timeOfDay: string) => {
      return () => {
        const date = getCurrentDateStr()
        return `${date}, Good ${timeOfDay}`
      }
    }

    const partialDateGreetingPrompt = await promptTpl.partial({
      greeting: genGreeting('morning'),
    })

    const dateGreeting = await partialDateGreetingPrompt.format({})

    console.log(dateGreeting)
  }

  /**
   * 聊天提示词
   *
   * Chat prompt (增加了角色信息, system/user/assistant)
   */
  @cell
  async chatPrompt() {
    // system 角色, 用于设置模型的行为和风格
    const translateInstructionTpl = SystemMessagePromptTemplate.fromTemplate('你是一个专业的翻译, 你可以将 {sourceLang} 翻译成 {targetLang}.')
    // user 角色, 用于输入用户的问题
    const userQuestionTpl = HumanMessagePromptTemplate.fromTemplate('请翻译: {text}')
    // assistant 角色, 用于输出模型的回复
    const chatPrompt = ChatPromptTemplate.fromMessages([translateInstructionTpl, userQuestionTpl])

    // const formattedChatPrompt = await chatPrompt.formatMessages({
    //   sourceLang: 'en',
    //   targetLang: 'zh',
    //   text: 'Hello, I am a student.',
    // })
    // console.log(formattedChatPrompt)

    // 组合 chain = llm + prompt + outputParser
    const llm = new ChatOllama({ think: false, model: 'qwen3:8b' })
    const outputParser = new StringOutputParser()
    const chain = chatPrompt.pipe(llm).pipe(outputParser)

    const result = await chain.invoke({
      sourceLang: 'en',
      targetLang: 'zh',
      text: 'Hello, I am a student.',
    })
    console.log(result)
  }

  /**
   * 组合多个 Prompt (PipelinePromptTemplate工具)
   * 可以实现多个子模板的组合和变量的复用; 用于构建复杂的复杂的提示词
   *
   * 1. 具有 pipelinePrompts 数组, 用于存储所有的子模板
   * 2. 具有 finalPrompt, 用于存储最终的提示词
   */
  @cell
  async pipelinePrompt() {
    // 统一所有子模板的输入类型
    interface PipelineInput {
      period: string
      name: string
      gender: string
      food: string
    }

    const getCurrentDate = () => new Date().toLocaleDateString()

    const fullPrompt = PromptTemplate.fromTemplate<PipelineInput>(`
你是一个智能管家，今天是 {date}，你的主人的信息是{info}, 
根据上下文，完成主人的需求
{task}`)

    const datePrompt = PromptTemplate.fromTemplate<PipelineInput>('{date}，现在是 {period}')
    const periodPrompt = await datePrompt.partial({
      date: getCurrentDate,
    })

    const infoPrompt = PromptTemplate.fromTemplate<PipelineInput>('姓名是 {name}, 性别是 {gender}')

    const taskPrompt = PromptTemplate.fromTemplate<PipelineInput>(`
我想吃 {period} 的 {food}。 
再重复一遍我的信息 {info}`)

    const composedPrompt = new PipelinePromptTemplate({
      pipelinePrompts: [
        {
          name: 'date',
          prompt: periodPrompt,
        },
        {
          name: 'info',
          prompt: infoPrompt,
        },
        {
          name: 'task',
          prompt: taskPrompt,
        },
      ],
      finalPrompt: fullPrompt,
    })

    const formattedPrompt = await composedPrompt.format({
      period: '早上',
      name: '张三',
      gender: 'male',
      food: 'lemon',
    })

    console.log(formattedPrompt)
  }
}
