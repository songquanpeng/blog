FROM node:16 as builder

WORKDIR /build
COPY . .
RUN npm install
RUN cd admin && npm run update && cd .. && rm -r admin

FROM node:16-alpine
WORKDIR /build
COPY --from=builder /build /build
RUN npm install sqlite3@5.0.2  # https://github.com/TryGhost/node-sqlite3/issues/1581
RUN npm install pm2 -g
EXPOSE 3000
CMD ["pm2-runtime", "app.js"]