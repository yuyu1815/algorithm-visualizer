import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const srcPath = resolve(import.meta.dirname, 'src');
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080';

const srcAlias = name => resolve(srcPath, name);

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'classic',
    }),
  ],
  define: {
    'process.cwd': '() => "/"',
  },
  resolve: {
    alias: {
      apis: srcAlias('apis'),
      common: srcAlias('common'),
      components: srcAlias('components'),
      core: srcAlias('core'),
      files: srcAlias('files'),
      i18n: srcAlias('i18n'),
      path: 'path-browserify',
      reducers: srcAlias('reducers'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [srcPath],
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
