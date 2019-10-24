const CDN = {
  staticfile: 'cdn.staticfile.org', // for China users
  jsdelivr: 'cdn.jsdelivr.net', // for other users
  cloudflare: 'cdnjs.cloudflare.com' // for other users
};

config = {
  domain: 'iamazing.cn',
  owner: 'JustSong',
  siteName: 'JustSong 的博客小站',
  siteDescription: '记录有价值的个人思考与总结',
  cdn: CDN.staticfile,
  motto: '尽人事，听天命',
  link: 'https://github.com/songwonderful'
};

module.exports = {
  config: config
};
