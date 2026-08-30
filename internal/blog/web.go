package blog

import (
	"encoding/xml"
	"fmt"
	"html/template"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func (a *App) index(c *gin.Context) {
	pageNumber, _ := strconv.Atoi(c.Query("p"))
	if pageNumber < 0 {
		pageNumber = 0
	}
	canonicalPath := "/"
	if pageNumber > 0 {
		canonicalPath = fmt.Sprintf("/?p=%d", pageNumber)
	}
	data, err := a.baseView(c, "", "", canonicalPath)
	if err != nil {
		a.renderError(c, http.StatusInternalServerError, "加载失败", err.Error())
		return
	}
	options, _ := a.store.Options(c.Request.Context())
	if custom := options["index_page_content"]; custom != "" {
		if custom == "404" {
			a.renderError(c, http.StatusNotFound, "未找到目标页面", "首页已由站点设置禁用")
			return
		}
		data.Kind = "custom"
		data.Page = &Page{Rendered: a.safeHTML(custom)}
		a.render(c, http.StatusOK, data)
		return
	}
	pages, err := a.store.PublicPages(c.Request.Context())
	if err != nil {
		a.renderError(c, http.StatusInternalServerError, "加载失败", err.Error())
		return
	}
	start := pageNumber * 10
	if start >= len(pages) && pageNumber > 0 {
		c.Redirect(http.StatusFound, "/")
		return
	}
	end := start + 10
	if end > len(pages) {
		end = len(pages)
	}
	data.Kind, data.Pages = "index", pages[start:end]
	if pageNumber > 0 {
		data.PrevURL = fmt.Sprintf("/?p=%d", pageNumber-1)
	}
	if end < len(pages) {
		data.NextURL = fmt.Sprintf("/?p=%d", pageNumber+1)
	}
	data.JSONLD = collectionJSONLD(data, data.Pages, data.SiteName)
	a.render(c, http.StatusOK, data)
}

func (a *App) archive(c *gin.Context) {
	pages, err := a.store.ArchivePages(c.Request.Context())
	if err != nil {
		a.renderError(c, http.StatusInternalServerError, "存档加载失败", err.Error())
		return
	}
	data, err := a.baseView(c, "存档", "文章存档", "/archive")
	if err != nil {
		a.renderError(c, http.StatusInternalServerError, "加载失败", err.Error())
		return
	}
	data.Kind, data.Pages = "archive", pages
	data.JSONLD = collectionJSONLD(data, pages, "文章存档 — "+data.SiteName)
	a.render(c, http.StatusOK, data)
}

func (a *App) monthArchive(c *gin.Context) {
	year, yearErr := strconv.Atoi(c.Param("year"))
	month, monthErr := strconv.Atoi(c.Param("month"))
	if yearErr != nil || monthErr != nil || year < 1970 || year > 2200 || month < 1 || month > 12 {
		a.renderError(c, http.StatusBadRequest, "日期无效", "请使用 /archive/YYYY/MM 格式")
		return
	}
	pages, err := a.store.PagesByMonth(c.Request.Context(), year, month)
	if err != nil {
		a.renderError(c, http.StatusInternalServerError, "存档加载失败", err.Error())
		return
	}
	title := fmt.Sprintf("%04d-%02d", year, month)
	data, _ := a.baseView(c, title, title+" 文章存档", c.Request.URL.Path)
	data.Kind, data.Pages, data.ListTitle = "list", pages, title
	data.JSONLD = collectionJSONLD(data, pages, title+" 文章存档")
	a.render(c, http.StatusOK, data)
}

func (a *App) tag(c *gin.Context) {
	tag := strings.TrimSpace(c.Param("tag"))
	if tag == "" || len(tag) > 100 {
		a.renderError(c, http.StatusBadRequest, "标签无效", "标签为空或过长")
		return
	}
	pages, err := a.store.PagesByTag(c.Request.Context(), tag)
	if err != nil {
		a.renderError(c, http.StatusInternalServerError, "标签加载失败", err.Error())
		return
	}
	data, _ := a.baseView(c, tag, "标签 "+tag+" 下的文章", "/tag/"+url.PathEscape(tag))
	data.Kind, data.Pages, data.ListTitle = "list", pages, tag
	data.JSONLD = collectionJSONLD(data, pages, "标签 "+tag)
	a.render(c, http.StatusOK, data)
}

func (a *App) page(c *gin.Context) {
	page, err := a.store.PublicPageByLink(c.Request.Context(), c.Param("link"))
	if err != nil {
		a.renderError(c, http.StatusNotFound, "页面不存在", "未找到该公开页面")
		return
	}
	// StatusHidden is the legacy "Hide on index" state: it removes a page
	// from listing pages and the sitemap, but the historical implementation
	// still allowed search engines to index the canonical page itself.
	if page.Type == PageRedirect {
		target := strings.TrimSpace(stripFrontMatter(page.Content))
		if !safeNavigationURL(target) {
			a.renderError(c, http.StatusBadRequest, "重定向无效", "目标地址不是安全的 HTTP(S) 或站内链接")
			return
		}
		c.Redirect(http.StatusFound, target)
		return
	}
	if page.Type == PageText {
		content := stripFrontMatter(page.Content)
		contentType := "text/plain; charset=utf-8"
		if strings.HasSuffix(strings.ToLower(page.Link), ".json") {
			contentType = "application/json; charset=utf-8"
		} else if strings.HasSuffix(strings.ToLower(page.Link), ".html") {
			contentType = "text/html; charset=utf-8"
			content = responsiveHTMLDocument(string(a.safeHTML(content)))
		}
		c.Data(http.StatusOK, contentType, []byte(content))
		return
	}
	data, err := a.baseView(c, page.Title, plainDescription(page.Description), "/page/"+url.PathEscape(page.Link))
	if err != nil {
		a.renderError(c, http.StatusInternalServerError, "页面加载失败", err.Error())
		return
	}
	page.Tags = splitTags(page.Tag)
	if len(page.Tags) > 0 && page.Tags[0] != "Others" {
		page.Category = page.Tags[0]
		data.Related, _ = a.store.PagesByTag(c.Request.Context(), page.Category)
	}
	if page.Password == "" && page.Type != PageCode && page.Type != PageRaw {
		page.Rendered = a.renderContent(page)
	}
	data.Kind, data.Page = "article", &page
	if page.PageStatus == StatusHidden || page.Password != "" {
		data.Robots = "noindex,follow,noarchive"
	}
	if page.Type == PageCode {
		data.Kind = "code"
	} else if page.Type == PageLinks {
		data.Kind, data.Links = "links", parseLinks(page.Content)
	} else if page.Type == PageRaw && page.Password == "" {
		data.Kind = "raw"
	} else if page.Type != PageArticle && page.Type != PageDiscuss && page.Type != PageRaw {
		a.renderError(c, http.StatusNotImplemented, "页面类型暂不支持", fmt.Sprintf("历史页面类型 %d 没有对应的公开视图", page.Type))
		return
	}
	publicPages, _ := a.store.PublicPages(c.Request.Context())
	foundCurrent := false
	for i := range publicPages {
		if publicPages[i].ID == page.ID {
			foundCurrent = true
			if i > 0 {
				data.Prev = &publicPages[i-1]
			}
			if i+1 < len(publicPages) {
				data.Next = &publicPages[i+1]
			}
			break
		}
	}
	if !foundCurrent {
		if len(publicPages) > 0 {
			data.Prev = &publicPages[0]
		}
		if len(publicPages) > 1 {
			data.Next = &publicPages[1]
		}
	}
	data.JSONLD = articleJSONLD(data, page)
	a.recordArticleView(c, page)
	page.View++
	a.render(c, http.StatusOK, data)
}

func responsiveHTMLDocument(content string) string {
	const viewport = `<meta name="viewport" content="width=device-width,initial-scale=1">`
	const compatibilityStyle = `<style id="blog-responsive-compat">html,body{max-width:100%}*,*::before,*::after{box-sizing:border-box}img,video,canvas,svg{max-width:100%;height:auto}input,select,textarea{max-width:calc(100% - 4px)}</style>`
	lower := strings.ToLower(content)
	insertion := compatibilityStyle
	if !strings.Contains(lower, `name="viewport"`) && !strings.Contains(lower, `name='viewport'`) {
		insertion = viewport + insertion
	}
	if headEnd := strings.Index(lower, "</head>"); headEnd >= 0 {
		return content[:headEnd] + insertion + content[headEnd:]
	}
	return insertion + content
}

func (a *App) rawPageContent(c *gin.Context) {
	page, err := a.store.PublicPageByLink(c.Request.Context(), c.Param("link"))
	if err != nil || page.Type != PageRaw || page.Password != "" {
		c.Status(http.StatusNotFound)
		return
	}
	content := stripFrontMatter(page.Content)
	options, _ := a.store.Options(c.Request.Context())
	theme := publicTheme(options["theme"])
	var document strings.Builder
	document.WriteString("<!doctype html><html data-site-theme=\"")
	document.WriteString(theme)
	document.WriteString("\" lang=\"")
	document.WriteString(template.HTMLEscapeString(option(options, "language", "zh-CN")))
	document.WriteString("\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>")
	document.WriteString(template.HTMLEscapeString(page.Title))
	document.WriteString("</title><link rel=\"stylesheet\" href=\"/static/bulma.min.css\"><link rel=\"stylesheet\" href=\"/static/main.css?v=bulma-theme-20260830\">")
	if theme == publicThemeStudio {
		document.WriteString("<link rel=\"stylesheet\" href=\"/theme/studio/main.css?v=studio-songti-20260830\">")
	}
	document.WriteString("</head><body><main class=\"raw\">")
	document.WriteString(content)
	document.WriteString(`</main><script>addEventListener("message",function(e){if(e.data&&e.data.type==="blog-theme"){document.documentElement.dataset.theme=e.data.theme}});new ResizeObserver(function(){parent.postMessage({type:"blog-raw-height",height:document.documentElement.scrollHeight},"*")}).observe(document.documentElement);parent.postMessage({type:"blog-raw-ready"},"*")</script></body></html>`)

	c.Header("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline' https: http:; style-src 'unsafe-inline' https: http:; img-src data: https: http:; font-src data: https: http:; connect-src https: http:; frame-src https: http:; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'self' https: http:; sandbox allow-scripts allow-forms allow-popups allow-modals allow-downloads")
	c.Header("X-Frame-Options", "SAMEORIGIN")
	c.Header("X-Robots-Tag", "noindex, nofollow, nosnippet")
	c.Header("Cache-Control", "no-store")
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(document.String()))
}

