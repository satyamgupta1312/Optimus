import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8888,
    proxy: {
      // Proxy Google Apps Script API (MUST be before /api to match first)
      '/api/google-sheet': {
        target: 'https://script.google.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/google-sheet/, '/macros/s/AKfycbwGI4r4nDqo5iKIYubUGpAUTaDN-Z1Su_fsD8EmQ7bxIP3XB0HmEdfXFG89hk0uMVZfBQ/exec')
      },
      // Proxy API requests
      '/api': {
        target: 'https://samaan.apnamart.in',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost',
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            proxyReq.setHeader('Origin', 'https://samaan.apnamart.in');
            proxyReq.setHeader('Referer', 'https://samaan.apnamart.in/');
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const cookies = proxyRes.headers['set-cookie'];
            if (cookies) {
              proxyRes.headers['set-cookie'] = cookies.map(cookie =>
                cookie.replace(/; secure/gi, '')
              );
            }
          });
        }
      },
      // Proxy Login
      '/login': {
        target: 'https://samaan.apnamart.in',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost',
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            proxyReq.setHeader('Origin', 'https://samaan.apnamart.in');
            proxyReq.setHeader('Referer', 'https://samaan.apnamart.in/login/');
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const cookies = proxyRes.headers['set-cookie'];
            if (cookies) {
              proxyRes.headers['set-cookie'] = cookies.map(cookie =>
                cookie.replace(/; secure/gi, '')
              );
            }
          });
        }
      },
      // Proxy Logout
      '/logout': {
        target: 'https://samaan.apnamart.in',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost',
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            proxyReq.setHeader('Origin', 'https://samaan.apnamart.in');
            proxyReq.setHeader('Referer', 'https://samaan.apnamart.in/');
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const cookies = proxyRes.headers['set-cookie'];
            if (cookies) {
              proxyRes.headers['set-cookie'] = cookies.map(cookie =>
                cookie.replace(/; secure/gi, '')
              );
            }
          });
        }
      },
      // Proxy static files for login page
      '/static': {
        target: 'https://samaan.apnamart.in',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
