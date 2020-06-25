# Express React Blog
![stars](https://img.shields.io/github/stars/songquanpeng/lightx-cms) ![forks](https://img.shields.io/github/forks/songquanpeng/lightx-cms) ![repo-size](https://img.shields.io/github/repo-size/songquanpeng/lightx-cms) ![license](https://img.shields.io/github/license/songquanpeng/lightx-cms) ![release](https://img.shields.io/github/v/release/songquanpeng/lightx-cms)

[中文](https://iamazing.cn/page/LIGHTX-CMS-使用记录以及-TODO-事项)
## Description
+ This is a blog system powered by Express.js and React.
+ Demonstrations
    + [My blog](https://iamazing.cn/) (may not be the latest version).
    + [Heroku App](https://express-react-blog.herokuapp.com/) (visit the [management system](https://express-react-blog.herokuapp.com/admin/) with default username `admin` and password `123456`)

## Highlights
1. You can use a **code editor** to edit your content (built-in ACE code editor with multiple themes), f**k WYSIWYG editor.
2. Easy to configure and integrate with disqus and statistics system.
3. You can copy from OneNote or any other programs and **paste your content with formatting** (with the `paste with formatting` feature, don't forget to set the page type to `raw`).
4. You can use this to deploy your single page web application (such as a [game](https://iamazing.cn/page/online-battle-city)), just paste the code and set the page type to `raw`.
5. System deploy is extremely simple, no need to configure the database (but it's easy to move to other database, just by modifying the `knexfile.js`).

## Deployment
```shell script
git clone https://github.com/songquanpeng/express-react-blog.git
cd express-react-blog
npm install
npm run build  # For Windows user, please run `npm run build2` instead
npm start
```

How to update it?
```shell script
git pull
npm install
npm run migrate
``` 
