import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const RESEND_KEY = env.RESEND_API_KEY || env.VITE_RESEND_API_KEY || ''
  const OPENROUTER_KEY = env.OPENROUTER_API_KEY || env.VITE_OPENROUTER_API_KEY || ''
  const GEMINI_KEY = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api/resend': {
          target: 'https://api.resend.com',
          changeOrigin: true,
          secure: true,
          rewrite: () => '/emails',
          headers: {
            Authorization: `Bearer ${RESEND_KEY}`,
          },
        },
        '/api/openrouter': {
          target: 'https://openrouter.ai',
          changeOrigin: true,
          secure: true,
          rewrite: () => '/api/v1/chat/completions',
          headers: {
            Authorization: `Bearer ${OPENROUTER_KEY}`,
            'HTTP-Referer': 'http://localhost:5173',
            'X-Title': 'Barangay 178 Emergency Portal',
          },
        },
        '/api/gemini': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          secure: true,
          rewrite: () => `/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
        },
      },
    },
  }
})
