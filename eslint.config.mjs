// eslint.config.mjs
import eslintConfig from '@antfu/eslint-config'

export default eslintConfig(
  // 第一个参数为全局配置,必须保留
  {
    vue: true,
    typescript: true,
    stylistic: {
      indent: 2,
    },
    ignores: [
      '**/*.Iconify.json',
      '**/*.md',
    ],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
  // vue 文件配置覆盖
  {
    name: 'vue-覆盖',
    files: ['**/*.vue'],
    rules: {
      'vue/valid-define-options': 'off', // 关闭 defineOptions 格式校验
      'vue/define-macros-order': 'off',
      'vue/singleline-html-element-content-newline': 'off', // 允许单行元素内容不换行
    },
  },
  // typescript 文件配置覆盖
  {
    name: 'ts-覆盖',
    files: ['**/*.ts'],
    rules: {
      // 使用_开头的变量, 表示忽略未使用的变量
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['pnpm-workspace.yaml'],
    rules: {
      'yaml/sort-keys': 'off',
      'pnpm/yaml-enforce-settings': ['warn', {
        settings: {
          catalogMode: 'prefer',
          cleanupUnusedCatalogs: true,
          shellEmulator: true,
          trustPolicy: undefined,
        },
      }],
    },
  },
)
