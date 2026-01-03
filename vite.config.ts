
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify("AIzaSyDsiZmigwNxdmb-6Yqpvi0ZHUv3gGYz12s"),
    'process.env.GEMINI_API_KEY': JSON.stringify("AIzaSyDsiZmigwNxdmb-6Yqpvi0ZHUv3gGYz12s")
  },
  resolve: {
    alias: {
      // FIX: Replaced `__dirname` with `'./'` to resolve from the current working directory,
      // which is the project root when running Vite. This fixes the "Cannot find name '__dirname'" error
      // that occurs in ESM-like environments where `__dirname` is not available.
      '@': path.resolve('./'),
    }
  }
});
