# 个人博客系统

使用 **Gin + GORM + React + Bulma** 的单人博客系统。公开页面由 Go 服务端渲染，管理后台使用 React；旧版 Sequelize SQLite 数据可直接挂载使用。

## 特性

- 只保留 Bulma 主题，公开站点与管理后台视觉统一。
- 服务端输出完整语义化 HTML，包含 canonical、Open Graph、JSON-LD、Atom、sitemap 和 robots。
- 显式沿用旧表名及字段名：`Pages`、`Users`、`Options`、`Files`。旧用户数据只用于显示历史作者，不再参与认证。
- 后台仅支持一个 GitHub OAuth 管理员，推荐使用不可变的 GitHub User ID 建立白名单。
- 内置 `blog-cli`：通过本站 device flow 授权，覆盖页面发布/撤回/隐藏/删除、站点标题与侧边栏、全部设置和文件管理；token 默认有效一年并可随时撤销。
- Markdown/HTML 默认经过净化；包含 CSP、安全 Cookie、OAuth state + PKCE、同源检查、请求体限制和安全文件上传。
- 历史 Raw 工具页在无 `same-origin` 权限的 CSP sandbox 中运行，保留脚本交互但不能读取主站 Cookie、后台 API 响应或父页面 DOM。
- 保留 `PORT`、`SQLITE_PATH`、`UPLOAD_PATH`、3000 端口、`/app/data` 卷、旧 URL 与主要 `/api` 路径。
- 支持 Docker、Makefile、`npm start`，以及旧的 `pm2 start app.js` 启动入口。

## GitHub OAuth 配置

在 GitHub 的 Developer settings → OAuth Apps 中创建 OAuth App，回调地址填写：

```text
https://你的域名/auth/github/callback
```

至少设置以下环境变量：

```dotenv
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_ALLOWED_USER_ID=123456
GITHUB_CALLBACK_URL=https://你的域名/auth/github/callback
PUBLIC_URL=https://你的域名
SESSION_SECRET=至少32字节的随机字符串
```

`GITHUB_ALLOWED_USER_ID` 比用户名可靠，因为用户名可以修改。若暂时无法取得 ID，也可使用 `GITHUB_ALLOWED_LOGIN`。

## blog-cli

管理员登录后台后打开“CLI”页面，复制页面中根据 `PUBLIC_URL` 生成的安装命令。安装器只依赖 `curl`，CLI 本身需要 Python 3.9+，默认安装到 `~/.local/bin/blog-cli`。

```bash
blog-cli auth login
blog-cli page list --json
blog-cli page create --title "标题" --link slug --content-file post.md --status published
blog-cli page hide slug
blog-cli site title "新的博客标题"
blog-cli site sidebar set sidebar.json
blog-cli file upload cover.webp --description "文章封面"
```

`blog-cli help --json` 会输出完整的机器可读命令目录、参数约定、页面类型和状态值。CLI 在 stdout 不是终端时自动输出稳定 JSON envelope，错误使用非零退出码，并在结果中给出下一步命令。删除与关机等破坏性操作必须显式传入 `--yes`。

登录采用由本站实现的 device flow：CLI 只显示一次性授权码，管理员在后台核对客户端名称并批准后才签发 token。数据库仅保存 device code 和 token 的 SHA-256 摘要。可在后台 CLI 页面查看和撤销所有有效凭据，也可执行 `blog-cli auth logout` 撤销当前凭据。

## 本地部署

需要 Go 1.25+、Node.js 22+、npm 和 C 编译工具链（GORM SQLite 驱动需要 CGO）。

```bash
make install
make test
make build

export GITHUB_CLIENT_ID=...
export GITHUB_CLIENT_SECRET=...
export GITHUB_ALLOWED_USER_ID=...
export GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
export PUBLIC_URL=http://localhost:3000
export SESSION_SECRET="$(openssl rand -hex 32)"
./bin/blog
```

开发时可分别运行：

```bash
make dev
make dev-admin
```

旧源码部署入口仍可使用：

```bash
npm start
# 或先 make build，然后：
pm2 start ./app.js --name blog
```

## Docker 部署

旧版数据卷和端口参数保持不变，只需增加 OAuth 环境变量：

```bash
docker build -t blog:local .
docker run --restart=always -d \
  -p 3000:3000 \
  -v /home/ubuntu/data/blog:/app/data \
  -e TZ=Asia/Shanghai \
  -e PUBLIC_URL=https://你的域名 \
  -e GITHUB_CLIENT_ID=... \
  -e GITHUB_CLIENT_SECRET=... \
  -e GITHUB_ALLOWED_USER_ID=... \
  -e GITHUB_CALLBACK_URL=https://你的域名/auth/github/callback \
  -e SESSION_SECRET=... \
  blog:local
```

容器启动时会修正旧数据卷权限，服务进程随后以非 root 用户运行。

## 历史数据升级

升级前请备份 `data/data.db` 和 `data/upload`。应用对已有 Sequelize 表不执行 GORM AutoMigrate，避免 SQLite 重建旧表；只会补建缺失表、补充缺失的默认设置，并把 `theme` 固定为 `bulma`。

旧 `Users` 表不会删除，以免破坏文章作者外键和历史展示，但所有密码、角色及 access token 均不再用于认证。自动化管理统一使用由本站 device flow 签发且可撤销的 CLI token。

危险的历史自定义 HTML 默认会被净化。如确需完全恢复受信任的旧 HTML，可设置 `BLOG_ALLOW_UNSAFE_HTML=true`；这会显著扩大 XSS 风险，不建议用于多人可写数据。

合并旧域名时应先在数据库和上传目录副本上检查同路径异内容冲突，保持 `/page/:link`、`/upload/:file` 等原路径不变。验收通过后再把旧域名的每一个请求按原 path 和 query 做永久重定向到新域名，同时更新 `PUBLIC_URL`、canonical、sitemap 和搜索引擎站点设置；不要把所有旧链接统一跳到首页。

## 常用环境变量

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `PORT` | `3000` | HTTP 端口 |
| `SQLITE_PATH` | `./data/data.db` | SQLite 文件 |
| `UPLOAD_PATH` | `./data/upload` | 上传目录 |
| `PUBLIC_URL` | 自动推断 | canonical、sitemap、feed 基础 URL |
| `TRUSTED_PROXIES` | 空 | 逗号分隔的可信反向代理 CIDR/IP |
| `MAX_UPLOAD_MB` | `20` | 单文件上限 |
| `SESSION_TTL_HOURS` | `24` | 管理会话时长 |
| `CLI_TOKEN_TTL_HOURS` | `8760` | CLI token 有效期，默认 365 天 |
| `CLI_DEVICE_CODE_TTL_MINUTES` | `10` | device flow 授权码有效期 |
| `BLOG_ENABLE_SHUTDOWN` | `false` | 是否恢复旧远程关机接口 |
| `BLOG_ALLOW_UNSAFE_HTML` | `false` | 是否允许未经净化的管理员 HTML |

反向代理可继续使用仓库中的 [blog.conf](./blog.conf)，生产环境应启用 HTTPS。

## 测试

```bash
make test   # Go race tests + React production build
make check  # 额外运行 go vet、govulncheck 与 npm audit
```

测试包含旧 Sequelize schema 读取、HTML 净化、固定链接校验和 GitHub 不可变 ID 白名单。

## License

MIT
