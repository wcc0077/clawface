import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '127.0.0.1',
  },
  // Capacitor 需要 base 路径为相对路径
  base: './',
  build: {
    // 启用内联资源
    assetsInlineLimit: 4096,
  },
});
