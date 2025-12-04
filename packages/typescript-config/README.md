# typescript-config

ts 配置文件

- `base.json` 最简单的基本ts配置,不同app尽量使用,使其保持一致

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
}
```