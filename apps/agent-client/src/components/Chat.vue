<script setup lang="ts">
import { ref } from 'vue'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Message {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: Date
}

const messages = ref<Message[]>([
  {
    id: '1',
    content: '你好！我是你的 AI 助手，有什么可以帮助你的吗？',
    sender: 'assistant',
    timestamp: new Date(),
  },
])

const inputValue = ref('')

function sendMessage() {
  if (!inputValue.value.trim())
    return

  const userMessage: Message = {
    id: Date.now().toString(),
    content: inputValue.value.trim(),
    sender: 'user',
    timestamp: new Date(),
  }

  messages.value.push(userMessage)
  inputValue.value = ''

  // 模拟 AI 回复
  setTimeout(() => {
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: `我收到了你的消息："${userMessage.content}"。这是一个模拟回复。`,
      sender: 'assistant',
      timestamp: new Date(),
    }
    messages.value.push(assistantMessage)
  }, 1000)
}
</script>

<template>
  <div class="flex flex-col h-screen max-w-4xl mx-auto p-4">
    <Card class="flex-1 flex flex-col">
      <CardHeader>
        <CardTitle class="text-center">AI 聊天助手</CardTitle>
      </CardHeader>
      <CardContent class="flex-1 p-0">
        <ScrollArea class="h-[calc(100vh-200px)] p-4">
          <div class="space-y-4">
            <div
              v-for="message in messages"
              :key="message.id"
              class="flex"
              :class="message.sender === 'user' ? 'justify-end' : 'justify-start'"
            >
              <div class="flex items-start gap-2 max-w-[80%]">
                <Avatar v-if="message.sender === 'assistant'" class="h-8 w-8">
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div
                  class="p-3 rounded-lg"
                  :class="message.sender === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'"
                >
                  <p>{{ message.content }}</p>
                  <p class="text-xs opacity-70 mt-1">
                    {{ message.timestamp.toLocaleTimeString() }}
                  </p>
                </div>
                <Avatar v-if="message.sender === 'user'" class="h-8 w-8">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
      <div class="p-4 border-t">
        <div class="flex gap-2">
          <input
            v-model="inputValue"
            type="text"
            placeholder="输入消息..."
            class="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            @keyup.enter="sendMessage"
          >
          <Button @click="sendMessage">发送</Button>
        </div>
      </div>
    </Card>
  </div>
</template>
