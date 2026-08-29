# Personal Blog

A single-owner blog built with Gin, GORM, React, and Bulma. Public pages are server-rendered for SEO; the React admin uses GitHub OAuth exclusively.

The refactor preserves the historical SQLite tables and fields, URLs, API paths, port 3000, `/app/data` volume, and the `PORT`, `SQLITE_PATH`, and `UPLOAD_PATH` environment variables. Legacy users remain only as historical author references and are never used for authentication.

## blog-cli

After signing in, open **CLI** in the admin sidebar and copy the installation command generated from `PUBLIC_URL`. The Python 3.9+ client uses this blog's own browser device flow; tokens last 365 days by default and can be revoked from the same page.

```bash
blog-cli auth login
blog-cli page list --json
blog-cli page create --title "Title" --link slug --content-file post.md --status published
blog-cli site title "New blog title"
blog-cli site sidebar set sidebar.json
```

Run `blog-cli help --json` for a machine-readable command catalog. Non-interactive output is JSON by default, every result suggests useful next commands, and destructive operations require `--yes`. Configure lifetimes with `CLI_TOKEN_TTL_HOURS` (default `8760`) and `CLI_DEVICE_CODE_TTL_MINUTES` (default `10`).

## Quick start

Create a GitHub OAuth App with callback URL `https://your-domain/auth/github/callback`, then:

Local builds require Go 1.25+, Node.js 22+, npm, and a C toolchain for the GORM SQLite driver.

```bash
make install
make test
make build

export PUBLIC_URL=https://your-domain
export GITHUB_CLIENT_ID=...
export GITHUB_CLIENT_SECRET=...
export GITHUB_ALLOWED_USER_ID=...
export GITHUB_CALLBACK_URL=https://your-domain/auth/github/callback
export SESSION_SECRET="$(openssl rand -hex 32)"
./bin/blog
```

For Docker:

```bash
docker build -t blog:local .
docker run -d --restart=always -p 3000:3000 \
  -v /home/ubuntu/data/blog:/app/data \
  -e PUBLIC_URL=https://your-domain \
  -e GITHUB_CLIENT_ID=... \
  -e GITHUB_CLIENT_SECRET=... \
  -e GITHUB_ALLOWED_USER_ID=... \
  -e GITHUB_CALLBACK_URL=https://your-domain/auth/github/callback \
  -e SESSION_SECRET=... \
  blog:local
```

Back up `data/data.db` and `data/upload` before upgrading. Existing Sequelize tables are not auto-altered by GORM. HTML is sanitized by default; setting `BLOG_ALLOW_UNSAFE_HTML=true` restores trusted legacy HTML at the cost of XSS protection.

Run `make help` for local build, development, test, audit, and Docker commands.

## License

MIT
