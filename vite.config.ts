import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const cloudbaseHttpOrigin = env.VITE_CLOUDBASE_HTTP_ORIGIN
    || 'http://cloud1-1g7yz5w766dd366f-1394837822.ap-shanghai.app.tcloudbase.com';
  const cloudbaseHttpPrefix = (env.VITE_CLOUDBASE_HTTP_PREFIX || '').replace(/^\/+|\/+$/g, '');
  const cloudbasePathBase = cloudbaseHttpPrefix ? `/${cloudbaseHttpPrefix}` : '';
  return {
    base: './',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api/invoke': {
          target: cloudbaseHttpOrigin,
          changeOrigin: true,
          secure: true,
          rewrite: (pathValue: string): string => {
            const functionPath = pathValue.replace(/^\/api\/invoke/, '');
            return `${cloudbasePathBase}${functionPath}`;
          },
        },
      },
    },
  };
});
