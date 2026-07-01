import type { OpenAIBaseInput } from '@langchain/openai'
import process from 'node:process'
import { ChatMessageHistory } from '@langchain/classic/memory'
import { ToolMessage } from '@langchain/core/messages'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { RunnableSequence, RunnableWithMessageHistory } from '@langchain/core/runnables'
import { tool } from '@langchain/core/tools'
import { ChatOpenAI } from '@langchain/openai'
import z from 'zod'
import { cell } from '../utils'

/**
 * MBTI Chat Bot — 新交互范式
 *
 * 不同于传统 GUI 的"点点点"交互，我们用自然语言对话。
 * LLM 会询问用户的 MBTI 类型和问题，多轮对话收集足够信息后，
 * 再调用工具获取 MBTI 性格描述、匹配职业、恋爱建议等。
 *
 * 核心设计思路：
 * 1. 新交互范式：不像传统 GUI 那样点按钮，而是通过自然语言多轮对话收集信息
 * 2. 信息收集：LLM 会询问用户的 MBTI 类型和问题，只有收集到足够信息才调用工具
 * 3. 三个工具：get_mbti_description、get_mbti_careers、get_mbti_love_advice
 *
 * 对话流程示例：
 * - 用户："你好，我想了解一下 MBTI"
 *   → 助手："你好！请问你的 MBTI 类型是？（16种之一，如 INTJ、ENFP 等）"
 * - 用户："我是 INTJ"
 *   → 助手："很高兴认识你，INTJ！请问你想了解哪方面的内容？比如性格特点、职业推荐还是恋爱建议？"
 * - 用户："我适合什么工作？"
 *   → 助手：[调用 get_mbti_careers 工具]
 *   → INTJ 适合的职业有：战略顾问、建筑师、软件工程师、数据科学家、法官
 */

