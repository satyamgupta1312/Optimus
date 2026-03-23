import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const PROD_URL = env.VITE_API_BASE_URL_PROD || 'https://samaan.apnamart.in';
  const UAT_URL = env.VITE_API_BASE_URL_UAT || 'https://smapi-cu.apnamart.in';

  console.log(`[vite.config] Dual proxy → UAT: ${UAT_URL} | PROD: ${PROD_URL}`);

  /**
   * Rewrite Set-Cookie headers so they work on localhost:
   *  - Strip Secure (we're on HTTP)
   *  - Change SameSite=None → SameSite=Lax (None requires Secure)
   *  - Remove Domain (let browser default to localhost)
   */
  function fixCookies(proxyRes) {
    const cookies = proxyRes.headers['set-cookie'];
    if (cookies) {
      proxyRes.headers['set-cookie'] = cookies.map(c =>
        c
          .replace(/;\s*secure/gi, '')
          .replace(/;\s*samesite=none/gi, '; SameSite=Lax')
          .replace(/;\s*domain=[^;]*/gi, '')
      );
    }
  }

  /**
   * Create proxy config for an environment prefix.
   * e.g. envProxy('uat', UAT_URL) → /uat/api, /uat/login, /uat/logout, /uat/static
   * Rewrites strip the /uat prefix before forwarding.
   */
  function envProxy(prefix, target) {
    const rewrite = (path) => path.replace(new RegExp(`^/${prefix}`), '');

    const withCookies = (refererPath = '/') => ({
      target,
      changeOrigin: true,
      secure: false,
      rewrite,
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq, req) => {
          proxyReq.setHeader('Origin', target);
          proxyReq.setHeader('Referer', `${target}${refererPath}`);
          // Debug: log outgoing requests to backend
          console.log(`[proxy] ${req.method} ${req.url} → ${target}${rewrite(req.url)}`);
          console.log(`[proxy]   Cookie: ${proxyReq.getHeader('cookie')?.substring(0, 100) || '(none)'}...`);
          console.log(`[proxy]   X-CSRFToken: ${proxyReq.getHeader('x-csrftoken') || '(none)'}`);
          console.log(`[proxy]   Content-Type: ${proxyReq.getHeader('content-type')?.substring(0, 80) || '(none)'}`);
        });
        proxy.on('proxyRes', (proxyRes, req) => {
          fixCookies(proxyRes);
          // Debug: log response status
          if (proxyRes.statusCode >= 400) {
            console.log(`[proxy] ← ${proxyRes.statusCode} for ${req.method} ${req.url}`);
          }
        });
      },
    });

    return {
      [`/${prefix}/api`]: withCookies('/'),
      [`/${prefix}/login`]: withCookies('/login/'),
      [`/${prefix}/logout`]: withCookies('/'),
      [`/${prefix}/static`]: { target, changeOrigin: true, secure: false, rewrite },
    };
  }

  return {
    plugins: [react()],
    envDir: './',
    envPrefix: 'VITE_',
    server: {
      host: true,   // 👈 दूसरे devices से access के लिए
      port: 8888,
      proxy: {
        // Local Express API (unchanged)
        '/api/local': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        // UAT env-prefixed routes
        ...envProxy('uat', UAT_URL),
        // PROD env-prefixed routes
        ...envProxy('prod', PROD_URL),
      }
    },
    preview: {
      port: 8888
    }
  }
})
