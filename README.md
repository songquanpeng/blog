# Express React Blog
![stars](https://img.shields.io/github/stars/songquanpeng/lightx-cms) ![forks](https://img.shields.io/github/forks/songquanpeng/lightx-cms) ![repo-size](https://img.shields.io/github/repo-size/songquanpeng/lightx-cms) ![license](https://img.shields.io/github/license/songquanpeng/lightx-cms) ![release](https://img.shields.io/github/v/release/songquanpeng/lightx-cms)

[中文](https://iamazing.cn/page/LIGHTX-CMS-使用记录以及-TODO-事项)
## Description
+ This is a blog system powered by Express.js and React.
+ Disqus is integrated, but there is also a built in comment system.
+ I use the SQLite database here, but its easy to move to other database, just by modifying the `knexfile.js`.
+ [Demo](https://iamazing.cn/) (may not be the latest version).
+ Please use the release version if you want to have a try, which I have initialize the SQLite database and build the react application.
+ Use `npx knex migrate:latest` to initialize the database before you run it.
+ Recommend use `pm2 start ./app.js --name blog` when you deploy it. 
+ Visit [/admin](http://localhost:3000/admin) with default username `admin` and password `123456` to manage your blog.

## Supported Page Type
|Page Type|Description|
|---|---|
|Article Page | Needless to say.|
|Raw HTML Page | Use it to deploy your single page application, such as a little tool written in JavaScript or a online game. [Demo.](https://iamazing.cn/page/online-battle-city)|
|Links Page| You can put some useful links here. [Demo.](https://iamazing.cn/page/links)|
|Code Page| Just like Github Gist. [Demo.](https://iamazing.cn/page/使用-Pygame-生成大量小球)|
|Discuss Page| Add a dedicated discussion page in your site.|

## Project Structure
```
.
├── LICENSE         MIT License.
├── README.md       Project Readme.
├── admin           The admin part for this blog system.
├── app.js          Use node run this script.
├── data.db         Your SQLite databse.
├── knexfile.js     Configure your database configuration here.
├── middlewares     As name.
├── migrations      Database migrations.
├── models          Here I defined some models to operation the database.
├── package.json    Needless to say.
├── public          The website visitor can access files under this folder.
├── routes          Some api routes.
├── utils           As name.
└── views           The ejs templates are stored here.
```