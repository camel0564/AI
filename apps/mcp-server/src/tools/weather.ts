import type { McpServer, ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

/** 天气查询 input */
const weatherInputSchema = z.object({
  latitude: z.number().min(-90).max(90).describe('地点纬度'),
  longitude: z.number().min(-180).max(180).describe('地点经度'),
})
type WeatherInput = z.infer<typeof weatherInputSchema>

/** 天气查询 output */
const weatherOutputSchema = z.object({
  weather: z.string().describe('天气'),
  temperature: z.string().describe('温度'),
  rain: z.string().describe('降雨量(毫米)'),
})
type WeatherOutput = z.infer<typeof weatherOutputSchema>

/** 天气查询 tool */
const weatherTool: ToolCallback<typeof weatherInputSchema> = async (input) => {
  const data = await getWeatherApi(input)
  const output = formatWeachter(data)
  return {
    structuredContent: output,
    content: [{ type: 'text', text: JSON.stringify(output) }], // 向后兼容text
  }
}

/** 注册 天气查询 tool */
export function registerWeatherTool(server: McpServer) {
  server.registerTool(
    'fetch-weather',
    {
      title: '天气查询',
      description: '获取某个地理坐标(经纬度)的天气信息',
      inputSchema: weatherInputSchema,
      outputSchema: weatherOutputSchema,
    },
    weatherTool,
  )
}

/** 天气数据单位定义接口 */
interface CurrentUnits {
  /** 时间格式单位（示例：iso8601） */
  time: string
  /** 时间间隔单位（示例：seconds） */
  interval: string
  /** 2米高度温度单位（示例：°C） */
  temperature_2m: string
  /** 天气代码单位（示例：wmo code） */
  weather_code: string
  /** 降雨量单位（示例：mm） */
  rain: string
}

/** 当前天气数据接口 */
interface Current {
  /** 当前时间（ISO8601格式，示例：2025-11-27T10:15） */
  time: string
  /** 数据采集时间间隔（秒，示例：900） */
  interval: number
  /** 2米高度的温度值 */
  temperature_2m: number
  /** 天气代码（WMO code 0-99） */
  weather_code: number
  /** 降雨量（毫米） */
  rain: number
}

/** 天气数据根接口 */
export interface WeatherOrigin {
  /** 纬度（示例：31.25） */
  latitude: number
  /** 经度（示例：121.5） */
  longitude: number
  /** 数据生成耗时（毫秒） */
  generationtime_ms: number
  /** UTC时区偏移秒数（示例：28800 对应GMT+8） */
  utc_offset_seconds: number
  /** 时区（示例：Asia/Shanghai） */
  timezone: string
  /** 时区缩写（示例：GMT+8） */
  timezone_abbreviation: string
  /** 海拔高度（米，示例：10） */
  elevation: number
  /** 当前天气数据的单位定义 */
  current_units: CurrentUnits
  /** 当前天气核心数据 */
  current: Current
}

interface WMOCodeType {
  [key: number]: {
    title: string
    desc: string
  }
}

/**
 * 世界气象组织 标准天气代码
 * https://www.nodc.noaa.gov/archive/arc0021/0002199/1.1/data/0-data/HTML/WMO-CODE/WMO4677.HTM
 */
const WMOCode: WMOCodeType = {
  0: { title: '晴', desc: '未观测到云发展或无法观测，无降水' },
  1: { title: '少云', desc: '云通常消散或发展减弱，无降水' },
  2: { title: '多云', desc: '天空状态基本不变，无降水' },
  3: { title: '多云', desc: '云通常形成或发展，无降水' },
  4: { title: '阴', desc: '能见度因烟雾、火山灰等降低，天空阴沉' },
  5: { title: '阴', desc: '霾天气，天空阴沉，能见度降低' },
  6: { title: '阴', desc: '悬浮尘埃导致天空阴沉，无降水' },
  7: { title: '阴', desc: '风扬尘土/沙尘，天空阴沉' },
  8: { title: '阴', desc: '尘旋风/沙旋风出现，天空阴沉' },
  9: { title: '阴', desc: '沙尘暴/沙暴天气，天空昏暗' },
  10: { title: '雾', desc: '薄雾天气，能见度降低' },
  11: { title: '雾', desc: '零星浅雾（陆地<2米、海上<10米）' },
  12: { title: '雾', desc: '持续浅雾（陆地<2米、海上<10米）' },
  13: { title: '雷雨', desc: '可见闪电但无雷声' },
  14: { title: '小雨', desc: '可见降水但未抵达地面/海面' },
  15: { title: '小雨', desc: '远处（>5km）降水抵达地面/海面' },
  16: { title: '小雨', desc: '近处（<5km）降水抵达地面/海面（不在站点）' },
  17: { title: '雷雨', desc: '雷雨天气，无降水' },
  18: { title: '强阵雨', desc: '飑天气伴随短时强降水' },
  19: { title: '雷雨', desc: '漏斗云（龙卷风/水龙卷）伴随雷雨' },
  20: { title: '毛毛雨', desc: '非冻结毛毛雨（非阵性）或雪粒（非阵性）' },
  21: { title: '小雨', desc: '过去1小时有非冻结雨' },
  22: { title: '小雪', desc: '过去1小时有雪' },
  23: { title: '小雪', desc: '雨夹雪或冰粒天气' },
  24: { title: '冻雨', desc: '过去1小时有冻毛毛雨或冻雨' },
  25: { title: '阵雨', desc: '过去1小时有雨阵雨' },
  26: { title: '阵雪', desc: '过去1小时有雪阵雨或雨夹雪阵雨' },
  27: { title: '雷雨伴有冰雹', desc: '过去1小时有冰雹阵雨或雨夹冰雹阵雨' },
  28: { title: '冻雾', desc: '过去1小时有雾或冻雾' },
  29: { title: '雷雨', desc: '过去1小时有雷雨（有或无降水）' },
  30: { title: '阴', desc: '轻雾伴随沙尘，天空阴沉' },
  31: { title: '阴', desc: '中雾伴随沙尘，天空阴沉' },
  32: { title: '阴', desc: '浓雾伴随沙尘，天空阴沉' },
  33: { title: '阴', desc: '轻吹雪，天空阴沉' },
  34: { title: '阴', desc: '中吹雪，天空阴沉' },
  35: { title: '阴', desc: '强吹雪，天空阴沉' },
  36: { title: '阴', desc: '低吹雪，天空阴沉' },
  37: { title: '阴', desc: '中低吹雪，天空阴沉' },
  38: { title: '阴', desc: '强低吹雪，天空阴沉' },
  39: { title: '阴', desc: '极高浓度沙尘，天空昏暗' },
  40: { title: '雾', desc: '远处有雾/冻雾（本站过去1小时无）' },
  41: { title: '雾', desc: '零星雾/冻雾' },
  42: { title: '雾', desc: '雾/冻雾（天空可见，过去1小时变薄）' },
  43: { title: '雾', desc: '雾/冻雾（天空不可见，过去1小时变薄）' },
  44: { title: '雾', desc: '雾/冻雾（天空可见，无变化）' },
  45: { title: '雾', desc: '雾/冻雾（天空不可见，无变化）' },
  46: { title: '雾', desc: '雾/冻雾（天空可见，开始或变厚）' },
  47: { title: '雾', desc: '雾/冻雾（天空不可见，开始或变厚）' },
  48: { title: '雾', desc: '凝霜雾（天空可见）' },
  49: { title: '雾', desc: '凝霜雾（天空不可见）' },
  50: { title: '毛毛雨', desc: '非冻结毛毛雨（间歇性，轻微）' },
  51: { title: '毛毛雨', desc: '非冻结毛毛雨（持续性，轻微）' },
  52: { title: '毛毛雨', desc: '非冻结毛毛雨（间歇性，中等）' },
  53: { title: '毛毛雨', desc: '非冻结毛毛雨（持续性，中等）' },
  54: { title: '毛毛雨', desc: '非冻结毛毛雨（间歇性，强）' },
  55: { title: '毛毛雨', desc: '非冻结毛毛雨（持续性，强）' },
  56: { title: '冻毛毛雨', desc: '冻结毛毛雨（轻微）' },
  57: { title: '冻毛毛雨', desc: '冻结毛毛雨（中等或强）' },
  58: { title: '毛毛雨', desc: '毛毛雨夹雨（轻微）' },
  59: { title: '毛毛雨', desc: '毛毛雨夹雨（中等或强）' },
  60: { title: '小雨', desc: '非冻结雨（间歇性，轻微）' },
  61: { title: '小雨', desc: '非冻结雨（持续性，轻微）' },
  62: { title: '中雨', desc: '非冻结雨（间歇性，中等）' },
  63: { title: '中雨', desc: '非冻结雨（持续性，中等）' },
  64: { title: '大雨', desc: '非冻结雨（间歇性，强）' },
  65: { title: '大雨', desc: '非冻结雨（持续性，强）' },
  66: { title: '冻雨', desc: '冻结雨（轻微）' },
  67: { title: '冻雨', desc: '冻结雨（中等或强）' },
  68: { title: '小雪', desc: '雨/毛毛雨夹雪（轻微）' },
  69: { title: '中雪', desc: '雨/毛毛雨夹雪（中等或强）' },
  70: { title: '小雪', desc: '雪花（间歇性，轻微）' },
  71: { title: '小雪', desc: '雪花（持续性，轻微）' },
  72: { title: '中雪', desc: '雪花（间歇性，中等）' },
  73: { title: '中雪', desc: '雪花（持续性，中等）' },
  74: { title: '大雪', desc: '雪花（间歇性，强）' },
  75: { title: '大雪', desc: '雪花（持续性，强）' },
  76: { title: '雪粒', desc: '钻石尘（有或无雾）' },
  77: { title: '雪粒', desc: '雪粒（有或无雾）' },
  78: { title: '雪粒', desc: '星状雪晶（有或无雾）' },
  79: { title: '雪粒', desc: '冰粒（有或无雾）' },
  80: { title: '小阵雨', desc: '雨阵雨（轻微）' },
  81: { title: '阵雨', desc: '雨阵雨（中等或强）' },
  82: { title: '强阵雨', desc: '雨阵雨（猛烈）' },
  83: { title: '小阵雨', desc: '雨夹雪阵雨（轻微）' },
  84: { title: '阵雨', desc: '雨夹雪阵雨（中等或强）' },
  85: { title: '小阵雪', desc: '雪阵雨（轻微）' },
  86: { title: '阵雪', desc: '雪阵雨（中等或强）' },
  87: { title: '雪粒', desc: '雪粒/小冰雹阵雨（轻微，有或无雨/雨夹雪）' },
  88: { title: '雪粒', desc: '雪粒/小冰雹阵雨（中等或强，有或无雨/雨夹雪）' },
  89: { title: '雷雨伴有冰雹', desc: '冰雹阵雨（无雷，轻微）' },
  90: { title: '雷雨伴有冰雹', desc: '冰雹阵雨（无雷，中等或强）' },
  91: { title: '小雨', desc: '轻微雨（过去1小时有雷雨，当前无）' },
  92: { title: '中雨', desc: '中等/强雨（过去1小时有雷雨，当前无）' },
  93: { title: '小雪', desc: '轻微雪/雨夹雪（过去1小时有雷雨，当前无）' },
  94: { title: '中雪', desc: '中等/强雪/雨夹雪（过去1小时有雷雨，当前无）' },
  95: { title: '雷雨', desc: '轻微/中等雷雨（无冰雹，有雨/雪）' },
  96: { title: '雷雨伴有冰雹', desc: '轻微/中等雷雨（有冰雹）' },
  97: { title: '雷雨', desc: '强雷雨（无冰雹，有雨/雪）' },
  98: { title: '雷雨伴有沙尘暴', desc: '雷雨伴有沙尘暴天气' },
  99: { title: '雷雨伴有冰雹', desc: '强雷雨（有冰雹）' },
}

/** 天气API查询参数 */
interface WeatherArgs extends WeatherInput {
  /** 时区 @default 'Asia/Shanghai' */
  timezone?: string
  /** 当前天气参数 @default 'temperature_2m,weather_code,rain' */
  current?: string
}

/**
 * 获取天气
 * https://api.open-meteo.com/v1/forecast?latitude=31.249&longitude=121.455&timezone=Asia/Shanghai&current=temperature_2m,weather_code,rain
 */
export async function getWeatherApi(args: WeatherArgs): Promise<WeatherOrigin> {
  args.timezone = args.timezone || 'Asia/Shanghai'
  args.current = args.current || 'temperature_2m,weather_code,rain'

  const querys = new URLSearchParams(args as unknown as Record<string, string>)
  const url = `https://api.open-meteo.com/v1/forecast?${querys.toString()}`
  console.log('🚀 getWeatherApi->url:', url)
  const response = await fetch(url)
  const data = await response.json() as WeatherOrigin
  return data
}

/**
 * 格式化原始天气数据
 */
export function formatWeachter(data: WeatherOrigin): WeatherOutput {
  const { current, current_units } = data
  return {
    temperature: current.temperature_2m ? current.temperature_2m + current_units.temperature_2m : '',
    weather: WMOCode[current.weather_code]?.title,
    rain: current.rain ? current.rain + current_units.rain : '',
  }
}
