# 个人博客系统
[![Code Size](https://img.shields.io/github/languages/code-size/songquanpeng/blog)](https://github.com/songquanpeng/blog) 
[![license](https://img.shields.io/github/license/songquanpeng/blog)](https://github.com/songquanpeng/blog) 
[![release](https://img.shields.io/github/v/release/songquanpeng/blog)](https://github.com/songquanpeng/blog/releases)

<details>
<summary><strong><i>Click here to expand the README in English.</i></strong></summary>
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
    6. Bootstrap5: [blog-theme-bootstrap5](https://github.com/songquanpeng/blog-theme-bootstrap5).

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
1. 支持多种主题。
2. 支持多种页面类型，文章页面、HTML 页面、链接页面等等。
3. 无需配置数据库，开箱即用（如果你不想用 SQLite，请修改 `config.js` 配置文件）。
4. 内置 ACE 代码编辑器，附带多种代码主题（包括 Solarized Light）。
5. 支持通过 Docker 部署，详见[此处](#部署)。

## 主题
1. Bulma：Bulma CSS 风格主题，内置的默认主题。
2. Bootstrap：[Bootstrap 风格主题](https://github.com/songquanpeng/blog-theme-bootstrap)（推荐使用）。
3. W3：[W3.css 风格主题](https://github.com/songquanpeng/blog-theme-w3)。
4. V2ex: [V2ex 风格主题](https://github.com/songquanpeng/blog-theme-v2ex)。
5. Next: [Hexo Next 风格主题](https://github.com/songquanpeng/blog-theme-next)。
6. Bootstrap5: 借鉴自 [CodeLunatic/halo-theme-simple-bootstrap](https://github.com/CodeLunatic/halo-theme-simple-bootstrap) 的 [Bootstrap5 风格主题](https://github.com/songquanpeng/blog-theme-bootstrap5)。

注意：
1. 如需更改主题，打开后台管理系统中的 setting 页面，下拉框中找到 theme，修改后点击 submit，记得浏览器 `Ctrl + F5` 刷新缓存。
2. 由于精力有限，部分主题可能由于未能及时随项目更新导致存在问题。

## 演示
### 在线演示
1. [我的博客](https://iamazing.cn/) (可能并非最新版本).
2. [Heroku App](https://express-react-blog.herokuapp.com/) ([后台管理系统地址](https://express-react-blog.herokuapp.com/admin/) 默认用户名 `admin` 以及密码 `123456`)

### 截图演示
![桌面端首页](https://user-images.githubusercontent.com/39998050/108320215-76e02e00-71fd-11eb-8ecc-caeff90eb0da.png)
![后台管理页面文章列表页面](https://user-images.githubusercontent.com/39998050/108320192-6f208980-71fd-11eb-8e3d-92e61dce09e6.png)
![编辑器页面](https://user-images.githubusercontent.com/39998050/108320168-6465f480-71fd-11eb-8abd-f74588d9e39a.png)

## 部署
### 通过 Docker 部署
执行：`docker run -d -p 3000:3000 -v /home/ubuntu/data/blog:/app/data -e TZ=Asia/Shanghai justsong/blog`

开放的端口号为 3000，之后用 Nginx 配置域名，反代以及 SSL 证书即可。

数据将会保存在宿主机的 `/home/ubuntu/data/blog` 目录（数据库文件和上传的文件）。

如果想在网站根目录上传文件，则在该目录下新建一个 `index` 文件夹，里面可以放置 `favicon.ico`, `robots.txt` 等文件，具体参见 `data/index` 目录下的内容。

更新博客版本的流程：
```shell script
# pull new images
docker pull justsong/blog
# stop old container
docker stop id
# start new container
docker run -d -p 3000:3000 -v /home/ubuntu/data/blog:/app/data -e TZ=Asia/Shanghai justsong/blog
```

### 通过源码部署
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
# 推荐使用 pm2 进行启动
# 1. 安装 pm2
npm i -g pm2
# 2. 使用 pm2 启动服务
pm2 start ./app.js --name blog
```
