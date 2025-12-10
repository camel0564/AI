import type { McpServer, ToolCallback } from '@modelcontextprotocol/sdk/server/mcp'
import { z } from 'zod'

const servicesDB: HomeService[] = [
  { id: 'clean001', name: '日常保洁', type: 'cleaning', price: '50元/小时', duration: '2-4小时', description: '专业保洁团队，包含全屋清洁、厨房卫生间清洁', rating: 4.8, available: true },
  { id: 'clean002', name: '深度保洁', type: 'cleaning', price: '80元/小时', duration: '4-6小时', description: '全屋深度清洁，包含窗户、空调滤网等细节清洁', rating: 4.9, available: true },
  { id: 'clean003', name: '开荒保洁', type: 'cleaning', price: '120元/小时', duration: '6-8小时', description: '新房装修后首次清洁，包含建筑垃圾清理', rating: 4.7, available: true },
  { id: 'clean004', name: '厨房保洁', type: 'cleaning', price: '60元/小时', duration: '2-3小时', description: '厨房专项清洁，包含油烟机、灶台深度清洁', rating: 4.6, available: true },
  { id: 'clean005', name: '卫生间保洁', type: 'cleaning', price: '55元/小时', duration: '1-2小时', description: '卫生间专项清洁，包含马桶、淋浴间消毒', rating: 4.7, available: true },
  { id: 'nanny001', name: '育婴师', type: 'nanny', price: '6000元/月', duration: '长期', description: '专业育婴师，负责婴幼儿照料、辅食制作、早期教育', rating: 4.9, available: true },
  { id: 'nanny002', name: '白班保姆', type: 'nanny', price: '4500元/月', duration: '8小时/天', description: '负责日常家务、做饭、清洁等', rating: 4.7, available: true },
  { id: 'nanny003', name: '住家保姆', type: 'nanny', price: '8000元/月', duration: '24小时', description: '全天候住家服务，包含家务、照料老人孩子等', rating: 4.8, available: true },
  { id: 'nanny004', name: '钟点工', type: 'nanny', price: '40元/小时', duration: '2-4小时', description: '临时钟点工，适合短期家务协助', rating: 4.5, available: true },
  { id: 'nanny005', name: '月嫂', type: 'nanny', price: '12000元/月', duration: '26天', description: '专业月嫂，负责产妇和新生儿护理', rating: 4.9, available: true },
  { id: 'repair001', name: '水电维修', type: 'repair', price: '80元起', duration: '1-2小时', description: '水管漏水、电路故障等紧急维修', rating: 4.6, available: true },
  { id: 'repair002', name: '家电维修', type: 'repair', price: '60元起', duration: '1-3小时', description: '冰箱、洗衣机、空调等家电维修', rating: 4.7, available: true },
  { id: 'repair003', name: '管道疏通', type: 'repair', price: '100元起', duration: '1小时', description: '下水道、马桶管道疏通服务', rating: 4.5, available: true },
  { id: 'repair004', name: '门窗维修', type: 'repair', price: '120元起', duration: '2-3小时', description: '门窗锁具、滑轮等维修更换', rating: 4.6, available: true },
  { id: 'repair005', name: '家具维修', type: 'repair', price: '90元起', duration: '1-2小时', description: '桌椅、柜子等家具维修加固', rating: 4.4, available: true },
  { id: 'beauty001', name: '上门美甲', type: 'beauty', price: '88元起', duration: '1-2小时', description: '专业美甲师上门服务，包含手部护理', rating: 4.8, available: true },
  { id: 'beauty002', name: '美容护肤', type: 'beauty', price: '198元起', duration: '2-3小时', description: '专业美容师上门，包含面部清洁、护理等', rating: 4.7, available: true },
  { id: 'beauty003', name: '美睫服务', type: 'beauty', price: '158元起', duration: '1.5小时', description: '专业美睫师上门嫁接睫毛', rating: 4.8, available: true },
  { id: 'beauty004', name: '化妆造型', type: 'beauty', price: '288元起', duration: '2小时', description: '专业化妆师上门化妆造型服务', rating: 4.9, available: true },
  { id: 'beauty005', name: '头皮护理', type: 'beauty', price: '168元起', duration: '1.5小时', description: '专业头皮清洁和护理服务', rating: 4.6, available: true },
]
const homeServiceItem = z.object({
  id: z.string().describe('服务ID'),
  name: z.string().describe('服务名称'),
  type: z.string().describe('服务类型'),
  price: z.string().describe('价格'),
  duration: z.string().describe('服务时长'),
  description: z.string().describe('服务描述'),
  rating: z.number().min(0).max(5).describe('评分'),
  available: z.boolean().describe('是否可预约'),
})

/** 家庭服务输出 */
const homeServicesListOut = z.object({
  services: z.array(homeServiceItem).describe('服务列表'),
})
type HomeService = z.infer<typeof homeServiceItem>

/** 家庭服务列表 tool */
const homeServicesListTool: ToolCallback = async () => {
  const services = await getHomeServicesList()
  const output = { services }
  return {
    structuredContent: output,
    content: [{ type: 'text', text: JSON.stringify(output) }],
  }
}
const servicesNames = servicesDB.map(n => n.name)

/** 家庭服务详情 */
const homeServiceInputSchema = z.object({
  serviceName: z.enum(servicesNames).describe('服务名称,例如: 日常保洁, 水电维修, 上门美甲'),
})
type HomeServiceInput = z.infer<typeof homeServiceInputSchema>

/** 家庭服务详情 tool */
const homeServiceTool: ToolCallback<typeof homeServiceInputSchema> = async (input) => {
  const output = await getHomeServiceApi(input)
  return {
    structuredContent: output,
    content: [{ type: 'text', text: JSON.stringify(output) }],
  }
}

/** 注册家庭服务 tool */
export function registerHomeServiceTool(server: McpServer) {
  // 服务列表
  server.registerTool(
    'fetch-home-services-list',
    {
      title: '所有家庭服务列表',
      description: '查询所有家庭服务列表',
      inputSchema: undefined,
      outputSchema: homeServicesListOut,
    },
    homeServicesListTool,
  )

  // 服务详情
  server.registerTool(
    'fetch-home-service',
    {
      title: '查询家庭服务详情',
      description: '根据服务名称查询家庭服务详情',
      inputSchema: homeServiceInputSchema,
      outputSchema: homeServiceItem,
    },
    homeServiceTool,
  )
}

/** 模拟获取家庭服务列表API */
async function getHomeServicesList(): Promise<HomeService[]> {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 200))
  return servicesDB
}

/** 模拟获取家庭服务详情API */
async function getHomeServiceApi(input: HomeServiceInput): Promise<HomeService | undefined> {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 200))
  return servicesDB.find(item => item.name === input.serviceName)
}

/** 模拟获取家庭服务详情API */
export async function getHomeServiceByIdApi(id: string): Promise<HomeService | undefined> {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 200))
  return servicesDB.find(item => item.id === id)
}
