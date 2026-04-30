# AI 学习

## TODO

- [ ] langchain
- [ ] Claude Code
- [ ] OpenClaw
- [ ] LangGraph

## npm 包

- `langchain` = 面向开发者的 “主入口包”
  - `langchain/hub`（Prompt 管理）
- `@langchain/xxx` = 框架拆分后的底层 / 工具 / 集成子包
  - `@langchain/core`（底层抽象）
  - `@langchain/community/tools`（工具大集合）

## 常见术语概念

- `LangSmith`：LLM 应用的可观测 / 调试 / 评估平台 (云服务,个人基本免费(5千条/月))
- `Hub` `https://smith.langchain.com/hub` 是 langChain 里的一个模块：专门管 Prompt (共享和版本管理)
- `ReAct模式`: 一种由Google DeepMind 提出的 Agent 交互范式，包括思考、行动、观察三个阶段
- `tools` `@langchain/community/tools/` 给 AI（LLM/Agent）用的工具大集合
  - `SerpAPI` 联网搜索引擎,类似google搜索(llm没有联网能力) (useful for when you need to search the internet)
  - `Calculator` 数学计算工具(llm本身不擅长精确计算) (useful for when you need to solve math problems)

## agent 常见模式

模式不是只选用一个
复杂任务往往是组合使用。
不同任务特点,选择不同的模式。

### Reflexion

执行-反思-优化，知错能改

### Plan-and-Solve
制定计划，分步执行，按部就班

### 路由 (调度)，多智能体是协作。
路由解决“谁来做”，多智能体解决“怎么一起做”。

### 多智能体 (协作)
路由解决“谁来做”，多智能体解决“怎么一起做”。

### 最基础的 openai-tools-agent

```
System

You are a helpful assistant
{chat_history}

User
{input}

{agent_scratchpad}
```

让llm自主决策 tool 调用的能力,prompt无需提供额外信息

### ReAct

ReAct是MRKL的升级版

```yaml
Answer the following questions as best you can. You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
Thought:{agent_scratchpad}
```