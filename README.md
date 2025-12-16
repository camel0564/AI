# FlutterBase AI

## 命令

- `nr dev` 启动所有包的开发模式
- `nr build` 构建所有包 `nr build --filter=@ai/tools --filter=@ai/ui`

## 目录结构

```
├─ README.md
└─ apps/              # Monorepo app
   ├─ agent-client/       # 智能体客户端
   ├─ agent-server/       # 1. 整合 mcp / llm 模型 / Rag 功能; 2. 提供 restful api 接口
   ├─ mcp-client/         # 提供 h5/小程序 ui界面
   └─ mcp-server/         # MCP服务端
```

## zod

```typescript
// string & {}
z.custom<string & {}>(val => typeof val === 'string')
// [x]: string
.catchall(z.any().describe('扩展其他模型调优参数'))
```

## Monorepo

优点：

- 代码共享：多个包可以共享相同的代码，避免重复编写。
- 包版本依赖不会冲突
- 统一CI/CD

缺点:
- 代码管理：由于所有代码都在一个仓库中，管理起来可能会比较复杂。
- 学习成本
- 包权限无法细化

## 常用api

- `/v1/chat/completions` 实现多轮对话类任务
- `/v1/embeddings` 将文本转化为模型可理解的高维向量, 相似文本的向量距离更近;
- `/v1/models` 获取当前模型列表,校验模型是否存在 http://localhost:11434/v1/models
