import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

/** 注册 用户信息 resource */
export function registerUserProfileResource(server: McpServer) {
  server.registerResource(
    'user-profile',
    // 资源列表
    new ResourceTemplate('users://{userName}/profile', {
      // list：枚举所有用户资源
      list: async () => {
        const users = await fetchUserData();
        return {
          nextCursor: users ? 'next-page-cursor' : undefined, // 是否还有下一页
          resources: (users as User[]).map(user => ({
            uri: `users://${user.name}/profile`,
            name: `${user.name}的用户信息`
          }))
        }
      },
      // complete：补全 userName 变量
      complete: {
        userName: async (value) => {
          const users = await fetchUserData() as User[];
          const names = users.filter(user => user.name.includes(value))
          return names.map(n => n.name)
        }
      }
    }),
    {
      title: '用户信息',
      description: '用户个人信息',
      mimeType: 'application/json',
    },
    // 读取资源详情
    async (uri, { userName }) => {
      const user = await fetchUserData(userName);
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(user)
          }
        ]
      }
    }
  );
}

interface User {
  /** id */
  id: string;
  /** 用户名 */
  name: string;
  /** age */
  age?: number;
  /** 性别 */
  gender?: 'male' | 'female' | 'other';
  /** 爱好 */
  hobby?: string;
}

/**
 * 模拟获取用户数据的函数
 */
async function fetchUserData(userName?: string | string[]): Promise<User | User[] | undefined> {
  // 模拟数据库延迟
  await new Promise(resolve => setTimeout(resolve, 100));

  // 模拟用户数据库
  const userList: User[] = [
    { id: '101', name: 'zhangsan', age: 30, gender: 'male', hobby: '读书,篮球' },
    { id: '102', name: 'tom', age: 25, gender: 'male', hobby: '汽车,电子设备' },
    { id: '104', name: 'lisa', age: 35, gender: 'female', hobby: '旅行,美甲,美容' },
    { id: '103', name: 'alice', age: 28, gender: 'female', hobby: '音乐,电影,运动' },
  ];

  if (Array.isArray(userName)) {
    return userList.filter(user => userName.includes(user.name));
  } else if (userName) {
    return userList.find(user => user.name === userName);
  } else {
    return userList
  }
}