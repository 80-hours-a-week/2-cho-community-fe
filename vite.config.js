import { defineConfig } from 'vite';
import { resolve } from 'path';

// MPA 클린 URL 리라이트 플러그인 (serve.json 대체)
function mpaRewritePlugin() {
  const rewrites = {
    '/': '/html/user_login.html',
    '/main': '/html/post_list.html',
    '/login': '/html/user_login.html',
    '/signup': '/html/user_signup.html',
    '/password': '/html/user_password.html',
    '/detail': '/html/post_detail.html',
    '/write': '/html/post_write.html',
    '/edit': '/html/post_edit.html',
    '/edit-profile': '/html/user_edit.html',
    '/find-account': '/html/user_find_account.html',
    '/notifications': '/html/notifications.html',
    '/my-activity': '/html/my-activity.html',
    '/verify-email': '/html/verify-email.html',
    '/user-profile': '/html/user-profile.html',
    '/admin/reports': '/html/admin_reports.html',
    '/admin/dashboard': '/html/admin_dashboard.html',
    '/messages': '/html/dm_list.html',
    '/messages/inbox': '/html/dm.html',
    '/messages/detail': '/html/dm_detail.html',
    '/social-signup': '/html/social_signup.html',
    '/packages': '/html/package_list.html',
    '/packages/detail': '/html/package_detail.html',
    '/packages/write': '/html/package_write.html',
    '/wiki': '/html/wiki_list.html',
    '/wiki/write': '/html/wiki_write.html',
    '/wiki/edit': '/html/wiki_edit.html',
    '/badges': '/html/badges.html',
  };

  function rewriteMiddleware(req, _res, next) {
    const urlPath = req.url.split('?')[0];
    if (rewrites[urlPath]) {
      req.url = req.url.replace(urlPath, rewrites[urlPath]);
    }
    // 위키 상세 페이지: /wiki/{slug} 동적 라우팅
    if (!rewrites[urlPath] && urlPath.startsWith('/wiki/') && urlPath !== '/wiki/write' && urlPath !== '/wiki/edit') {
      req.url = req.url.replace(urlPath, '/html/wiki_detail.html');
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
      output: {
        // 마크다운 관련 라이브러리(marked, dompurify, highlight.js)를 별도 chunk로 분리하여
        // 마크다운을 사용하지 않는 페이지에서 불필요한 코드 로딩 방지
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('marked') || id.includes('dompurify') || id.includes('highlight.js')) {
              return 'vendor-markdown';
            }
            return 'vendor';
          }
        },
      },
      input: {
        user_login: resolve(__dirname, 'html/user_login.html'),
        user_signup: resolve(__dirname, 'html/user_signup.html'),
        user_password: resolve(__dirname, 'html/user_password.html'),
        user_edit: resolve(__dirname, 'html/user_edit.html'),
        user_find_account: resolve(__dirname, 'html/user_find_account.html'),
        'user-profile': resolve(__dirname, 'html/user-profile.html'),
        post_list: resolve(__dirname, 'html/post_list.html'),
        post_detail: resolve(__dirname, 'html/post_detail.html'),
        post_write: resolve(__dirname, 'html/post_write.html'),
        post_edit: resolve(__dirname, 'html/post_edit.html'),
        notifications: resolve(__dirname, 'html/notifications.html'),
        'my-activity': resolve(__dirname, 'html/my-activity.html'),
        'verify-email': resolve(__dirname, 'html/verify-email.html'),
        admin_reports: resolve(__dirname, 'html/admin_reports.html'),
        admin_dashboard: resolve(__dirname, 'html/admin_dashboard.html'),
        dm_list: resolve(__dirname, 'html/dm_list.html'),
        dm_detail: resolve(__dirname, 'html/dm_detail.html'),
        dm: resolve(__dirname, 'html/dm.html'),
        social_signup: resolve(__dirname, 'html/social_signup.html'),
        package_list: resolve(__dirname, 'html/package_list.html'),
        package_detail: resolve(__dirname, 'html/package_detail.html'),
        package_write: resolve(__dirname, 'html/package_write.html'),
        wiki_list: resolve(__dirname, 'html/wiki_list.html'),
        wiki_detail: resolve(__dirname, 'html/wiki_detail.html'),
        wiki_write: resolve(__dirname, 'html/wiki_write.html'),
        wiki_edit: resolve(__dirname, 'html/wiki_edit.html'),
        badges: resolve(__dirname, 'html/badges.html'),
      },
    },
  },
  server: { host: '127.0.0.1', port: 8080, strictPort: true },
  preview: { host: '127.0.0.1', port: 8080, strictPort: true },
});
