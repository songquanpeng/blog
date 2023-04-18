<p align="right">
   <strong>中文</strong> | <a href="./README.en.md">English</a>
</p>

<div align="center">

# 个人博客系统

_✨ 基于 Node.js 的个人博客系统 ✨_

</div>

<p align="center">
  <a href="https://raw.githubusercontent.com/songquanpeng/blog/master/LICENSE">
    <img src="https://img.shields.io/github/license/songquanpeng/blog?color=brightgreen" alt="license">
  </a>
  <a href="https://github.com/songquanpeng/blog/releases/latest">
    <img src="https://img.shields.io/github/v/release/songquanpeng/blog?color=brightgreen&include_prereleases" alt="release">
  </a>
  <a href="https://github.com/songquanpeng/blog/releases/latest">
    <img src="https://img.shields.io/github/downloads/songquanpeng/blog/total?color=brightgreen&include_prereleases" alt="release">
  </a>
  <a href="https://hub.docker.com/repository/docker/justsong/blog">
    <img src="https://img.shields.io/docker/pulls/justsong/blog?color=brightgreen" alt="docker pull">
  </a>
</p>

<p align="center">
  <a href="#截图展示">截图展示</a>
  ·
  <a href="https://iamazing.cn/">在线演示</a>
  ·
  <a href="#部署">部署教程</a>
  ·
  <a href="https://github.com/songquanpeng/blog/issues">意见反馈</a>
</p>


## 描述
技术栈：Express.js（服务端）+ Sequelize（ORM） + React（后台）+ Ant Design（后台 UI 库）

特点：
1. 支持多种主题。
2. 支持多种页面类型，文章页面、HTML 页面、链接页面等等。
3. 无需配置数据库，开箱即用（如果你不想用 SQLite，请修改 `config.js` 配置文件）。
4. 内置 ACE 代码编辑器，附带多种代码主题（包括 Solarized Light）。
5. 支持通过 Docker 部署，一行命令即可上线部署，详见[此处](#部署)。
6. 支持通过 Token 验证发布文章，详见[此处](./bin/create_page_with_token.py)。

## 主题
1. Bulma：Bulma CSS 风格主题，内置的默认主题。
2. Bootstrap：[Bootstrap 风格主题](https://github.com/songquanpeng/blog-theme-bootstrap)（推荐使用）。
3. W3：[W3.css 风格主题](https://github.com/songquanpeng/blog-theme-w3)。
4. V2EX: [V2EX 风格主题](https://github.com/songquanpeng/blog-theme-v2ex)。
5. Next: [Hexo Next 风格主题](https://github.com/songquanpeng/blog-theme-next)。
6. Bootstrap5: 借鉴自 [CodeLunatic/halo-theme-simple-bootstrap](https://github.com/CodeLunatic/halo-theme-simple-bootstrap) 的 [Bootstrap5 风格主题](https://github.com/songquanpeng/blog-theme-bootstrap5)。

注意：
1. 更改主题的步骤：打开后台管理系统中的设置页面 -> 自定义设置 -> 找到 THEME -> 修改后点击保存设置，记得浏览器 `Ctrl + F5` 刷新缓存。
    + 可选的值有：`bulma`，`bootstrap`，`bootstrap5`，`w3`，`next` 以及 `v2ex`。
2. 由于精力有限，部分主题可能由于未能及时随项目更新导致存在问题。

## 演示
### 在线演示
1. [JustSong 的个人博客](https://iamazing.cn) (可能并非最新版本).
2. [Render App](https://nodejs-blog.onrender.com) ([后台管理系统地址](https://nodejs-blog.onrender.com/admin/) 默认用户名 `admin` 以及密码 `123456`)

### 截图展示
![桌面端首页](https://user-images.githubusercontent.com/39998050/108320215-76e02e00-71fd-11eb-8ecc-caeff90eb0da.png)
![后台管理页面文章列表页面](https://user-images.githubusercontent.com/39998050/108320192-6f208980-71fd-11eb-8e3d-92e61dce09e6.png)
![编辑器页面](https://user-images.githubusercontent.com/39998050/108320168-6465f480-71fd-11eb-8abd-f74588d9e39a.png)

## 部署
### 通过 Docker 部署
执行：`docker run --restart=always -d -p 3000:3000 -v /home/ubuntu/data/blog:/app/data -e TZ=Asia/Shanghai justsong/blog`

开放的端口号为 3000，之后用 Nginx 配置域名，反代以及 SSL 证书即可。

数据将会保存在宿主机的 `/home/ubuntu/data/blog` 目录（数据库文件和上传的文件）。

如果想在网站根目录上传文件，则在该目录下新建一个 `index` 文件夹，里面可以放置 `favicon.ico`, `robots.txt` 等文件，具体参见 `data/index` 目录下的内容。

更新博客版本的命令：`docker run --rm -v /var/run/docker.sock:/var/run/docker.sock containrrr/watchtower -cR`

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
