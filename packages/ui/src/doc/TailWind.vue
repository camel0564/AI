<script setup lang="ts"></script>

<template>
  <h1 class="text-2xl m-2">Tailwind 示例</h1>

  <pre>
    6大核心功能类: 布局-间距/尺寸-排版/背景-边框;

    1. preflight: reset.css 基本重置样式
    2. layout 布局工具: display / position / flex/grid等
    4. spacing 间距工具: margin,padding
    5. sizing 尺寸工具: width,height
    6. typography 排版工具: font-size,color,等;
    7. background 背景工具
    8. border 边框工具
    9. effect 效果工具: shadow,opacity,mask等
    10. filter 滤镜工具 filter:blur()等
    11. tables 表格工具
    12. transition animation 动画工具
    13. interactive 交互工具: cursor/scroll 等
  </pre>

  <pre class="bg-blue-50">
    1. 基本样式
    思维模式: 行内样式
    2. 6大功能划分:
      布局-间距: flex overflow-hidden / m-2 p-4 mb-2
      尺寸-排版: w-24 w-full / text-xl text-blue-500 text-gray-800
      背景-边框: / border border-gray-300 rounded-full
      效果-动画: shadow-md / transition-all
    3. 状态/ states / variants
      悬停: hover:text-purple-800
    4. 响应式: sm:flex-row sm:mb-2
    5. 暗色模式: dark:bg-gray-800 dark:text-white
    6. 使用任意值: (theme variables之外): bg-[#f00]
    7. tw原理: 扫描项目所有文件,找到并提取css类,解析编译后,输出到一个css文件中;
    7.1 多状态组合: `dark:lg:hover:bg-[#f00]` 暗色模型&大屏幕&鼠标悬停改变背景颜色;
    7.2 group-*: 父元素悬停改变子元素样式 group-hover:underline
    7.3 css关系选择器: class="[&>[data-active]+span]:text-blue-600" 子元素[data-active] 后的span元素
    7.4 完全兼容行内样式: 过于复杂的tw样式,可考虑用style=""替代

  </pre>

  <div class="dark:bg-gray-800 sm:flex-row flex flex-col items-center gap-5 m-2 p-4 max-w-96 bg-white shadow-md border border-gray-300 rounded-xl overflow-hidden">
    <img class="w-24 h-24 object-cover rounded-full" src="./avatar.png">
    <div class="group flex flex-col justify-between">
      <div class="sm:text-left sm:mb-2 text-center mb-4">
        <p class="dark:text-white text-xl group-hover:underline">银月</p>
        <p class="dark:text-gray-400 text-gray-700 group-hover:underline">灵界妖族第一大乘</p>
      </div>
      <button class="px-4 py-1 text-purple-500 hover:text-purple-800 transition-all border rounded-full cursor-pointer">传音符</button>
    </div>
  </div>
</template>
