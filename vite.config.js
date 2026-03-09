import { defineConfig } from 'vite';
import { resolve } from 'path';

// MPA 클린 URL 리라이트 플러그인 (serve.json 대체)
function mpaRewritePlugin() {
  const rewrites = {
    '/': '/user_login.html',
    '/main': '/post_list.html',
    '/login': '/user_login.html',
    '/signup': '/user_signup.html',
    '/password': '/user_password.html',
    '/detail': '/post_detail.html',
    '/write': '/post_write.html',
    '/edit': '/post_edit.html',
    '/edit-profile': '/user_edit.html',
    '/find-account': '/user_find_account.html',
    '/notifications': '/notifications.html',
    '/my-activity': '/my-activity.html',
    '/verify-email': '/verify-email.html',
    '/user-profile': '/user-profile.html',
    '/admin/reports': '/admin_reports.html',
    '/admin/dashboard': '/admin_dashboard.html',
    '/messages': '/dm_list.html',
    '/messages/inbox': '/dm.html',
    '/messages/detail': '/dm_detail.html',
  };

  function rewriteMiddleware(req, _res, next) {
    const urlPath = req.url.split('?')[0];
    if (rewrites[urlPath]) {
      req.url = req.url.replace(urlPath, rewrites[urlPath]);
    }
    next();
  }

  return {
    name: 'mpa-rewrites',
    configureServer(server) { server.middlewares.use(rewriteMiddleware); },
    configurePreviewServer(server) { server.middlewares.use(rewriteMiddleware); },
  };
}

export default defineConfig({
  root: '.',
  plugins: [mpaRewritePlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        user_login: resolve(__dirname, 'user_login.html'),
        user_signup: resolve(__dirname, 'user_signup.html'),
        user_password: resolve(__dirname, 'user_password.html'),
        user_edit: resolve(__dirname, 'user_edit.html'),
        user_find_account: resolve(__dirname, 'user_find_account.html'),
        'user-profile': resolve(__dirname, 'user-profile.html'),
        post_list: resolve(__dirname, 'post_list.html'),
        post_detail: resolve(__dirname, 'post_detail.html'),
        post_write: resolve(__dirname, 'post_write.html'),
        post_edit: resolve(__dirname, 'post_edit.html'),
        notifications: resolve(__dirname, 'notifications.html'),
        'my-activity': resolve(__dirname, 'my-activity.html'),
        'verify-email': resolve(__dirname, 'verify-email.html'),
        admin_reports: resolve(__dirname, 'admin_reports.html'),
        admin_dashboard: resolve(__dirname, 'admin_dashboard.html'),
        dm_list: resolve(__dirname, 'dm_list.html'),
        dm_detail: resolve(__dirname, 'dm_detail.html'),
        dm: resolve(__dirname, 'dm.html'),
      },
    },
  },
  server: { port: 8080, strictPort: true },
  preview: { port: 8080, strictPort: true },
});
