package blog

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html/template"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/microcosm-cc/bluemonday"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
)

var uploadedSVGSourcePattern = regexp.MustCompile(`(?i)(\bsrc=["']/upload/[^"'?#]+\.svg)(["'])`)

func (a *App) baseView(c *gin.Context, title, description, canonicalPath string) (ViewData, error) {
	options, err := a.store.Options(c.Request.Context())
	if err != nil {
		return ViewData{}, err
	}
	siteName := option(options, "site_name", "Blog")
	if title == "" {
		title = siteName
		if motto := strings.TrimSpace(options["motto"]); motto != "" && motto != siteName {
			title += " · " + motto
		}
	} else if title != siteName {
		title += " — " + siteName
	}
	if description == "" {
		description = option(options, "description", "")
	}
	description = plainDescription(description)
	base := a.publicURL(c, options)
	canonical := base + canonicalPath
	var nav []NavGroup
	if err := json.Unmarshal([]byte(options["nav_links"]), &nav); err != nil {
		nav = []NavGroup{{Key: "导航", Value: []NavItem{{Text: "首页", Link: "/"}, {Text: "存档", Link: "/archive"}}}}
	}
	for i := range nav {
		filtered := nav[i].Value[:0]
		for _, item := range nav[i].Value {
			if safeNavigationURL(item.Link) {
				filtered = append(filtered, item)
			}
		}
		nav[i].Value = filtered
	}
	primaryNav := []NavItem{}
	if len(nav) > 0 {
		primaryNav = nav[0].Value
		nav = nav[1:]
	}
	microblog := currentMicroblogConfig(options)
	if microblog.Enabled {
		microblogLink := "/" + microblog.Path
		found := false
		for _, item := range primaryNav {
			if strings.TrimRight(item.Link, "/") == microblogLink {
				found = true
				break
			}
		}
		if !found {
			primaryNav = append(primaryNav, NavItem{Text: microblog.Title, Link: microblogLink})
		}
	}
	nonce, _ := c.Get("cspNonce")
	codeTheme := ""
	if uploadedCodeTheme(options["code_theme"]) != "" {
		codeTheme = "/code-theme.css"
	}
	brandImage := strings.TrimSpace(options["brand_image"])
	socialImage := strings.TrimSpace(options["social_image"])
	if socialImage == "" {
		socialImage = brandImage
	}
	language := option(options, "language", "zh-CN")
	author := option(options, "author", siteName)
	favicon := option(options, "favicon", "/favicon.ico")
	if favicon == "/favicon.ico" {
		// Bust caches left behind by the briefly deployed justsong.cn favicon.
		favicon = "/favicon.ico?v=8f4f79e7"
	}
	data := ViewData{
		Lang: language, OGLocale: strings.ReplaceAll(language, "-", "_"), Title: title, Description: description,
		Robots:    "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
		Canonical: canonical, SiteURL: base, SiteName: siteName, SiteInitial: firstRune(siteName), Motto: options["motto"], Author: author,
		Year: time.Now().Year(), Favicon: favicon, BrandImage: brandImage,
		SocialImage: publicAssetURL(base, socialImage), CodeTheme: codeTheme,
		PrimaryNav: primaryNav, Nav: nav, Copyright: a.safeHTML(options["copyright"]),
		ExtraFooter: a.safeHTML(options["extra_footer_text"]), AllowUnsafe: a.cfg.AllowUnsafeHTML,
		Nonce: fmt.Sprint(nonce),
	}
	data.JSONLD = siteJSONLD(data)
	// The historical public theme treated the special notice page as site
	// configuration, even when its regular page status was recalled.
	if notice, err := a.store.PageByLink(c.Request.Context(), "notice"); err == nil {
		data.Notice = a.renderContent(notice)
	}
	return data, nil
}

func (a *App) publicURL(c *gin.Context, options map[string]string) string {
	if a.cfg.PublicURL != "" {
		return a.cfg.PublicURL
	}
	domain := strings.TrimSpace(options["domain"])
	if domain != "" && domain != "www.your-domain.com" && !strings.ContainsAny(domain, "/?#") {
		return "https://" + domain
	}
	scheme := "http"
	if requestSecure(c) {
		scheme = "https"
	}
	return scheme + "://" + c.Request.Host
}

