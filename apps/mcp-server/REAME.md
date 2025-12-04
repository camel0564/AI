# fddr-mcp-server

`type PlaceOrderInput = z.infer<typeof placeOrderInputSchema>;`

生活服务平台AI机器人

场景: 用户搜索清洗油烟机; AI机器人从数据库中查找附近综合评分较高的清洗油烟机服务,给出推荐理由,让用户挑选并加入购物车,用户确认订单后,清洗人员到用户位置,开始清洗.

## what is mcp server

mcp server features:

1. `Tools` `操作` LLM自主决定调用哪些工具 但 每次执行必须用户批准。
2. `Resources` `数据` 信息结构化，作为上下文提供给AI模型。
3. `Prompts` `交互` 提示词模板,提示用户如何使用.

## 命令
1. `dev` 启动开发服务器
2. `debug` 调试服务器
3. `build` 构建服务器
4. `serve` 启动服务器

端口占用
`kill -9 $(lsof -ti:3127)`

## ai-agents 对比

| name      | stars | langs  |
| --------- | ----- | ------ |
| langchain | 121k  | python |
| dify      | 120k  | python / ts(react) |

## 使用

方式1: `node`

```js
{
  "mcpServers": {
    "fddr-mcp-server": {
      "command": "node",
      "args": ["/Users/hf/i/mcp/mcp-server/build/index.js"]
    }
  }
}
```

方式2: `npx`

```js
{
  "mcpServers": {
    "fddr-mcp-server": {
      "command": "npx",
      "args": [
        "--package",
        "/Users/hf/i/mcp/mcp-server",
        "fddr-mcp-server"
      ]
    }
  }
}
```