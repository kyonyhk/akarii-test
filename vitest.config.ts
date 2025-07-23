import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000, // 30 seconds for OpenAI API tests
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/convex': path.resolve(__dirname, './convex'),
      '@/types': path.resolve(__dirname, './types'),
    },
  },
})
