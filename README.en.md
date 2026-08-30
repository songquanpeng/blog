# Personal Blog

A single-owner blog built with Gin, GORM, React, and Bulma. Public pages keep the classic Bulma theme and are server-rendered for SEO; the React admin uses its own management-focused design system and GitHub OAuth exclusively.

The refactor preserves the historical SQLite tables and fields, URLs, API paths, port 3000, `/app/data` volume, and the `PORT`, `SQLITE_PATH`, and `UPLOAD_PATH` environment variables. Legacy users remain only as historical author references and are never used for authentication. The admin also includes first-party article analytics for PV, UV, daily trends, Referrers, recognized search engines and visible search terms, and User-Agent values without storing raw IP addresses.

## Microblog

The integrated microblog publishes Markdown short notes at an independent path (`/microblog` by default). Its admin page provides complete create, edit, visibility, and delete controls plus an immediate feature switch and configurable path, title, and description. Disabling the public feature returns 404 at that path while retaining all data and admin access.

Microblog entries live in their own `MicroPosts` table. Legacy `songquanpeng/microblog` data is deliberately not imported during application startup. Use the one-time importer in dry-run mode first, then apply it explicitly:

```bash
python3 bin/import_microblog.py /path/to/microblog.db /path/to/blog/data.db
python3 bin/import_microblog.py /path/to/microblog.db /path/to/blog/data.db --apply
```

The importer never deletes target rows; exact matches are skipped and conflicting IDs are appended under new IDs.

## blog-cli

After signing in, open **CLI** in the admin sidebar and copy the installation command generated from `PUBLIC_URL`. `blog-cli` is a standalone Go program in this repository's `cli/` directory; the installer selects and verifies the Linux/macOS amd64/arm64 binary, with no Python or Go runtime required. It uses this blog's own browser device flow; tokens last 365 days by default and can be revoked from the same page.

```bash
blog-cli auth login
blog-cli search "keyword" --json
blog-cli page search "body text" --status published --json
blog-cli page list --json
blog-cli page create --title "Title" --link slug --content-file post.md --status published
blog-cli microblog create "A short note" --status public
blog-cli microblog list --search "keyword" --json
blog-cli microblog update 42 --content-file note.md
blog-cli microblog delete 42 --yes
blog-cli site title "New blog title"
blog-cli site sidebar set sidebar.json
```

`blog-cli search` searches page titles, links, descriptions, tags, full bodies, and microblog bodies by default. Page results preserve content plus metadata such as views, votes, and timestamps. Use `--scope page|microblog` and the type, status, limit, and offset filters to narrow results; use `page search` when only complete page results are needed.

Run `blog-cli help --json` for a machine-readable command catalog. Microblog content can be passed directly or read from a file/stdin with `--content-file`. Non-interactive output is JSON by default, every result suggests useful next commands, and destructive operations require `--yes`. Configure lifetimes with `CLI_TOKEN_TTL_HOURS` (default `8760`) and `CLI_DEVICE_CODE_TTL_MINUTES` (default `10`).

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

Back up `data/data.db` and `data/upload` before upgrading. Existing Sequelize tables are not auto-altered by GORM. Owner-authored HTML is preserved by default and standalone HTML pages run in an opaque sandbox; set `BLOG_ALLOW_UNSAFE_HTML=false` when untrusted users can write content.

Run `make help` for local build, development, test, audit, and Docker commands.

## License

MIT
