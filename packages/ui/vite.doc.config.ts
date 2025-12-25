import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
/**
 * ui文档
 * https://vite.dev/config/
 */
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
})