// MBTI 性格描述数据
const mbtiInfo: Record<string, string> = {
  istj: '严肃、安静、藉由集中心志与全力投入、及可被信赖获致成功。行事务实、有序、实际、逻辑、真实及可信赖十分留意且乐于任何事（工作、居家、生活均有良好组织及有序。负责任。照设定成效来作出决策且不畏阻挠与闲言会坚定为之。重视传统与忠诚。传统性的思考者或经理。',
  isfj: '安静、和善、负责任且有良心。行事尽责投入。安定性高，常居项目工作或团体之安定力量。愿投入、吃苦及力求精确。兴趣通常不在于科技方面。对细节事务有耐心。忠诚、考虑周到、知性且会关切他人感受。致力于创构有序及和谐的工作与家庭环境。',
  infj: '因为坚忍、创意及必须达成的意图而能成功。会在工作中投注最大的努力。默默强力的、诚挚的及用心的关切他人。因坚守原则而受敬重。提出造福大众利益的明确远景而为人所尊敬与追随。追求创见、关系及物质财物的意义及关联。想了解什么能激励别人及对他人具洞察力。光明正大且坚信其价值观。有组织且果断地履行其愿景。',
  intj: '具强大动力与本意来达成目的与创意—固执顽固者。有宏大的愿景且能快速在众多外界事件中找出有意义的模范。对所承负职务，具良好能力于策划工作并完成。具怀疑心、挑剔性、独立性、果决，对专业水准及绩效要求高。',
  istp: '冷静旁观者—安静、预留余地、弹性及会以无偏见的好奇心与未预期原始的幽默观察与分析。有兴趣于探索原因及效果，技术事件是为何及如何运作且使用逻辑的原理组构事实、重视效能。擅长于掌握问题核心及找出解决方式。分析成事的缘由且能实时由大量资料中找出实际问题的核心。',
  isfp: '羞怯的、安宁和善地、敏感的、亲切的、且行事谦虚。喜于避开争论，不对他人强加已见或价值观。无意于领导却常是忠诚的追随者。办事不急躁，安于现状无意于以过度的急切或努力破坏现况，且非成果导向。喜欢有自有的空间及照自订的时程办事。',
  infp: '安静观察者，具理想性与对其价值观及重要之人具忠诚心。希外在生活形态与内在价值观相吻合。具好奇心且很快能看出机会所在。常担负开发创意的触媒者。除非价值观受侵犯，行事会具弹性、适应力高且承受力强。具想了解及发展他人潜能的企图。想作太多且作事全神贯注。对所处境遇及拥有不太在意。具适应力、有弹性除非价值观受到威胁。',
  intp: '安静、自持、弹性及具适应力。特别喜爱追求理论与科学事理。习于以逻辑及分析来解决问题—问题解决者。最有兴趣于创意事务及特定工作，对聚会与闲聊无大兴趣。追求可发挥个人强烈兴趣的生涯。追求发展对有兴趣事务之逻辑解释。',
  estp: '擅长现场实时解决问题—解决问题者。喜欢办事并乐于其中及过程。倾向于喜好技术事务及运动，交结同好友人。具适应性、容忍度、务实性；投注心力于会很快具成效工作。不喜欢冗长概念的解释及理论。最专精于可操作、处理、分解或组合的真实事务。',
  esfp: '外向、和善、接受性、乐于分享喜乐予他人。喜欢与他人一起行动且促成事件发生，在学习时亦然。知晓事件未来的发展并会热列参与。最擅长于人际相处能力及具备完备常识，很有弹性能立即适应他人与环境。对生命、人、物质享受的热爱者。',
  enfp: '充满热忱、活力充沛、聪明的、富想象力的，视生命充满机会但期能得自他人肯定与支持。几乎能达成所有有兴趣的事。对难题很快就有对策并能对有困难的人施予援手。依赖能改善的能力而无须预作规划准备。为达目的常能找出强制自己为之的理由。即兴执行者。',
  entp: '反应快、聪明、长于多样事务。具激励伙伴、敏捷及直言讳专长。会为了有趣对问题的两面加予争辩。对解决新及挑战性的问题富有策略，但会轻忽或厌烦经常的任务与细节。兴趣多元，易倾向于转移至新生的兴趣。对所想要的会有技巧地找出逻辑的理由。长于看清础他人，有智能去解决新或有挑战的问题。',
  estj: '务实、真实、事实倾向，具企业或技术天份。不喜欢抽象理论；最喜欢学习可立即运用事理。喜好组织与管理活动且专注以最有效率方式行事以达致成效。具决断力、关注细节且很快作出决策—优秀行政者。会忽略他人感受。喜作领导者或企业主管。',
  esfj: '诚挚、爱说话、合作性高、受欢迎、光明正大的—天生的合作者及活跃的组织成员。重和谐且长于创造和谐。常作对他人有益事务。给予鼓励及称许会有更佳工作成效。最有兴趣于会直接及有形影响人们生活的事务。喜欢与他人共事去精确且准时地完成工作。',
  enfj: '热忱、易感应及负责任的--具能鼓励他人的领导风格。对别人所想或希求会表达真正关切且切实用心去处理。能怡然且技巧性地带领团体讨论或演示文稿提案。爱交际、受欢迎及富同情心。对称许及批评很在意。喜欢带引别人且能使别人或团体发挥潜能。',
  entj: '坦诚、具决策力的活动领导者。长于发展与实施广泛的系统以解决组织的问题。专精于具内涵与智能的谈话如对公众演讲。乐于经常吸收新知且能广开信息管道。易生过度自信，会强于表达自已创见。喜于长程策划及目标设定。',
}

const mbtiList = Object.keys(mbtiInfo)

export default class MBTIBot {
  static cells: string[] = []

  // 内存 history，用于演示
  private history = new ChatMessageHistory()

  getLLM(configs: Partial<OpenAIBaseInput> = {}) {
    return new ChatOpenAI({
      configuration: {
        baseURL: 'https://api.minimaxi.com/v1',
      },
      apiKey: process.env.MINIMAX_API_KEY,
      model: 'MiniMax-M2.7-highspeed',
      modelKwargs: { reasoning_split: true }, // 关键：miniMax拆分思考过程, 兼容OpenAI的function call
      ...configs,
    })
  }