func option(options map[string]string, key, fallback string) string {
	if value := strings.TrimSpace(options[key]); value != "" {
		return value
	}
	return fallback
}

func safeNavigationURL(value string) bool {
	if strings.HasPrefix(value, "/") && !strings.HasPrefix(value, "//") {
		return true
	}
	parsed, err := url.Parse(value)
	return err == nil && (parsed.Scheme == "https" || parsed.Scheme == "http") && parsed.Host != ""
}

func publicAssetURL(base, value string) string {
	value = strings.TrimSpace(value)
	if strings.HasPrefix(value, "/") && !strings.HasPrefix(value, "//") {
		return strings.TrimRight(base, "/") + value
	}
	if safeNavigationURL(value) {
		return value
	}
	return ""
}

func (a *App) safeHTML(value string) template.HTML {
	if a.cfg.AllowUnsafeHTML {
		return template.HTML(value)
	}
	return template.HTML(bluemonday.UGCPolicy().Sanitize(value))
}

func stripFrontMatter(content string) string {
	normalized := strings.TrimPrefix(content, "\ufeff")
	lines := strings.Split(normalized, "\n")
	if len(lines) == 0 || strings.TrimSpace(strings.TrimSuffix(lines[0], "\r")) != "---" {
		return content
	}
	for i := 1; i < len(lines); i++ {
		if strings.TrimSpace(strings.TrimSuffix(lines[i], "\r")) == "---" {
			return strings.Join(lines[i+1:], "\n")
		}
	}
	return content
}

func versionUploadedSVGReferences(rendered string) string {
	return uploadedSVGSourcePattern.ReplaceAllString(rendered, `${1}?v=svg-inline-20260830${2}`)
}

func (a *App) renderContent(page Page) template.HTML {
	content := stripFrontMatter(page.Content)
	if page.Type == PageRaw {
		return a.safeHTML(content)
	}
	markdown := goldmark.New(
		goldmark.WithExtensions(extension.GFM, extension.Footnote),
		goldmark.WithParserOptions(parser.WithAutoHeadingID()),
	)
	var rendered bytes.Buffer
	if err := markdown.Convert([]byte(content), &rendered); err != nil {
		return template.HTML(bluemonday.StrictPolicy().Sanitize(content))
	}
	return a.safeHTML(versionUploadedSVGReferences(rendered.String()))
}

func (a *App) render(c *gin.Context, status int, data ViewData) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.Header("Cache-Control", "no-cache")
	c.Status(status)
	if err := a.templates.ExecuteTemplate(c.Writer, "layout.gohtml", data); err != nil {
		c.Error(err)
	}
}

func (a *App) renderError(c *gin.Context, status int, title, message string) {
	data, err := a.baseView(c, title, "", c.Request.URL.Path)
	if err != nil {
		c.String(status, "%s: %s", title, message)
		return
	}
	data.Kind, data.Message = "message", message
	data.Robots = "noindex,follow"
	a.render(c, status, data)
}

func articleJSONLD(data ViewData, page Page) template.JS {
	article := map[string]any{
		"@type": "BlogPosting", "@id": data.Canonical + "#article", "url": data.Canonical, "headline": page.Title,
		"description": firstNonEmpty(page.Description, data.Description), "datePublished": page.CreatedAt, "dateModified": page.UpdatedAt,
		"mainEntityOfPage": map[string]string{"@type": "WebPage", "@id": data.Canonical},
		"isPartOf":         map[string]string{"@id": data.SiteURL + "/#website"},
		"author":           map[string]string{"@type": "Person", "name": firstNonEmpty(page.Author, data.Author)},
		"publisher":        map[string]string{"@type": "Organization", "name": data.SiteName},
	}
	if data.SocialImage != "" {
		article["image"] = data.SocialImage
	}
	if len(page.Tags) > 0 {
		article["keywords"] = page.Tags
	}
	payload := map[string]any{
		"@context": "https://schema.org",
		"@graph": []any{
			map[string]any{"@type": "WebSite", "@id": data.SiteURL + "/#website", "url": data.SiteURL + "/", "name": data.SiteName, "description": data.Description, "inLanguage": data.Lang},
			map[string]any{"@type": "BreadcrumbList", "@id": data.Canonical + "#breadcrumb", "itemListElement": []any{
				map[string]any{"@type": "ListItem", "position": 1, "name": "首页", "item": data.SiteURL + "/"},
				map[string]any{"@type": "ListItem", "position": 2, "name": page.Title, "item": data.Canonical},
			}},
			article,
		},
	}
	encoded, _ := json.Marshal(payload)
	return template.JS(encoded)
}

