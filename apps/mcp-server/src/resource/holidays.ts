import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

const holidays = {
  year: 2025,
  holidays: [
    {
      name: '元旦',
      date: '2025-01-01',
      days: '1',
      desc: '元旦（1月1日，周三，放假1天，不调休）',
    },
    {
      name: '春节',
      date: '2025-01-28至2025-02-04',
      days: '8',
      desc: '春节（1月28日农历除夕至2月4日农历正月初七，放假调休共8天，1月26日周日、2月8日周六上班）',
    },
    {
      name: '清明节',
      date: '2025-04-04至2025-04-06',
      days: '3',
      desc: '清明节（4月4日周五至4月6日周日，放假共3天，不调休）',
    },
    {
      name: '劳动节',
      date: '2025-05-01至2025-05-05',
      days: '5',
      desc: '劳动节（5月1日周四至5月5日周一，放假调休共5天，4月27日周日上班）',
    },
    {
      name: '端午节',
      date: '2025-05-31至2025-06-02',
      days: '3',
      desc: '端午节（5月31日周六至6月2日周一，放假共3天，不调休）',
    },
    {
      name: '国庆节、中秋节',
      date: '2025-10-01至2025-10-08',
      days: '8',
      desc: '国庆节、中秋节（10月1日周三至10月8日周三，放假调休共8天，9月28日周日、10月11日周六上班）',
    },
  ],
  workDays: [
    {
      date: '2025-01-26',
      desc: '春节调休上班（周日，原休息日）',
    },
    {
      date: '2025-02-08',
      desc: '春节调休上班（周六，原休息日）',
    },
    {
      date: '2025-04-27',
      desc: '劳动节调休上班（周日，原休息日）',
    },
    {
      date: '2025-09-28',
      desc: '国庆节、中秋节调休上班（周日，原休息日）',
    },
    {
      date: '2025-10-11',
      desc: '国庆节、中秋节调休上班（周六，原休息日）',
    },
  ],
  updateDate: '2025-11-27',
  source: '国务院办公厅关于2025年部分节假日安排的通知',
}

/** 注册 法定节假日 resource 静态资源 */
export function registerHolidaysResource(server: McpServer) {
  server.registerResource(
    'holidays',
    'holidays://2025',
    {
      title: '2025年法定节假日',
      description: '2025年法定节假日和调休安排',
      mimeType: 'application/json',
    },
    async uri => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(holidays),
        },
      ],
    }),
  )
}
