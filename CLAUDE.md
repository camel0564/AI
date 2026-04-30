# CLAUDE.md

本文档为 Claude Code（claude.ai/code）在本仓库中工作时提供指引。

## 项目语言规范

请严格遵守以下规则：
1. 所有对话、解释、建议必须使用**简体中文**。
2. 代码注释必须使用中文。
3. 生成的 Commit Message 必须使用中文。
4. 严禁出现大段未翻译的英文技术名词（保留专业术语如 API、SDK 除外）。


## 常用命令

- `pnpm` — 安装所有依赖
- `nr dev` — 启动所有包的开发模式（turbo）
- `nr build` — 构建所有包（`--filter=@ai/tools --filter=@ai/ui`）
- `nr test` — 运行所有测试（turbo）
- `nr type-check` — 类型检查所有包（turbo）
- `nr lint` — 代码检查所有包（turbo）
- 运行单个应用：`nr dev --filter=@ai/mcp-server`
- 运行单个测试：`npx vitest run path/to/test.test.ts`
- 启动 ChromaDB：`nr db`（在 apps/langchain 目录下）

## 项目架构

pnpm workspace + Turborepo v2 管理的 Monorepo：

### apps/

- **agent-server**（`@ai/agent-server`，端口 6120）— AI 智能体后端。集成 LLM（Ollama/OpenAI）、MCP 客户端连接和 RAG。通过 Express 提供 RESTful API。
- **chat**（`@ai/chat`，端口 6130）— Vue 3 聊天 UI，使用 Pinia 状态管理和 Vue Router。
- **langchain**（`@ai/langchain`，端口 8100）— LangChain.js 学习项目。使用类似 Jupyter 的"notebook"系统：`src/notebook/` 下的编号 TS 文件由 `autoload-note.ts` 自动加载执行（运行最新文件的最后一个方法）。涉及主题：RAG、记忆、函数调用、工具/智能体、路由。
- **mcp-server**（`@ai/mcp-server`，端口 3127）— MCP（Model Context Protocol）服务端。按 tools、resources、prompts 组织。HTTP 传输基于 Express + `StreamableHTTPServerTransport`。
- **mcp-client** — MCP 客户端（待完善占位）。

### packages/

- **tools**（`@ai/tools`）— 共享工具库：HTTP 客户端（`afetch`）、类型守卫、字符串/数字工具。
- **typescript-config**（`@ai/typescript-config`）— 共享 TS 配置（base + esbuild）。
- **ui**（`@ai/ui`）— Vue 3 UI 组件库（Tailwind CSS、Reka UI、Iconify）。

### 关键约定

- 所有包使用 ESM（`"type": "module"`），TypeScript strict 模式 + `nodenext` 模块解析。
- 依赖版本通过 pnpm catalogs 管理（dev/prod/test/types/vue/ui 分类）。
- 构建方式：库使用 `pkgroll --clean-dist`，前端使用 `vite build`。
- 测试：vitest，测试文件与源码同目录（`*.test.ts`）。
- 代码检查：`@antfu/eslint-config`，支持 Vue + TypeScript。

### LangChain notebook 约定

每个 `src/notebook/N.Name.ts` 文件默认导出一个类，类上定义静态 `cells` 属性（方法名数组）。自动加载器选择编号最大的文件，实例化类并执行其最后一个方法。以 `.ignore.ts` 结尾的文件会被排除。这种方式类似 Jupyter notebook cell，但以 TypeScript 文件形式组织。
