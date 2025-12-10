import type { McpServer, ToolCallback } from '@modelcontextprotocol/sdk/server/mcp'
import { z } from 'zod'
import { getHomeServiceByIdApi } from './home-service'

// 订单状态枚举
enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_SERVICE = 'in_service',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// 模拟订单数据库
interface Order {
  id: string
  serviceId: string
  serviceName: string
  customerName: string
  customerPhone: string
  address: string
  appointmentTime: string
  notes: string
  price: string
  status: OrderStatus
  createdAt: string
}

// 将原来的空数组定义修改为包含一条模拟数据的数组
const ordersDB: Order[] = [
  {
    id: 'order_007',
    serviceId: 'clean001',
    serviceName: '日常保洁',
    customerName: '张三',
    customerPhone: '13812345678',
    address: '北京市朝阳区建国路88号',
    appointmentTime: '2024-12-05 14:00',
    notes: '家里有宠物，请注意关门',
    price: '50元/小时',
    status: OrderStatus.CONFIRMED,
    createdAt: '2024-12-04T10:30:00.000Z',
  },
]

/** 下单输入schema */
const placeOrderInputSchema = z.object({
  serviceId: z.string().describe('服务ID'),
  notes: z.string().optional().describe('备注信息'),
})

type PlaceOrderInput = z.infer<typeof placeOrderInputSchema>

/** 下单输出schema */
const placeOrderOutputSchema = z.object({
  orderId: z.string().describe('订单ID'),
  serviceName: z.string().describe('服务名称'),
  customerName: z.string().describe('客户姓名'),
  appointmentTime: z.string().describe('预约时间'),
  price: z.string().describe('服务价格'),
  status: z.string().describe('订单状态'),
  createdAt: z.string().describe('创建时间'),
  message: z.string().describe('下单成功提示信息'),
})

/** 查询订单输入schema */
const getOrderInputSchema = z.object({
  orderId: z.string().describe('订单ID'),
})

// type GetOrderInput = z.infer<typeof getOrderInputSchema>

/** 查询订单输出schema */
const getOrderOutputSchema = z.object({
  id: z.string().describe('订单ID'),
  serviceId: z.string().describe('服务ID'),
  serviceName: z.string().describe('服务名称'),
  customerName: z.string().describe('客户姓名'),
  customerPhone: z.string().describe('客户电话'),
  address: z.string().describe('服务地址'),
  appointmentTime: z.string().describe('预约时间'),
  notes: z.string().optional().describe('备注信息'),
  price: z.string().describe('服务价格'),
  status: z.string().describe('订单状态'),
  createdAt: z.string().describe('创建时间'),
})

/** 家庭服务下单工具 */
const placeOrderTool: ToolCallback<typeof placeOrderInputSchema> = async (input) => {
  const order = await placeHomeServiceOrder(input)
  return {
    structuredContent: order,
    content: [{ type: 'text', text: JSON.stringify(order) }],
  }
}

/** 查询订单工具 */
const getOrderTool: ToolCallback<typeof getOrderInputSchema> = async (input) => {
  const order = await getOrderById(input.orderId)
  return {
    structuredContent: order,
    content: [{ type: 'text', text: JSON.stringify(order) }],
  }
}

/** 注册订单相关工具 */
export function registerOrderTool(server: McpServer) {
  // 下单工具
  server.registerTool(
    'place-home-service-order',
    {
      title: '家庭服务下单',
      description: '创建家庭服务订单，包括清洁、保姆、维修等服务',
      inputSchema: placeOrderInputSchema,
      outputSchema: placeOrderOutputSchema,
    },
    placeOrderTool,
  )

  // 查询订单工具
  server.registerTool(
    'get-home-service-order',
    {
      title: '查询家庭服务订单',
      description: '根据订单ID查询家庭服务订单详情',
      inputSchema: getOrderInputSchema,
      outputSchema: getOrderOutputSchema,
    },
    getOrderTool,
  )
}

/** 模拟下单API */
async function placeHomeServiceOrder(input: PlaceOrderInput): Promise<z.infer<typeof placeOrderOutputSchema>> {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 300))
  const service = await getHomeServiceByIdApi(input.serviceId)
  if (!service) {
    throw new Error(`服务ID ${input.serviceId} 不存在`)
  }

  const newOrder: Order = {
    id: 'order_007',
    serviceId: input.serviceId,
    serviceName: service.name,
    customerName: '测试用户',
    customerPhone: '测试用户电话',
    address: '测试用户地址',
    appointmentTime: '测试预约时间',
    notes: input.notes || '',
    price: service.price,
    status: OrderStatus.PENDING,
    createdAt: new Date().toISOString(),
  }
  console.log('🚀 下单成功 newOrder:', newOrder)

  // 保存订单到模拟数据库
  ordersDB.push(newOrder)

  return {
    orderId: newOrder.id,
    serviceName: newOrder.serviceName,
    customerName: newOrder.customerName,
    appointmentTime: newOrder.appointmentTime,
    price: newOrder.price,
    status: newOrder.status,
    createdAt: newOrder.createdAt,
    message: `订单创建成功！服务人员将在30分钟内与您联系确认。`,
  }
}

/** 模拟查询订单API */
async function getOrderById(orderId: string): Promise<z.infer<typeof getOrderOutputSchema>> {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 200))

  const order = ordersDB.find(o => o.id === orderId)

  if (!order) {
    throw new Error(`订单ID ${orderId} 不存在`)
  }

  return {
    id: order.id,
    serviceId: order.serviceId,
    serviceName: order.serviceName,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    address: order.address,
    appointmentTime: order.appointmentTime,
    notes: order.notes,
    price: order.price,
    status: order.status,
    createdAt: order.createdAt,
  }
}
