import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load url.env (envDir: root of project, envFiles: url.env)
  const env = loadEnv(mode, process.cwd(), '');

  const VITE_ENV = env.VITE_ENV || 'PROD';
  const PROD_URL = env.VITE_API_BASE_URL_PROD || 'https://samaan.apnamart.in';
  const UAT_URL = env.VITE_API_BASE_URL_UAT || 'https://uat.samaan.apnamart.in';

  // Active backend target (switch by changing VITE_ENV in url.env)
  const BACKEND_TARGET = VITE_ENV === 'UAT' ? UAT_URL : PROD_URL;

  console.log(`[vite.config] Proxy target → ${VITE_ENV}: ${BACKEND_TARGET}`);

  return {
    plugins: [react()],
    envDir: './',           // Load from url.env in project root
    envPrefix: 'VITE_',
    server: {
      port: 8888,
      proxy: {
        // Proxy local Express API (MUST be before /api to match first)
        '/api/local': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        // Proxy Google Apps Script API (MUST be before /api to match first)
        '/api/google-sheet': {
          target: 'https://script.google.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/google-sheet/, '/macros/s/AKfycbwGI4r4nDqo5iKIYubUGpAUTaDN-Z1Su_fsD8EmQ7bxIP3XB0HmEdfXFG89hk0uMVZfBQ/exec')
        },
        // Proxy API requests → switches between UAT and PROD via VITE_ENV
        '/api': {
          target: BACKEND_TARGET,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: 'localhost',
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              proxyReq.setHeader('Origin', BACKEND_TARGET);
              proxyReq.setHeader('Referer', `${BACKEND_TARGET}/`);
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
          target: BACKEND_TARGET,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: 'localhost',
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              proxyReq.setHeader('Origin', BACKEND_TARGET);
              proxyReq.setHeader('Referer', `${BACKEND_TARGET}/login/`);
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
          target: BACKEND_TARGET,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: 'localhost',
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              proxyReq.setHeader('Origin', BACKEND_TARGET);
              proxyReq.setHeader('Referer', `${BACKEND_TARGET}/`);
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
        // Proxy static files
        '/static': {
          target: BACKEND_TARGET,
          changeOrigin: true,
          secure: false
        }
      }
    },
    preview: {
      port: 8888
    }
  }
})

