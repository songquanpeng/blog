# LIGHTX-CMS
![stars](https://img.shields.io/github/stars/songwonderful/lightx-cms) ![forks](https://img.shields.io/github/forks/songwonderful/lightx-cms) ![repo-size](https://img.shields.io/github/repo-size/songwonderful/lightx-cms) ![license](https://img.shields.io/github/license/songwonderful/lightx-cms) ![release](https://img.shields.io/github/v/release/songwonderful/lightx-cms)

[中文](https://iamazing.cn/article/LIGHTX-CMS-——-基于-Node.js，Express.js-以及-SQLite-3-搭建个人博客)
## Description
+ This is a blog system that based on Node.js, Express.js, SQLite 3 and Bootstrap 4.
+ You can use this system to **deploy your own website** with ease.
+ [**Click here to see the online demo.**](https://iamazing.cn/)
+ For more detailed information, please see this [wiki](https://github.com/songwonderful/lightx-cms/wiki).

## Features
+ **Easy to expand**: The code is easy to understand, I used the standard project strcuture for Express.js.
+ **Easy to deploy**: It's easy to deploy, because there is no need to configure the database and what you only nedd to do is `git clone` & `npm install` & `npm start`.

## Deploy it now
1. Install Node.js with version `v10.14.2` or any compatible version. [Download Node.js here](https://nodejs.org/en/download/)
2. Clone this repository by type this on your terminal: `git clone https://github.com/songwonderful/lightx-cms.git`
3. Change the working directory by type this on your terminal: `cd lightx-cms`
4. Install required packages by type this command on your terminal: `npm install`
5. Type `npm start` or `pm2 start ./bin/www --name blog-system` to start the server.
6. Open [http://localhost:3000](http://localhost:3000) in your browser.
7. Notice that the system already has a user named `root`, whose initial password is `toor`. Please change it for security.
8. Open `config.js` to configure this system.
9. Okay, now everything is done, enjoy your own website. If you have any questions, please feel free to issue me.

## Notice
+ For faster loading speed, you should use the proper cdn provider. You can easily change it in the file "config.js".
+ There is still some hard coding in the code, I will remove it in future updates.

## Project structure
```
.
├── LICENSE  # MIT LICENSE
├── README.md
├── app.js
├── bin
│   └── www
├── config.js  # Configuration
├── data.db  # SQLite database
├── database.sql  # Database structure
├── middlewares
│   └── check.js  # Permission check
├── models
│   ├── article.js
│   ├── data.js
│   └── user.js
├── package-lock.json
├── package.json
├── public
│   ├── ads.txt  # Google ad
│   ├── image
│   │   └──avatar.jpg  # Avatar
│   ├── javascript
│   │   └── main.js
│   └── stylesheet
│       └── style.css
├── routes
│   ├── api.js  # /api/
│   └── index.js  # /
├── utils
│   └── util.js
└── views
    ├── archive.ejs
    ├── article.ejs
    ├── index.ejs
    ├── list.ejs
    ├── login.ejs
    ├── message.ejs
    ├── partials
    │   ├── comment.ejs
    │   ├── end.ejs
    │   ├── footer.ejs
    │   ├── header.ejs
    │   ├── message.ejs
    │   └── navigation.ejs
    ├── post.ejs
    └── user.ejs
```
