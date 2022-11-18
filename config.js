let config = {
  debug: true,
  port: process.env.PORT || 3000,
  database: 'data.db',
  session_secret: Math.random().toString(),
  auth_cookie_name: 'blog',
  uploadPath: './public/upload',
  systemName: 'Blog',
  systemVersion: 'v0.5.3',
  cacheMaxAge: 30 * 24 * 3600,  // 30 days
  maxCachePosts: 32
};

function init() {}
init();

module.exports = config;
