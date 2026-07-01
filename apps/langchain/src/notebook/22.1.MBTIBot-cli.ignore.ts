import process from 'node:process'
import readline from 'node:readline'
import MbtiBot from './22.0.MBTIBot'
import 'dotenv/config'

/**
 * 运行 MBTI Chat Bot
 * 命令: npx tsx src/notebook/22.1.MBTIBot-cli.ignore.ts
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

async function chat() {
  const mbtibot = new MbtiBot()
  const agentWithChatHistory = await mbtibot.main()

  rl.question('User: ', async (input) => {
    if (input.toLowerCase() === 'exit') {
      rl.close()
      return
    }

    const response = await agentWithChatHistory.invoke(
      {
        input,
      },
      {
        configurable: {
          sessionId: 'no-used',
        },
      },
    )

    console.log('Agent: ', response.content)

    chat()
  })
}

console.log('请输入问题。 输入 exit 退出聊天。')
chat()
