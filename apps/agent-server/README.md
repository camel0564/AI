# agent-server

## 目录结构

llm 通过 api 对接不同的 llm 模型

```
curl -X POST http://localhost:11434/v1/chat/completions \
-H "Content-Type: application/json" \
-d '{
  "model": "qwen3:8b",
  "messages": [{ "role": "user", "content": "1+1等于多少" }],
  "think": false,
  "extra_body": { "enable_thinking": false },
  "stream": true
}'
```