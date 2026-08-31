package blog

import (
	"bytes"
	"encoding/json"
	"html/template"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestRootVerificationAssetsExposeOnlySafeTextFiles(t *testing.T) {
	indexDir := t.TempDir()
	for name, content := range map[string]string{
		"WW_verify_ybb0BCv891RgHPr7.txt": "verification-data",
		"robots.txt":                     "handled elsewhere",
		".secret.txt":                    "secret",
		"unsafe.html":                    "<script>alert(1)</script>",
	} {
		if err := os.WriteFile(filepath.Join(indexDir, name), []byte(content), 0o600); err != nil {
			t.Fatal(err)
		}
	}

	app := &App{cfg: Config{IndexPath: indexDir, DefaultIndexPath: indexDir}}
	assets := app.rootVerificationAssets()
	if len(assets) != 1 || assets[0] != "WW_verify_ybb0BCv891RgHPr7.txt" {
		t.Fatalf("verification assets = %#v", assets)
	}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	for _, filename := range assets {
		name := filename
		router.GET("/"+name, func(c *gin.Context) { app.serveKnownFile(c, app.indexFile(name), false) })
	}
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/WW_verify_ybb0BCv891RgHPr7.txt", nil)
	router.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusOK || recorder.Body.String() != "verification-data" || !strings.HasPrefix(recorder.Header().Get("Content-Type"), "text/plain") {
		t.Fatalf("verification response = %d %q %q", recorder.Code, recorder.Header().Get("Content-Type"), recorder.Body.String())
	}
}

func TestIndexFilePrefersBundledHistoricalFavicon(t *testing.T) {
	customDir := t.TempDir()
	bundledDir := t.TempDir()
	for _, file := range []struct {
		dir, name, content string
	}{
		{customDir, "favicon.ico", "justsong"},
		{bundledDir, "favicon.ico", "iamazing"},
		{customDir, "manifest.json", "custom manifest"},
		{bundledDir, "manifest.json", "bundled manifest"},
	} {
		if err := os.WriteFile(filepath.Join(file.dir, file.name), []byte(file.content), 0o600); err != nil {
			t.Fatal(err)
		}
	}

	app := &App{cfg: Config{IndexPath: customDir, DefaultIndexPath: bundledDir}}
	if got := app.indexFile("favicon.ico"); got != filepath.Join(bundledDir, "favicon.ico") {
		t.Fatalf("favicon path = %q", got)
	}
	if got := app.indexFile("manifest.json"); got != filepath.Join(customDir, "manifest.json") {
		t.Fatalf("manifest path = %q", got)
	}
}

func TestUploadedSVGIsRenderableWithIsolatedPolicy(t *testing.T) {
	uploadDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(uploadDir, "diagram.svg"), []byte(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>`), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(uploadDir, "not-an-image.svg"), []byte(`<html><script>alert(1)</script></html>`), 0o600); err != nil {
		t.Fatal(err)
	}

	gin.SetMode(gin.TestMode)
	app := &App{cfg: Config{UploadPath: uploadDir}}
	router := gin.New()
	router.GET("/upload/*filepath", app.uploadedAsset)

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/upload/diagram.svg", nil))
	if recorder.Code != http.StatusOK || !strings.HasPrefix(recorder.Header().Get("Content-Type"), "image/svg+xml") {
		t.Fatalf("SVG response = %d %q", recorder.Code, recorder.Header().Get("Content-Type"))
	}
	if disposition := recorder.Header().Get("Content-Disposition"); disposition != "" {
		t.Fatalf("SVG unexpectedly downloaded: %q", disposition)
	}
	if csp := recorder.Header().Get("Content-Security-Policy"); !strings.Contains(csp, "default-src 'none'") || !strings.Contains(csp, "sandbox") {
		t.Fatalf("SVG isolation policy = %q", csp)
	}

	recorder = httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/upload/not-an-image.svg", nil))
	if disposition := recorder.Header().Get("Content-Disposition"); !strings.HasPrefix(disposition, "attachment") {
		t.Fatalf("non-SVG payload disposition = %q", disposition)
	}
	if contentType := recorder.Header().Get("Content-Type"); contentType != "application/octet-stream" {
		t.Fatalf("non-SVG payload content type = %q", contentType)
	}
}

func TestRawPageRunsOnlyInsideOpaqueSandbox(t *testing.T) {
	store, err := openStore(filepath.Join(t.TempDir(), "data.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	page := Page{Type: PageRaw, Link: "tool", PageStatus: StatusPublished, CommentStatus: 1, Title: "Tool", Content: `<button onclick="run()">Run</button><script>function run(){}</script>`}
	if err := store.CreatePage(t.Context(), &page); err != nil {
		t.Fatal(err)
	}
	if err := store.UpdateOptions(t.Context(), map[string]any{"theme": "studio"}); err != nil {
		t.Fatal(err)
	}

	gin.SetMode(gin.TestMode)
	app := &App{store: store, cfg: Config{UploadPath: t.TempDir()}}
	router := gin.New()
	router.GET("/raw/:link", app.rawPageContent)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/raw/tool", nil)
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), `<script>function run(){}</script>`) {
		t.Fatalf("raw page response = %d %s", recorder.Code, recorder.Body.String())
	}
	if body := recorder.Body.String(); !strings.Contains(body, `type==="blog-theme"`) || !strings.Contains(body, `type:"blog-raw-ready"`) {
		t.Fatalf("raw page does not synchronize its theme: %s", body)
	}
	if body := recorder.Body.String(); !strings.Contains(body, `data-site-theme="studio"`) || !strings.Contains(body, `/theme/studio/main.css`) {
		t.Fatalf("raw page does not use the selected public theme: %s", body)
	}
	csp := recorder.Header().Get("Content-Security-Policy")
	if !strings.Contains(csp, "sandbox allow-scripts") || strings.Contains(csp, "allow-same-origin") {
		t.Fatalf("raw page CSP does not enforce opaque sandbox: %q", csp)
	}
	if robots := recorder.Header().Get("X-Robots-Tag"); robots != "noindex, nofollow, nosnippet" {
		t.Fatalf("raw page X-Robots-Tag = %q", robots)
	}
}

func TestResponsiveHTMLDocumentAddsCompatibilityHead(t *testing.T) {
	original := `<html><head><title>Legacy tool</title></head><body><input style="width:100%"></body></html>`
	result := responsiveHTMLDocument(original)
	for _, expected := range []string{
		`<meta name="viewport" content="width=device-width,initial-scale=1">`,
		`<style id="blog-responsive-compat">`,
		`<title>Legacy tool</title>`,
	} {
		if !strings.Contains(result, expected) {
			t.Errorf("responsive HTML is missing %q: %s", expected, result)
		}
	}
	if strings.Index(result, `blog-responsive-compat`) > strings.Index(result, `</head>`) {
		t.Fatalf("compatibility head was inserted outside <head>: %s", result)
	}

	withViewport := responsiveHTMLDocument(`<html><head><meta name='viewport' content='width=640'></head></html>`)
	if strings.Count(withViewport, "name='viewport'")+strings.Count(withViewport, `name="viewport"`) != 1 {
		t.Fatalf("existing viewport was duplicated: %s", withViewport)
	}
}

func TestHiddenPagePreservesLegacySearchIndexability(t *testing.T) {
	store, err := openStore(filepath.Join(t.TempDir(), "data.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	page := Page{Type: PageArticle, Link: "hidden", PageStatus: StatusHidden, CommentStatus: 1, Title: "Hidden", Content: "content"}
	if err := store.CreatePage(t.Context(), &page); err != nil {
		t.Fatal(err)
	}
	templates := template.Must(template.New("layout.gohtml").Parse(`{{define "layout.gohtml"}}ok{{end}}`))
	gin.SetMode(gin.TestMode)
	app := &App{store: store, templates: templates, cfg: Config{PublicURL: "https://blog.example"}}
	router := gin.New()
	router.GET("/page/:link", app.page)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/page/hidden", nil)
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("hidden page response = %d %s", recorder.Code, recorder.Body.String())
	}
	if robots := recorder.Header().Get("X-Robots-Tag"); robots != "" {
		t.Fatalf("legacy hidden page unexpectedly blocks indexing: %q", robots)
	}
}

func TestPublicPageEmitsCompleteSEOMetadata(t *testing.T) {
	store, err := openStore(filepath.Join(t.TempDir(), "data.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	if err := store.UpdateOptions(t.Context(), map[string]any{
		"site_name": "Example Notes", "description": "A small independent publication.",
		"author": "Example Author", "language": "zh-CN", "social_image": "/icon512.png", "theme": "studio",
	}); err != nil {
		t.Fatal(err)
	}
	page := Page{Type: PageArticle, Link: "search-ready", PageStatus: StatusPublished, CommentStatus: 1,
		Title: "Search Ready", Description: "A useful page description.", Tag: "SEO;Go", Content: "## Useful section\n\nContent."}
	if err := store.CreatePage(t.Context(), &page); err != nil {
		t.Fatal(err)
	}
	related := Page{Type: PageArticle, Link: "related-guide", PageStatus: StatusPublished, CommentStatus: 1,
		Title: "Related Guide", Description: "Another article in the category.", Tag: "SEO;Testing", Content: "Related content."}
	if err := store.CreatePage(t.Context(), &related); err != nil {
		t.Fatal(err)
	}

	functions := template.FuncMap{
		"date": shortDate, "dateTime": displayDateTime, "archiveURL": archiveURL, "splitTags": splitTags,
		"pathEscape": url.PathEscape, "add": func(a, b int) int { return a + b },
	}
	templates := template.Must(template.New("layout.gohtml").Funcs(functions).ParseGlob(filepath.Join("..", "..", "templates", "*.gohtml")))
	gin.SetMode(gin.TestMode)
	app := &App{store: store, templates: templates, cfg: Config{PublicURL: "https://blog.example"}}
	router := gin.New()
	router.GET("/page/:link", app.page)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/page/search-ready", nil)
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("page response = %d %s", recorder.Code, recorder.Body.String())
	}
	body := recorder.Body.String()
	for _, expected := range []string{
		"<title>Search Ready — Example Notes</title>",
		`<link rel="canonical" href="https://blog.example/page/search-ready">`,
		`<meta property="og:locale" content="zh_CN">`,
		`<meta property="article:tag" content="SEO">`,
		`<meta name="twitter:card" content="summary_large_image">`,
		`"@type":"BreadcrumbList"`,
		`"@type":"BlogPosting"`,
		`data-theme-toggle`,
		`class="navbar-end"`,
		`theme-toggle-mobile`,
		`theme-toggle-desktop`,
		`data-site-theme="studio"`,
		`href="/theme/studio/main.css?v=studio-nav-chevron-20260901"`,
		`href="/page/related-guide">Related Guide</a>`,
	} {
		if !strings.Contains(body, expected) {
			t.Errorf("page is missing SEO output %q", expected)
		}
	}
}

func TestIndexRendersPersonalProfileSidebar(t *testing.T) {
	store, err := openStore(filepath.Join(t.TempDir(), "data.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	if err := store.UpdateOptions(t.Context(), map[string]any{
		"site_name": "Example Notes", "author": "Fallback Author", "description": "Fallback description",
		"profile_name": "Song", "profile_bio": "Writing about software and quiet ideas.", "profile_avatar": "/upload/avatar.webp",
		"social_x_url": "https://x.com/song", "social_github_url": "https://github.com/song",
		"social_zhihu_url": "https://www.zhihu.com/people/song", "social_bilibili_url": "https://space.bilibili.com/123",
		"social_custom_links": "个人主页 | https://example.com\nBad | javascript:alert(1)",
		"wechat_name":         "Song's Notes", "wechat_qr": "/upload/wechat.webp",
	}); err != nil {
		t.Fatal(err)
	}
	notice := Page{Type: PageArticle, Link: "notice", PageStatus: StatusRecalled, CommentStatus: 1, Title: "Legacy sidebar", Content: "REMOVED_GITHUB_STATS"}
	if err := store.CreatePage(t.Context(), &notice); err != nil {
		t.Fatal(err)
	}

	functions := template.FuncMap{
		"date": shortDate, "dateTime": displayDateTime, "archiveURL": archiveURL, "splitTags": splitTags,
		"pathEscape": url.PathEscape, "add": func(a, b int) int { return a + b },
	}
	templates := template.Must(template.New("layout.gohtml").Funcs(functions).ParseGlob(filepath.Join("..", "..", "templates", "*.gohtml")))
	gin.SetMode(gin.TestMode)
	app := &App{store: store, templates: templates, cfg: Config{PublicURL: "https://blog.example"}}
	router := gin.New()
	router.GET("/", app.index)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("index response = %d %s", recorder.Code, recorder.Body.String())
	}
	body := recorder.Body.String()
	for _, expected := range []string{
		`class="card profile-card"`, `id="profile-name" class="profile-name">Song</h2>`,
		`Writing about software and quiet ideas.`, `src="https://blog.example/upload/avatar.webp"`,
		`class="profile-social"`, `class="profile-wechat"`, `href="https://x.com/song"`,
		`href="https://github.com/song"`, `href="https://www.zhihu.com/people/song"`,
		`href="https://space.bilibili.com/123"`, `src="https://blog.example/upload/wechat.webp"`,
		`aria-label="访问 Song 的 B 站"><svg`, `</svg><span>B 站</span></a>`, `href="https://example.com"`,
	} {
		if !strings.Contains(body, expected) {
			t.Errorf("index is missing profile output %q", expected)
		}
	}
	for _, removed := range []string{"javascript:alert", "REMOVED_GITHUB_STATS"} {
		if strings.Contains(body, removed) {
			t.Errorf("index still renders removed profile content %q", removed)
		}
	}
}

func TestProtectedRawPageReturnsVerbatimSandboxPayload(t *testing.T) {
	store, err := openStore(filepath.Join(t.TempDir(), "data.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	page := Page{Type: PageRaw, Link: "private-tool", PageStatus: StatusPublished, CommentStatus: 1,
		Title: "Private Tool", Password: "secret", Content: `<button onclick="run()">Run</button><script>function run(){}</script>`}
	if err := store.CreatePage(t.Context(), &page); err != nil {
		t.Fatal(err)
	}
	gin.SetMode(gin.TestMode)
	app := &App{store: store}
	router := gin.New()
	router.POST("/api/page/render/:id", app.renderedPage)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/page/render/"+page.ID, strings.NewReader(`{"password":"secret"}`))
	request.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("raw response = %d %s", recorder.Code, recorder.Body.String())
	}
	var payload struct {
		Raw     bool   `json:"raw"`
		Content string `json:"content"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if !payload.Raw || payload.Content != page.Content {
		t.Fatalf("raw payload was changed: %#v", payload)
	}
}

func TestRobotsAddsSitemapToCustomRules(t *testing.T) {
	store, err := openStore(filepath.Join(t.TempDir(), "data.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	indexDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(indexDir, "robots.txt"), []byte("User-agent: *\nDisallow: /admin/\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	gin.SetMode(gin.TestMode)
	app := &App{store: store, cfg: Config{IndexPath: indexDir, PublicURL: "https://blog.example"}}
	router := gin.New()
	router.GET("/robots.txt", app.robots)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/robots.txt", nil))
	if body := recorder.Body.String(); !strings.Contains(body, "Disallow: /admin/") || !strings.Contains(body, "Sitemap: https://blog.example/sitemap.xml") {
		t.Fatalf("robots response = %q", body)
	}
}

func TestAdminCRUDAndUploadWorkflow(t *testing.T) {
	dataDir := t.TempDir()
	store, err := openStore(filepath.Join(dataDir, "data.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	sessions := newSessionStore([]byte("0123456789abcdef0123456789abcdef"), time.Hour)
	app := &App{store: store, sessions: sessions, cfg: Config{UploadPath: dataDir, MaxUploadBytes: 1 << 20}}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	api := router.Group("/api")
	admin := api.Group("")
	admin.Use(app.adminRequired())
	admin.POST("/page", app.createPage)
	admin.POST("/page/preview", app.previewPage)
	admin.GET("/page/:id", app.getPage)
	admin.PUT("/page", app.updatePage)
	admin.DELETE("/page/:id", app.deletePage)
	admin.PUT("/option", app.updateOptions)
	admin.POST("/file", app.uploadFile)
	admin.GET("/file/:id", app.getFile)
	admin.DELETE("/file/:id", app.deleteFile)

	token := strings.Repeat("a", 43)
	sessions.sessions[token] = &session{User: &GitHubUser{ID: 1, Login: "owner", IsAdmin: true}, ExpiresAt: time.Now().Add(time.Hour)}
	cookie := &http.Cookie{Name: sessionCookie, Value: token + "." + sessions.sign(token), Path: "/"}
	do := func(method, target, contentType string, body *bytes.Buffer, authenticated bool) *httptest.ResponseRecorder {
		t.Helper()
		var requestBody io.Reader
		if body != nil {
			requestBody = body
		}
		request := httptest.NewRequest(method, target, requestBody)
		if contentType != "" {
			request.Header.Set("Content-Type", contentType)
		}
		if authenticated {
			request.AddCookie(cookie)
		}
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, request)
		return recorder
	}

	createBody := bytes.NewBufferString(`{"title":"Regression","link":"regression","content":"# ok","tag":"test","pageStatus":1,"commentStatus":1}`)
	createRecorder := do(http.MethodPost, "/api/page", "application/json", createBody, true)
	if createRecorder.Code != http.StatusOK {
		t.Fatalf("create page = %d %s", createRecorder.Code, createRecorder.Body.String())
	}
	var created struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(createRecorder.Body.Bytes(), &created); err != nil || created.ID == "" {
		t.Fatalf("create response = %s, %v", createRecorder.Body.String(), err)
	}
	preview := do(http.MethodPost, "/api/page/preview", "application/json", bytes.NewBufferString(`{"type":0,"content":"## Draft\n\n`+"```go\\nfmt.Println(1)\\n```"+`"}`), true)
	var previewed struct {
		Content string `json:"content"`
	}
	if err := json.Unmarshal(preview.Body.Bytes(), &previewed); preview.Code != http.StatusOK || err != nil || !strings.Contains(previewed.Content, "<h2") || !strings.Contains(previewed.Content, "<pre") {
		t.Fatalf("preview page = %d %s", preview.Code, preview.Body.String())
	}
	legacyRequest := httptest.NewRequest(http.MethodPost, "/api/page", strings.NewReader(`{"title":"Blocked","link":"blocked","content":"x","pageStatus":1,"commentStatus":1}`))
	legacyRequest.Header.Set("Content-Type", "application/json")
	legacyRequest.Header.Set("Authorization", "Bearer publisher-token")
	legacyRecorder := httptest.NewRecorder()
	router.ServeHTTP(legacyRecorder, legacyRequest)
	if legacyRecorder.Code != http.StatusUnauthorized {
		t.Fatalf("legacy publishing token unexpectedly accepted = %d %s", legacyRecorder.Code, legacyRecorder.Body.String())
	}

	if recorder := do(http.MethodGet, "/api/page/"+created.ID, "", nil, true); recorder.Code != http.StatusOK {
		t.Fatalf("get page = %d %s", recorder.Code, recorder.Body.String())
	}
	update := bytes.NewBufferString(`{"id":"` + created.ID + `","title":"Updated","link":"regression","content":"# updated","pageStatus":1,"commentStatus":1}`)
	if recorder := do(http.MethodPut, "/api/page", "application/json", update, true); recorder.Code != http.StatusOK {
		t.Fatalf("update page = %d %s", recorder.Code, recorder.Body.String())
	}
	if recorder := do(http.MethodPut, "/api/option", "application/json", bytes.NewBufferString(`{"theme":"bootstrap5"}`), true); recorder.Code != http.StatusBadRequest {
		t.Fatalf("invalid theme unexpectedly accepted = %d %s", recorder.Code, recorder.Body.String())
	}
	if recorder := do(http.MethodPut, "/api/option", "application/json", bytes.NewBufferString(`{"theme":"studio","site_name":"Regression"}`), true); recorder.Code != http.StatusOK {
		t.Fatalf("update options = %d %s", recorder.Code, recorder.Body.String())
	}
	validNavigation := `{"nav_links":"[{\"key\":\"主导航\",\"value\":[{\"text\":\"首页\",\"link\":\"/\"}]}]"}`
	if recorder := do(http.MethodPut, "/api/option", "application/json", bytes.NewBufferString(validNavigation), true); recorder.Code != http.StatusOK {
		t.Fatalf("update navigation = %d %s", recorder.Code, recorder.Body.String())
	}
	invalidNavigation := `{"nav_links":"[{\"key\":\"主导航\",\"value\":[{\"text\":\"危险链接\",\"link\":\"javascript:alert(1)\"}]}]"}`
	if recorder := do(http.MethodPut, "/api/option", "application/json", bytes.NewBufferString(invalidNavigation), true); recorder.Code != http.StatusBadRequest {
		t.Fatalf("invalid navigation unexpectedly accepted = %d %s", recorder.Code, recorder.Body.String())
	}
	options, _ := store.Options(t.Context())
	if options["theme"] != "studio" || options["site_name"] != "Regression" || !strings.Contains(options["nav_links"], "主导航") {
		t.Fatalf("updated options = %#v", options)
	}

	var upload bytes.Buffer
	writer := multipart.NewWriter(&upload)
	part, err := writer.CreateFormFile("file", "regression.txt")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = part.Write([]byte("safe upload"))
	_ = writer.WriteField("description", "test")
	_ = writer.Close()
	uploadRecorder := do(http.MethodPost, "/api/file", writer.FormDataContentType(), &upload, true)
	if uploadRecorder.Code != http.StatusOK {
		t.Fatalf("upload = %d %s", uploadRecorder.Code, uploadRecorder.Body.String())
	}
	var uploaded struct {
		File StoredFile `json:"file"`
	}
	if err := json.Unmarshal(uploadRecorder.Body.Bytes(), &uploaded); err != nil || uploaded.File.ID == "" {
		t.Fatalf("upload response = %s, %v", uploadRecorder.Body.String(), err)
	}
	if recorder := do(http.MethodDelete, "/api/file/"+uploaded.File.ID, "", nil, true); recorder.Code != http.StatusOK {
		t.Fatalf("delete file = %d %s", recorder.Code, recorder.Body.String())
	}
	if recorder := do(http.MethodDelete, "/api/page/"+created.ID, "", nil, true); recorder.Code != http.StatusOK {
		t.Fatalf("delete page = %d %s", recorder.Code, recorder.Body.String())
	}
	if recorder := do(http.MethodGet, "/api/page/missing", "", nil, false); recorder.Code != http.StatusUnauthorized {
		t.Fatalf("unauthenticated admin request = %d", recorder.Code)
	}
}
