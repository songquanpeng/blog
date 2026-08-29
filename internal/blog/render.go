package blog

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html/template"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/microcosm-cc/bluemonday"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
)

func (a *App) baseView(c *gin.Context, title, description, canonicalPath string) (ViewData, error) {
	options, err := a.store.Options(c.Request.Context())
	if err != nil {
		return ViewData{}, err
	}
	siteName := option(options, "site_name", "Blog")
	if title == "" {
		title = option(options, "motto", "") + " | " + siteName
	} else if title != siteName {
		title += " | " + siteName
	}
	if description == "" {
		description = option(options, "description", "")
	}
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
	nonce, _ := c.Get("cspNonce")
	codeTheme := ""
	if uploadedCodeTheme(options["code_theme"]) != "" {
		codeTheme = "/code-theme.css"
	}
	data := ViewData{
		Lang: option(options, "language", "zh-CN"), Title: title, Description: description,
		Canonical: canonical, SiteURL: base, SiteName: siteName, Motto: options["motto"], Author: options["author"],
		Year: time.Now().Year(), Favicon: option(options, "favicon", "/favicon.ico"), BrandImage: options["brand_image"], CodeTheme: codeTheme,
		PrimaryNav: primaryNav, Nav: nav, Copyright: a.safeHTML(options["copyright"]),
		ExtraFooter: a.safeHTML(options["extra_footer_text"]), AllowUnsafe: a.cfg.AllowUnsafeHTML,
		Nonce: fmt.Sprint(nonce),
	}
	// The historical Bulma theme treated the special notice page as site
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

func (a *App) safeHTML(value string) template.HTML {
	if a.cfg.AllowUnsafeHTML {
		return template.HTML(value)
	}
	return template.HTML(bluemonday.UGCPolicy().Sanitize(value))
}

func stripFrontMatter(content string) string {
	lines := strings.Split(content, "\n")
	cut := 0
	for i := 1; i < len(lines); i++ {
		if strings.HasPrefix(lines[i], "---") {
			cut = i + 1
			break
		}
	}
	return strings.Join(lines[cut:], "\n")
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
	return a.safeHTML(rendered.String())
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
	a.render(c, status, data)
}

func articleJSONLD(data ViewData, page Page) template.JS {
	payload := map[string]any{
		"@context": "https://schema.org", "@type": "BlogPosting", "headline": page.Title,
		"description": page.Description, "datePublished": page.CreatedAt, "dateModified": page.UpdatedAt,
		"mainEntityOfPage": data.Canonical,
		"author":           map[string]string{"@type": "Person", "name": firstNonEmpty(page.Author, data.Author)},
		"publisher":        map[string]string{"@type": "Organization", "name": data.SiteName},
	}
	encoded, _ := json.Marshal(payload)
	return template.JS(encoded)
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
