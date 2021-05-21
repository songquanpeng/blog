# Blog
[![Code Size](https://img.shields.io/github/languages/code-size/songquanpeng/blog)](https://github.com/songquanpeng/blog) 
[![license](https://img.shields.io/github/license/songquanpeng/blog)](https://github.com/songquanpeng/blog) 
[![release](https://img.shields.io/github/v/release/songquanpeng/blog)](https://github.com/songquanpeng/blog/releases)

<details>
<summary><strong><i>Click here to expend the English version of readme.</i></strong></summary>
<div>
 
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
git clone --recurse-submodules https://github.com/songquanpeng/blog.git
cd blog
npm install
npm run build  # For Windows user, please run `npm run build2` instead
npm start
```

</div>
</details>

## 描述
技术栈：Express.js（服务端）+ Sequelize（ORM） + React（后台）+ Ant Design（后台 UI 库）

特点：
1. 支持主题。
2. 无需配置数据库，开箱即用（如果你不想用 SQLite，请修改 `config.js` 配置文件）。
3. 内置 ACE 代码编辑器，附带多种代码主题。

## 主题
1. Bulma：Bulma CSS 风格主题，内置的默认主题。
2. Bootstrap：[Bootstrap 风格主题](https://github.com/songquanpeng/blog-theme-bootstrap)。
3. W3：[W3.css 风格主题](https://github.com/songquanpeng/blog-theme-w3)。
4. V2ex: [V2ex 风格主题](https://github.com/songquanpeng/blog-theme-v2ex)。
5. Next: [Hexo Next 风格主题](https://github.com/songquanpeng/blog-theme-next).

**注意**
1. 如需更改主题，打开后台管理系统中的 setting 页面，下拉框中找到 theme，修改后点击 submit，记得浏览器 `Ctrl + F5` 刷新缓存。
2. 由于精力有限，部分主题可能由于未能及时随项目更新导致存在问题。

## 演示
1. [我的博客](https://iamazing.cn/) (可能并非最新版本).
2. [Heroku App](https://express-react-blog.herokuapp.com/) ([后台管理系统地址](https://express-react-blog.herokuapp.com/admin/) 默认用户名 `admin` 以及密码 `123456`)

![桌面端首页](https://user-images.githubusercontent.com/39998050/108320215-76e02e00-71fd-11eb-8ecc-caeff90eb0da.png)
![后台管理页面文章列表页面](https://user-images.githubusercontent.com/39998050/108320192-6f208980-71fd-11eb-8e3d-92e61dce09e6.png)
![编辑器页面](https://user-images.githubusercontent.com/39998050/108320168-6465f480-71fd-11eb-8abd-f74588d9e39a.png)

## 部署
```shell script
git clone https://github.com/songquanpeng/blog.git
cd blog
# 获取主题
git submodule init
# 更新主题
git submodule update
# 安装依赖
npm install
# 编译后台管理系统
npm run build  # Windows 用户请运行 `npm run build2`
# 启动服务
npm start
```
