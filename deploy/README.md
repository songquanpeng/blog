# cnvps deployment

Run Compose from this directory on cnvps with a tested, pinned release image:

```sh
export BLOG_IMAGE=justsong/blog:v0.14.9
sudo --preserve-env=BLOG_IMAGE docker-compose -f cnvps.compose.yml config --quiet
sudo --preserve-env=BLOG_IMAGE docker-compose -f cnvps.compose.yml pull
# Back up SQLite with its backup API and preserve the upload directory first.
# On the first migration to Compose, stop the old justsong-blog-<commit> container.
sudo --preserve-env=BLOG_IMAGE docker-compose -f cnvps.compose.yml up -d
```

The private `/etc/blog-github-egress/blog.env` file contains the existing OAuth
configuration and session secret. Preserve it across releases; do not copy it
into the repository or rotate the session secret during deployment.

Both the blog and the existing `blog-github-egress` proxy must join the external
Docker network **blog-github-egress**. The default `bridge` network does not
resolve that container name. Compose declares this dependency explicitly and
fails if the network is absent, so recreating the blog cannot silently lose its
OAuth route. Do not publish the proxy port to the public Internet.

Before switching production, start the release on a temporary loopback port
using a SQLite backup and the same private network/environment. Check the home
page, an article, both public stylesheets, and the admin assets. Use the
application's GitHub network check and complete a real OAuth login after the
switch; a healthy `/robots.txt` response alone does not verify login.

For rollback, set `BLOG_IMAGE` to the previous release and run `up -d` again.
During the first Compose migration, retain the stopped previous container until
acceptance finishes; stop the new container before restarting the old one.
Do not overwrite the live database with a backup unless schema recovery is
actually needed, because doing so would discard writes made after deployment.

## Browser regression checklist

- At desktop width, scroll settings and the editor from top to bottom. The admin
  sidebar's top must stay at 0 and its bottom at viewport height. In a short
  viewport, all navigation/account controls must remain reachable by scrolling
  the sidebar itself. At 760px and below, verify horizontal navigation, no page
  overflow, and that content is not covered by a fixed sidebar.
- In Studio and Bulma, at desktop and mobile widths, inspect adjacent article
  links with long titles, including first/last articles. Each title must have a
  positive visible height, remain inside its link, and wrap without page overflow.
  A DOM text assertion alone misses the original zero-height CSS regression.
- Save social links in an isolated test site, reload settings, then verify the
  homepage links and expandable WeChat panel. Empty fields must hide the
  corresponding links, and unsafe URL schemes must never be rendered. Preserve
  existing production values; do not populate the live site with test content.