type sitemapURLSet struct {
	XMLName xml.Name     `xml:"urlset"`
	XMLNS   string       `xml:"xmlns,attr"`
	URLs    []sitemapURL `xml:"url"`
}

type sitemapURL struct {
	Location string `xml:"loc"`
	Modified string `xml:"lastmod,omitempty"`
}

func (a *App) sitemap(c *gin.Context) {
	pages, err := a.store.PublicPages(c.Request.Context())
	if err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	options, _ := a.store.Options(c.Request.Context())
	base := a.publicURL(c, options)
	lastModified := ""
	if len(pages) > 0 {
		lastModified = shortDate(pages[0].UpdatedAt)
	}
	set := sitemapURLSet{XMLNS: "http://www.sitemaps.org/schemas/sitemap/0.9", URLs: []sitemapURL{{Location: base + "/", Modified: lastModified}, {Location: base + "/archive", Modified: lastModified}}}
	microblog := currentMicroblogConfig(options)
	if microblog.Enabled {
		microPosts, _, _ := a.store.MicroPosts(c.Request.Context(), true, 0, 1)
		modified := ""
		if len(microPosts) > 0 {
			modified = shortDate(microPosts[0].UpdatedAt)
		}
		set.URLs = append(set.URLs, sitemapURL{Location: base + "/" + microblog.Path, Modified: modified})
	}
	tags := make(map[string]struct{})
	for _, page := range pages {
		set.URLs = append(set.URLs, sitemapURL{Location: base + "/page/" + url.PathEscape(page.Link), Modified: shortDate(page.UpdatedAt)})
		for _, tag := range splitTags(page.Tag) {
			tags[tag] = struct{}{}
		}
	}
	tagNames := make([]string, 0, len(tags))
	for tag := range tags {
		tagNames = append(tagNames, tag)
	}
	sort.Strings(tagNames)
	for _, tag := range tagNames {
		set.URLs = append(set.URLs, sitemapURL{Location: base + "/tag/" + url.PathEscape(tag), Modified: lastModified})
	}
	encoded, err := xml.MarshalIndent(set, "", "  ")
	if err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	c.Header("Cache-Control", "public, max-age=3600")
	c.Data(http.StatusOK, "application/xml; charset=utf-8", append([]byte(xml.Header), encoded...))
}

