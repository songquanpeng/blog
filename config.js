const CDN = {
  staticfile: 'cdn.staticfile.org', // for Chinese users
  jsdelivr: 'cdn.jsdelivr.net', // for other users
  cloudflare: 'cdnjs.cloudflare.com' // for other users
};
const ad = {
  articleAd: `
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
        </script>`,
  sidebarAd: `
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
        <!-- sidebar-ad -->
        <ins class="adsbygoogle"
             style="display:block"
             data-ad-client="ca-pub-4932639067711253"
             data-ad-slot="7215977983"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
        <script>
             (adsbygoogle = window.adsbygoogle || []).push({});
        </script>`
};
const externalHeadCode = ` 
    <script data-ad-client="ca-pub-4932639067711253" async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>   
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

config = {
  owner: 'JustSong',
  siteName: 'JustSong 的博客小站',
  siteUrl: 'https://iamazing.cn',
  siteDescription: '记录有价值的个人思考与总结',
  cdn: CDN.staticfile,
  motto: '尽人事，听天命',
  link: 'https://github.com/songwonderful',
  port: 3000,
  enableComment: true,
  enableAd: true,
  ad: ad,
  externalHeadCode: externalHeadCode // These codes will be insert into <head>
};

module.exports = {
  config: config
};
