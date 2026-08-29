FROM node:24-alpine AS frontend
WORKDIR /src/admin
COPY admin/package.json admin/package-lock.json ./
RUN npm ci
COPY admin/ ./
RUN npm run build

FROM golang:1.25-alpine AS backend
RUN apk add --no-cache build-base
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /src/public/admin ./public/admin
RUN CGO_ENABLED=1 go build -trimpath -ldflags="-s -w" -o /out/blog ./cmd/blog

FROM alpine:3.23
RUN apk add --no-cache ca-certificates su-exec tzdata \
    && addgroup -S -g 10001 blog \
    && adduser -S -D -H -u 10001 -G blog blog \
    && mkdir -p /app/data/upload /app/public/admin \
    && chown -R blog:blog /app
WORKDIR /app
COPY --from=backend /out/blog /app/blog
COPY --from=backend /src/templates /app/templates
COPY --from=backend /src/themes/bulma /app/themes/bulma
COPY --from=backend /src/data/index /app/default-index
COPY --from=backend /src/public/admin /app/public/admin
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint
RUN chmod 0755 /usr/local/bin/docker-entrypoint
ENV PORT=3000 SQLITE_PATH=/app/data/data.db UPLOAD_PATH=/app/data/upload INDEX_PATH=/app/data/index DEFAULT_INDEX_PATH=/app/default-index GIN_MODE=release
VOLUME ["/app/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:3000/robots.txt || exit 1
ENTRYPOINT ["/usr/local/bin/docker-entrypoint"]
