const CDN = {
  staticfile: 'cdn.staticfile.org', // for Chinese users
  jsdelivr: 'cdn.jsdelivr.net', // for other users
  cloudflare: 'cdnjs.cloudflare.com' // for other users
};

const externalStatisticsCode = `    
    <script>
      var _hmt = _hmt || [];
      (function () {
        var hm = document.createElement("script");
        hm.src = "https://hm.baidu.com/hm.js?61fbf466b30ee950df155c38b719b1f3";
        var s = document.getElementsByTagName("script")[0];
        s.parentNode.insertBefore(hm, s);
      })();
    </script>
`;
const articleAd = `
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
        <ins class="adsbygoogle"
             style="display:block; text-align:center;"
             data-ad-layout="in-article"
             data-ad-format="fluid"
             data-ad-client="ca-pub-4932639067711253"
             data-ad-slot="4180812612"></ins>
        <script>
          (adsbygoogle = window.adsbygoogle || []).push({
            overlays: {bottom:true}
          });
        </script>`;

config = {
  domain: 'iamazing.cn',
  owner: 'JustSong',
  siteName: 'JustSong 的博客小站',
  siteDescription: '记录有价值的个人思考与总结',
  cdn: CDN.staticfile,
  motto: '尽人事，听天命',
  link: 'https://github.com/songwonderful',
  enableComment: true,
  externalStatisticsCode: externalStatisticsCode, // This code will be insert into <head>
  articleAd: articleAd // This ad will show at the bottom of article
};

module.exports = {
  config: config
};