  @cell
  async mbtiChain() {
    // 提示模板
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `你是一个共情能力非常强的心理医生，并且很了解MBTI（迈尔斯-布里格斯性格类型指标)的各种人格类型，你的任务是根据来访者的 MBTI 和问题，给出针对性的情感支持，你的回答要富有感情、有深度和充足的情感支持，引导来访者乐观积极面对问题`,
      ],
      ['human', '用户的 MBTI 类型是{type}, 这个类型的特点是{info}, 他的问题是{question}'],
    ])

    const mbtiChain = RunnableSequence.from([
      prompt,
      this.getLLM(),
      new StringOutputParser(),
    ])
    return mbtiChain
  }

  async mbtiAgent(mbtiChain: RunnableSequence) {
    const mbtiTool = tool(
      async ({ type, question }) => {
        const info = mbtiInfo[type.toLowerCase()]
        console.log('🚀 get-mbti-chat.info:', { type, info, question })
        const res = await mbtiChain.invoke({ type, question, info })
        return res
      },
      {
        name: 'get-mbti-chat',
        schema: z.object({
          type: z.enum(mbtiList).describe('用户的 MBTI 类型'),
          question: z.string().describe('用户的问题'),
        }),
        description: '根据用户的问题和 MBTI 类型，回答用户的问题',
      },
    )

    const tools = [mbtiTool]
    const model = this.getLLM({ temperature: 0.4 })
    const modelWithTools = model.bindTools(tools)

    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        '你是一个用户接待的 agent，通过自然语言询问用户的 MBTI 类型和问题，直到你有足够的信息调用 get-mbti-chat 来回答用户的问题',
      ],
      new MessagesPlaceholder('history_message'),
      ['human', '{input}'],
    ])

    // 创建一个能处理工具调用的链
    const agentRunnable = RunnableSequence.from([
      // 把 input 和当前历史拼成 prompt 需要的参数
      async (input: any) => {
        console.log('🚀 input:', input)
        const historyMessages = await this.history.getMessages()
        console.log('🚀 historyMessages:', historyMessages)
        return {
          input: typeof input === 'string' ? input : input.input,
          history_message: historyMessages,
        }
      },
      prompt,
      async (messages: any[]) => {
        console.log('🚀 messages:', messages)
        // messages 已经是完整的消息列表（包含系统、历史、当前用户输入）
        const response = await modelWithTools.invoke(messages)
        // 1. 将 AI 的工具调用消息加入历史
        await this.history.addMessage(response)
        console.log('🚀 response.tool_calls:', response.tool_calls)
        // 如果模型返回了工具调用
        const toolCalls = response.tool_calls
        if (Array.isArray(toolCalls) && toolCalls.length > 0) {
          const toolResults = await Promise.all(
            toolCalls.map(async (tool) => {
              const fn = tools.find(t => t.name === tool.name) as any
              if (!fn)
                throw new Error(`Unknown tool: ${tool.name}`)
              const result = await fn.invoke(tool.args)
              const toolMsg = new ToolMessage({ content: result, tool_call_id: tool.id! })
              await this.history.addMessage(toolMsg) // 工具结果也放入历史
              return toolMsg
            }),
          )
          const updatedMessages = await this.history.getMessages()
          const res = await modelWithTools.invoke(updatedMessages)
          console.log('🚀 res:', res)
          return res
        }

        // 如果没有工具调用，保存到历史并返回
        await this.history.addMessage(response)
        return response
      },
    ])

    return agentRunnable
  }

  @cell
  async main() {
    console.log('====================================\n')

    // 根据 mbti 类型 回答用户问题
    const mbtiChain = await this.mbtiChain()

    // 像心理医生一样询问出用户的 MBTI 类型
    const mbtiAgent = await this.mbtiAgent(mbtiChain)

    // 使用 RunnableWithMessageHistory 自动管理历史消息
    const chainWithHistory = new RunnableWithMessageHistory({
      runnable: mbtiAgent,
      getMessageHistory: _sessionId => this.history,
      inputMessagesKey: 'input',
      historyMessagesKey: 'history_message',
    })

    // // 对话测试
    // const res1 = await chainWithHistory.invoke(
    //   { input: '你好，我想了解一下 MBTI' },
    //   { configurable: { sessionId: 'none' } },
    // )
    // console.log('🚀 助手:', res1)

    return chainWithHistory
  }
}
