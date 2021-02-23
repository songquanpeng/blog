FROM node:14

RUN git clone https://github.com/songquanpeng/blog
WORKDIR blog
RUN yarn
RUN yarn build
RUN yarn global add pm2

EXPOSE 3000
CMD pm2 start app.js