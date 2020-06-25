# Express React Blog
![stars](https://img.shields.io/github/stars/songquanpeng/lightx-cms) ![forks](https://img.shields.io/github/forks/songquanpeng/lightx-cms) ![repo-size](https://img.shields.io/github/repo-size/songquanpeng/lightx-cms) ![license](https://img.shields.io/github/license/songquanpeng/lightx-cms) ![release](https://img.shields.io/github/v/release/songquanpeng/lightx-cms)

[中文](https://iamazing.cn/page/LIGHTX-CMS-使用记录以及-TODO-事项)
## Description
+ This is a blog system powered by Express.js and React.
+ [Demo](https://iamazing.cn/) (may not be the latest version).

## Highlights
1. You can use a **code editor** to edit your content (built-in ACE code editor with multiple themes), f**k WYSIWYG editor.
2. Easy to configure and integrate with disqus and statistics system.
3. You can copy from OneNote or any other programs and **paste your content with formatting** (with the `paste with formatting` feature, don't forget to set the page type to `raw`).
4. You can use this to deploy your single page web application (such as a [game](https://iamazing.cn/page/online-battle-city)), just paste the code and set the page type to `raw`.
5. [System deploy is extremely simple](https://github.com/songquanpeng/express-react-blog/tree/release), no need to configure the database (but it's easy to move to other database, just by modifying the `knexfile.js`).

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