func siteJSONLD(data ViewData) template.JS {
	payload := map[string]any{
		"@context": "https://schema.org", "@type": "WebSite", "@id": data.SiteURL + "/#website",
		"url": data.SiteURL + "/", "name": data.SiteName, "description": data.Description,
		"inLanguage": data.Lang, "publisher": map[string]string{"@type": "Person", "name": data.Author},
	}
	encoded, _ := json.Marshal(payload)
	return template.JS(encoded)
}

func collectionJSONLD(data ViewData, pages []Page, name string) template.JS {
	items := make([]any, 0, len(pages))
	for index, page := range pages {
		items = append(items, map[string]any{
			"@type": "ListItem", "position": index + 1, "name": page.Title,
			"url": data.SiteURL + "/page/" + url.PathEscape(page.Link),
		})
	}
	payload := map[string]any{
		"@context": "https://schema.org", "@type": "CollectionPage", "@id": data.Canonical,
		"url": data.Canonical, "name": name, "description": data.Description, "inLanguage": data.Lang,
		"isPartOf":   map[string]string{"@id": data.SiteURL + "/#website"},
		"mainEntity": map[string]any{"@type": "ItemList", "itemListElement": items},
	}
	encoded, _ := json.Marshal(payload)
	return template.JS(encoded)
}

func microblogJSONLD(data ViewData, posts []MicroPost, name string) template.JS {
	items := make([]any, 0, len(posts))
	for index, post := range posts {
		items = append(items, map[string]any{
			"@type": "ListItem", "position": index + 1,
			"item": map[string]any{
				"@type": "SocialMediaPosting", "articleBody": plainDescription(post.Content),
				"datePublished": post.CreatedAt, "dateModified": post.UpdatedAt,
				"author": map[string]string{"@type": "Person", "name": data.Author},
			},
		})
	}
	payload := map[string]any{
		"@context": "https://schema.org", "@type": "CollectionPage", "@id": data.Canonical,
		"url": data.Canonical, "name": name, "description": data.Description, "inLanguage": data.Lang,
		"isPartOf":   map[string]string{"@id": data.SiteURL + "/#website"},
		"mainEntity": map[string]any{"@type": "ItemList", "itemListElement": items},
	}
	encoded, _ := json.Marshal(payload)
	return template.JS(encoded)
}

func firstRune(value string) string {
	for _, char := range strings.TrimSpace(value) {
		return string(char)
	}
	return "B"
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return "Unknown"
}

func parseLinks(content string) []Link {
	var links []Link
	current := -1
	for _, source := range strings.Split(stripFrontMatter(content), "\n") {
		parts := strings.SplitN(source, ":", 2)
		if len(parts) != 2 {
			continue
		}
		key, value := strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1])
		if key == "title" {
			links = append(links, Link{Title: value, URL: "/", Description: "No description"})
			current++
			continue
		}
		if current < 0 {
			continue
		}
		switch key {
		case "link":
			if safeNavigationURL(value) {
				links[current].URL = value
			}
		case "image":
			if safeNavigationURL(value) || strings.HasPrefix(value, "/") {
				links[current].Image = value
			}
		case "description":
			links[current].Description = value
		}
	}
	for i := range links {
		if links[i].Image == "" && safeNavigationURL(links[i].URL) {
			links[i].Image = strings.TrimRight(links[i].URL, "/") + "/favicon.ico"
		}
	}
	return links
}

func plainDescription(value string) string {
	value = bluemonday.StrictPolicy().Sanitize(value)
	value = strings.Join(strings.Fields(value), " ")
	if len([]rune(value)) > 180 {
		return string([]rune(value)[:180]) + "…"
	}
	return value
}
