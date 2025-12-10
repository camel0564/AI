/** MCP服务器配置 */
export interface McpConfig {
  mcpServers: {
    [serverName: string]: {
      command: string
      args: string[]
    }
  }
}

// /** 模型可调用 function 定义 */
// export interface FunctionCall {
//   /** function 名称 */
//   name: string
//   /** function 描述 */
//   description: string
//   /** function 参数jsonSchema定义 */
//   parameters: JsonObjSchema<any>
// }

// export type JsonSchemaEntry = Record<string, any>
// export interface JsonObjectSchema<Properties extends Record<string, JsonSchemaEntry>> {
//   type: 'object'
//   properties: Properties
//   required: (keyof Properties)[]
// }
// export type JsonObjSchema<Properties extends Record<string, JsonSchemaEntry>> = JsonObjectSchema<Properties>
