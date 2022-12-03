let fs = require('fs');

let config = {
  port: process.env.PORT || 3000,
  database: process.env.SQLITE_PATH || './data/data.db',
  auth_cookie_name: 'blog',
  uploadPath: process.env.UPLOAD_PATH || './data/upload',
  systemName: 'Blog',
  systemVersion: 'v0.5.6',
  cacheMaxAge: 30 * 24 * 3600,  // 30 days
  maxCachePosts: 32
};

function init() {
  if (!fs.existsSync(config.uploadPath)) {
    fs.mkdirSync(config.uploadPath);
  }
}

init();

module.exports = config;
