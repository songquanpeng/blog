# LIGHTX-CMS
![stars](https://img.shields.io/github/stars/songquanpeng/lightx-cms) ![forks](https://img.shields.io/github/forks/songquanpeng/lightx-cms) ![repo-size](https://img.shields.io/github/repo-size/songquanpeng/lightx-cms) ![license](https://img.shields.io/github/license/songquanpeng/lightx-cms) ![release](https://img.shields.io/github/v/release/songquanpeng/lightx-cms) ![download](https://img.shields.io/github/downloads/songquanpeng/lightx-cms/total)

## Description
+ A personal content management system, powered by Express.js and React.
+ [Demo here.(May not be the latest version)](https://iamazing.cn/).

![homepage](https://user-images.githubusercontent.com/39998050/76419552-7cbd7480-63db-11ea-86a3-b21f0e5ffbff.PNG)
![raw page demo](https://user-images.githubusercontent.com/39998050/76419566-80e99200-63db-11ea-8c59-63add4bcd971.PNG)
![editor](https://user-images.githubusercontent.com/39998050/76419533-75966680-63db-11ea-9f2b-1ba7ce1aed31.PNG)

## Features
+ PWA supported.
+ Support multiple page types, such as article, code, links, original page, notice, media and many others.
+ Very lightweight, basically dependency free.
+ Powerful online editor powered by react-ace.
+ Directly configure your cms system in your browser. For example you can directly insert the google analytics code in admin interface.

## Notice
+ If you want to try it, you should always use the [latest release version](https://github.com/songquanpeng/lightx-cms/releases/latest).
+ Some features are still in development.
+ **If you want to join the development, there are some steps you should to do.**
    1. Run `git clone https://github.com/songquanpeng/lightx-cms.git` to clone this project.
    2. Run `git submodule update` to clone the submodule.
    3. Run `rm ./package-lock.json`, because I use the [taobao](https://registry.npm.taobao.org/) npm mirror and it maybe not suitable for you. (Don't forget the package-lock.json in ./lightx-cms-admin. You should delete it too.)
    4. Run `npm i` to install the dependency (so do lightx-cms-admin). Sometimes the sqlite3 dependency maybe quite slow to install, you can use `npm i sqlite3` to install it manually.
    5. Run `knex migrate:latest` to initialize the SQLite database (if it says knex not found, please install knex by `npm install knex -g`). I use [knex](http://knexjs.org/) in this project, so it should be easy for you to move to another database.
    6. Change working directory to `lightx-cms-admin` and run `npm run build`, after that `rm ../public/admin -r` and `mv ./build ../public/admin`.
    6. Run `npm start` to start the server with default port 3000. 
+ If you has any other questions or suggestions about that, please let me know.

## Deploy
1. Download the [latest release version](https://github.com/songquanpeng/lightx-cms/releases/latest).
2. Unzip: `unzip lightx-cms-0.0.0.zip` (Remember replace "0.0.0" to the actual version).
3. `cd lightx-cms-0.0.0` and then install the dependency `npm i`.
4. Now run it: `node ./bin/www` or `pm2 start ./bin/www --name lightx-cms` (By default the server listen to port 3000).
