FROM node:16 as builder

WORKDIR /app
COPY . .
RUN npm install
RUN cd admin && npm run update && cd .. && rm -r admin

FROM node:16-alpine
WORKDIR /app
COPY --from=builder /app /app
VOLUME ["/app/data"]
RUN npm install sqlite3@5.0.2  # https://github.com/TryGhost/node-sqlite3/issues/1581
RUN npm install pm2 -g
EXPOSE 3000
CMD ["pm2-runtime", "app.js"]