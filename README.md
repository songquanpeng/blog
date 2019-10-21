# LIGHTX-CMS
![stars](https://img.shields.io/github/stars/songwonderful/lightx-cms) ![forks](https://img.shields.io/github/forks/songwonderful/lightx-cms) ![repo-size](https://img.shields.io/github/repo-size/songwonderful/lightx-cms) ![license](https://img.shields.io/github/license/songwonderful/lightx-cms) ![release](https://img.shields.io/github/v/release/songwonderful/lightx-cms)

## [**Why should I try this one?**](https://iamazing.cn/)
+ **Simple yet powerful enough**, which means you can understand the source code with ease and then develop your own blog website based on this one.
+ **Continually update is promised**.

## Description
+ This is a **dynamic blog system** that based on Node.js, Express.js, SQLite3 and Bootstrap 4.
+ Use this system to **deploy your own website**.
+ [**Click here to see the online demo.**](https://iamazing.cn/)
+ For more detailed information, please see this [wiki](https://github.com/songwonderful/lightx-cms/wiki).

## Features
+ **Dynamic:** Write articles directly in the browser.
+ **Easy to deploy:** There is no need to configure the database.
+ **Complete SEO support:** Semantic link, server-side rendering and more.
+ **Mobile support:** This website uses responsive layout.

## Try it now
1. Install Node.js with version `v10.14.2` or any compatible version. [Download Node.js here](https://nodejs.org/en/download/)
2. Clone this repository by type this on your terminal: `git clone https://github.com/songwonderful/lightx-cms.git`
3. Change the working directory by type this on your terminal: `cd lightx-cms`
4. Install required packages by type this command on your terminal: `npm install`
5. Type `npm start` or `pm2 start ./bin/www --name blog-system` to start the server.
6. Open [http://localhost:3000](http://localhost:3000) in your browser.
7. Notice that the system already has a user named `root`, whose initial password is `toor`. Please change it for security.
8. Okay, now everything is done, enjoy your own website. If you have any questions, please feel free to issue me.

## Notice
+ For faster loading speed, non-Chinese users need to replace all the CDN links [in this file](https://github.com/songwonderful/lightx-cms/blob/master/views/partials/header.ejs). You can try https://cdn.jsdelivr.net or https://cdnjs.cloudflare.com.

## Project structure
```
.
├── LICENSE
├── README.md
├── app.js
├── bin
│   └── www
├── data.db
├── database.sql
├── middlewares
│   └── check.js
├── models
│   ├── article.js
│   ├── data.js
│   └── user.js
├── package-lock.json
├── package.json
├── public
│   ├── ads.txt
│   ├── image
│   │   ├── avatar.jpg
│   │   └── background.png
│   ├── javascript
│   │   └── main.js
│   └── stylesheet
│       └── style.css
├── routes
│   ├── api.js
│   └── index.js
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