type atomFeed struct {
	XMLName xml.Name    `xml:"feed"`
	XMLNS   string      `xml:"xmlns,attr"`
	Title   string      `xml:"title"`
	ID      string      `xml:"id"`
	Updated string      `xml:"updated"`
	Link    atomLink    `xml:"link"`
	Entries []atomEntry `xml:"entry"`
}
type atomLink struct {
	Href string `xml:"href,attr"`
}
type atomEntry struct {
	Title   string   `xml:"title"`
	ID      string   `xml:"id"`
	Link    atomLink `xml:"link"`
	Updated string   `xml:"updated"`
	Summary string   `xml:"summary"`
}

func (a *App) feed(c *gin.Context) {
	pages, err := a.store.PublicPages(c.Request.Context())
	if err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	if len(pages) > 10 {
		pages = pages[:10]
	}
	options, _ := a.store.Options(c.Request.Context())
	base := a.publicURL(c, options)
	feed := atomFeed{XMLNS: "http://www.w3.org/2005/Atom", Title: option(options, "site_name", "Blog"), ID: base + "/", Link: atomLink{Href: base + "/feed.xml"}, Updated: time.Now().UTC().Format(time.RFC3339)}
	for _, page := range pages {
		link := base + "/page/" + url.PathEscape(page.Link)
		feed.Entries = append(feed.Entries, atomEntry{Title: page.Title, ID: link, Link: atomLink{Href: link}, Updated: page.UpdatedAt, Summary: plainDescription(page.Description)})
	}
	encoded, _ := xml.MarshalIndent(feed, "", "  ")
	c.Data(http.StatusOK, "application/atom+xml; charset=utf-8", append([]byte(xml.Header), encoded...))
}

func (a *App) robots(c *gin.Context) {
	custom := filepath.Join(a.cfg.IndexPath, "robots.txt")
	if info, err := os.Stat(custom); err == nil && !info.IsDir() {
		content, readErr := os.ReadFile(custom)
		if readErr == nil {
			text := strings.TrimSpace(string(content))
			if !strings.Contains(strings.ToLower(text), "sitemap:") {
				text += "\nSitemap: " + a.publicURL(c, optionMap(a, c)) + "/sitemap.xml"
			}
			c.Header("Content-Type", "text/plain; charset=utf-8")
			c.String(http.StatusOK, "%s\n", text)
			return
		}
		c.Status(http.StatusInternalServerError)
		return
	}
	options, _ := a.store.Options(c.Request.Context())
	c.String(http.StatusOK, "User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /auth/\nSitemap: %s/sitemap.xml\n", a.publicURL(c, options))
}

func optionMap(a *App, c *gin.Context) map[string]string {
	options, _ := a.store.Options(c.Request.Context())
	return options
}
