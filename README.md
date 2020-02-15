# LIGHTX-CMS
![stars](https://img.shields.io/github/stars/songquanpeng/lightx-cms) ![forks](https://img.shields.io/github/forks/songquanpeng/lightx-cms) ![repo-size](https://img.shields.io/github/repo-size/songquanpeng/lightx-cms) ![license](https://img.shields.io/github/license/songquanpeng/lightx-cms) ![release](https://img.shields.io/github/v/release/songquanpeng/lightx-cms)

## Description
+ A personal content management system, powered by Express.js and React.
+ [Demo here.(May not be the latest version)](https://iamazing.cn/)

## Features
+ Support multiple page types, such as article, code, links, original page, notice, media and many others.
+ Very lightweight, basically dependency free.
+ Powerful online editor powered by react-ace.
+ Directly configure your cms system in your browser. For example you can directly insert the google analytics code in admin interface.

## Notice
+ You should always use the [latest release version](https://github.com/songquanpeng/lightx-cms/releases/latest).
+ Some features are still in development.

## Deploy
1. Download the [latest release version](https://github.com/songquanpeng/lightx-cms/releases/latest).
2. Unzip: `unzip lightx-cms-0.0.0.zip` (Remember replace "0.0.0" to the actual version).
3. `cd lightx-cms-0.0.0` and then install the dependency `npm i`.
4. Now run it: `node ./bin/www` or 'pm2 start ./bin/www --name lightx-cms' (By default the server listen to port 3000).
