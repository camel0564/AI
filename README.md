# FlutterBase AI

## 命令

- `nr dev` 启动所有包的开发模式
- `nr build` 构建所有包 `nr build --filter=@ai/tools --filter=@ai/ui`

## 目录结构

```
├─ README.md
└─ apps/              # Monorepo app
   ├─ agent-client/       # 智能体客户端
   ├─ mcp-client/         # MCP客户端
   ├─ mcp-debug/          # MCP调试工具
   └─ mcp-server/         # MCP服务端
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
