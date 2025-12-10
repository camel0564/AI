# 后端项目tsconfig基本配置

后端项目 ts 配置文件

- `tsconfig.base.json` 最简单的基本后端项目ts配置,不同app尽量使用,使其保持一致
- 使用 `tsc --showConfig` 查看当前项目的 ts 配置是否正确

## 使用方法

1. package.json
```json
  "devDependencies": {
    "@ai/typescript-config": "workspace:*",
  }
```

2. tsconfig.json
```json
{
  "extends": "@ai/typescript-config/tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "rootDir": "src",
    "paths": {
      "@/*": ["./src/*"]
    },
    "outDir": "dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "src/**/*.test.ts"]
}
```