let config = {
  debug: true,
  port: process.env.PORT || 3000,
  database: 'data.db',
  session_secret: 'justice',
  auth_cookie_name: 'blog',
  uploadPath: './public/upload',
  systemName: 'Blog',
  systemVersion: 'v0.5.0'
};

function init() {}
init();

module.exports = config;
