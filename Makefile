SHELL := /bin/sh
BINARY := bin/blog
CLI_BINARY := bin/blog-cli
CLI_DIST := dist/cli
CLI_VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)

.PHONY: help install build build-admin build-cli build-cli-dist run dev dev-admin test check vuln fmt docker-build clean

help:
	@echo "make install       安装 Go 与前端依赖"
	@echo "make build         构建 React 后台和 Go 可执行文件"
	@echo "make build-cli     构建当前平台的独立 Go CLI"
	@echo "make build-cli-dist 构建 CLI 的 Linux/macOS 多平台分发包"
	@echo "make run           构建后台后本地运行"
	@echo "make dev           以 Gin debug 模式运行后端"
	@echo "make dev-admin     启动 Vite 开发服务器"
	@echo "make test          运行 Go 测试并验证前端构建"
	@echo "make check         测试、go vet、依赖漏洞扫描和 npm audit"
	@echo "make docker-build  构建 Docker 镜像"

install:
	go mod download
	npm ci --prefix admin

build-admin:
	npm ci --prefix admin
	npm run build --prefix admin

build-cli:
	mkdir -p bin
	CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X main.version=$(CLI_VERSION)" -o $(CLI_BINARY) ./cli

build-cli-dist:
	mkdir -p $(CLI_DIST)
	@set -eu; for target in linux-amd64 linux-arm64 darwin-amd64 darwin-arm64; do \
		os=$${target%-*}; arch=$${target#*-}; binary="$(CLI_DIST)/blog-cli-$$target"; \
		CGO_ENABLED=0 GOOS=$$os GOARCH=$$arch go build -trimpath -ldflags="-s -w -X main.version=$(CLI_VERSION)" -o "$$binary" ./cli; \
		gzip -n -9 -c "$$binary" > "$$binary.gz"; \
		if command -v sha256sum >/dev/null 2>&1; then sha256sum "$$binary.gz" | awk '{print $$1}'; else shasum -a 256 "$$binary.gz" | awk '{print $$1}'; fi > "$$binary.gz.sha256"; \
		rm -f "$$binary"; \
	done

build: build-admin build-cli-dist
	mkdir -p bin
	CGO_ENABLED=1 go build -trimpath -ldflags="-s -w" -o $(BINARY) ./cmd/blog

run: build-admin
	go run ./cmd/blog

dev:
	GIN_MODE=debug go run ./cmd/blog

dev-admin:
	npm run dev --prefix admin

test:
	npm ci --prefix admin
	npm test --prefix admin
	npm run build --prefix admin
	go test -race ./...

check: test vuln
	go vet ./...
	npm audit --prefix admin --registry=https://registry.npmjs.org

vuln:
	go run golang.org/x/vuln/cmd/govulncheck@latest ./...

fmt:
	gofmt -w cli cmd internal

docker-build:
	docker build -t blog:local .

clean:
	rm -rf bin/blog bin/blog-cli dist/cli public/admin
