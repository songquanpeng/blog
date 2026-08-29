SHELL := /bin/sh
BINARY := bin/blog

.PHONY: help install build build-admin run dev dev-admin test check vuln fmt docker-build clean

help:
	@echo "make install       安装 Go 与前端依赖"
	@echo "make build         构建 React 后台和 Go 可执行文件"
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

build: build-admin
	mkdir -p bin
	CGO_ENABLED=1 go build -trimpath -ldflags="-s -w" -o $(BINARY) ./cmd/blog

run: build-admin
	go run ./cmd/blog

dev:
	GIN_MODE=debug go run ./cmd/blog

dev-admin:
	npm run dev --prefix admin

test: build-admin
	go test -race ./...

check: test vuln
	go vet ./...
	npm audit --prefix admin --registry=https://registry.npmjs.org

vuln:
	go run golang.org/x/vuln/cmd/govulncheck@latest ./...

fmt:
	gofmt -w cmd internal

docker-build:
	docker build -t blog:local .

clean:
	rm -rf bin/blog public/admin
