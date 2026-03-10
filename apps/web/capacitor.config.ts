import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.openclaw.app',
  appName: 'OpenClaw',
  webDir: 'dist',
  // 开发时启用实时刷新（连接本地服务器）
  // 生产环境注释掉此行，使用本地构建产物
  // server: {
  //   url: 'http://localhost:3000',
  //   cleartext: true,
  // },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
    },
  },
};

export default config;
