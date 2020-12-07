# Express React Blog
[![Code Size](https://img.shields.io/github/languages/code-size/songquanpeng/blog)](https://github.com/songquanpeng/blog) 
[![license](https://img.shields.io/github/license/songquanpeng/blog)](https://github.com/songquanpeng/blog) 
[![release](https://img.shields.io/github/v/release/songquanpeng/blog)](https://github.com/songquanpeng/blog/releases)

<details>
<summary><strong>README 中文版本</strong></summary>
<div>

## 描述
1. 这是一个后端采用 Express.js ，而管理端采用 React 的博客系统。
2. 项目地址：https://github.com/songquanpeng/express-react-blog
3. 演示
 + [我的博客](https://iamazing.cn/) (可能并非最新版本).
 + [Heroku App](https://express-react-blog.herokuapp.com/) ([后台管理系统地址](https://express-react-blog.herokuapp.com/admin/) 默认用户名 `admin` 以及密码 `123456`)

## 亮点
1. 使用代码编辑器编辑内容（内置 ACE 代码编辑器，包含多种主题）。
2. 易于配置以及与 disqus 评论系统，访问统计系统整合。
3. 你可以从 OneNote 等软件中复制内容其带有格式（需要打开 `paste with formatting` 功能并设置页面类型为 `raw`），这意味着你可以将 OneNote 中的笔记发布到你的博客上！
4. 你可以使用本博客系统部署你的单页面 Web 应用（例如一个[游戏](https://iamazing.cn/page/online-battle-city)），只需要把代码粘贴进来并设置页面类型为 `raw`。
5. 本系统部署起来非常简单，无需配置数据库（此处用的是 SQLite，但是迁移到其他数据库也很简单，修改 `knexfile.js` 配置文件即可）。
6. 多种主题可供选择：
    1. Bulma：Bulma CSS 风格主题，也是内置的默认主题。
    2. Bootstrap：[Bootstrap 风格主题](https://github.com/songquanpeng/blog-theme-bootstrap)。
    3. W3：[W3.css 风格主题](https://github.com/songquanpeng/blog-theme-w3)。
    4. V2ex: [V2ex 风格主题](https://github.com/songquanpeng/blog-theme-v2ex)。
    5. Next: [Hexo Next 风格主题](https://github.com/songquanpeng/blog-theme-next).


## 部署
```shell script
git clone https://github.com/songquanpeng/blog.git
cd blog
npm install
npm run build  # Windows 用户运行 `npm run build2`
npm start
```

如何更新？
```shell script
git pull
npm install
npm run migrate
``` 
</div>
</details>

## Description
+ This is a blog system powered by Express.js and React.
+ Demonstrations
    + [My blog](https://iamazing.cn/) (may not be the latest version).
    + [Heroku App](https://express-react-blog.herokuapp.com/) (visit the [management system](https://express-react-blog.herokuapp.com/admin/) with default username `admin` and password `123456`)

## Highlights
1. You can use a **code editor** to edit your content (built-in ACE code editor with multiple themes).
2. Easy to configure and integrate with disqus and statistics system.
3. You can copy from OneNote or any other programs and **paste your content with formatting** (with the `paste with formatting` feature, don't forget to set the page type to `raw`).
4. You can use this to deploy your single page web application (such as a [game](https://iamazing.cn/page/online-battle-city)), just paste the code and set the page type to `raw`.
5. System deploy is extremely simple, no need to configure the database (here I use SQLite as the default database, but it's easy to move to other database, just by modifying the `knexfile.js`).
6. **Multiple themes available**:
    1. Bulma: default theme.
    2. Bootstrap: [blog-theme-bootstrap](https://github.com/songquanpeng/blog-theme-bootstrap).
    3. W3: [blog-theme-w3](https://github.com/songquanpeng/blog-theme-w3).
    4. V2ex: [blog-theme-v2ex](https://github.com/songquanpeng/blog-theme-v2ex).
    5. Next: [blog-theme-next](https://github.com/songquanpeng/blog-theme-next).

## Deployment
```shell script
git clone https://github.com/songquanpeng/blog.git
cd blog
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
