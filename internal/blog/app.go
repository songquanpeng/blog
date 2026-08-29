package blog

import (
	"context"
	"errors"
	"fmt"
	"html/template"
	"log"
	"mime"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
)

type App struct {
	cfg         Config
	store       *Store
	router      *gin.Engine
	templates   *template.Template
	sessions    *sessionStore
	httpClient  *http.Client
	cliDistPath string
}

func New() (*App, error) {
	cfg, err := loadConfig()
	if err != nil {
		return nil, err
	}
	store, err := openStore(cfg.DatabasePath)
	if err != nil {
		return nil, err
	}
	templates, err := template.New("layout.gohtml").Funcs(template.FuncMap{
		"date":       shortDate,
		"dateTime":   displayDateTime,
		"archiveURL": archiveURL,
		"splitTags":  splitTags,
		"pathEscape": url.PathEscape,
		"add":        func(a, b int) int { return a + b },
	}).ParseGlob(cfg.TemplateGlob)
	if err != nil {
		store.Close()
		return nil, fmt.Errorf("parse templates: %w", err)
	}
	app := &App{
		cfg: cfg, store: store, templates: templates,
		sessions:    newSessionStore(cfg.SessionSecret, cfg.SessionTTL),
		httpClient:  &http.Client{Timeout: 12 * time.Second},
		cliDistPath: env("CLI_DIST_PATH", "./dist/cli"),
	}
	app.router = app.routes()
	return app, nil
}

func (a *App) Close() error { return a.store.Close() }

func (a *App) Run() error {
	server := &http.Server{
		Addr:              ":" + a.cfg.Port,
		Handler:           a.router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       90 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}
	errCh := make(chan error, 1)
	go func() {
		log.Printf("Blog listening on :%s", a.cfg.Port)
		errCh <- server.ListenAndServe()
	}()
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	select {
	case err := <-errCh:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	case <-stop:
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return server.Shutdown(ctx)
}

func (a *App) routes() *gin.Engine {
	gin.SetMode(env("GIN_MODE", gin.ReleaseMode))
	router := gin.New()
	router.Use(a.requestLogger(), gin.Recovery(), a.securityHeaders(), a.limitBody())
	if err := router.SetTrustedProxies(a.cfg.TrustedProxies); err != nil {
		panic(err)
	}

	router.GET("/auth/github", a.githubLogin)
	router.GET("/auth/github/callback", a.githubCallback)
	router.GET("/auth/logout", a.logout)
	router.GET("/cli/download/:artifact", a.cliDownload)
	router.GET("/cli/install.sh", a.cliInstaller)

	router.GET("/", a.index)
	router.GET("/archive", a.archive)
	router.GET("/archive/:year/:month", a.monthArchive)
	router.GET("/tag/:tag", a.tag)
	router.GET("/raw/:link", a.rawPageContent)
	router.GET("/page/:link", a.page)
	router.GET("/sitemap.xml", a.sitemap)
	router.GET("/feed.xml", a.feed)
	router.GET("/robots.txt", a.robots)
	router.GET("/code-theme.css", a.codeThemeAsset)
	router.GET("/static/*filepath", a.staticFile(filepath.Join("themes", "bulma", "static")))
	router.GET("/upload/*filepath", a.uploadedAsset)
	for _, filename := range []string{"favicon.ico", "manifest.json", "icon192.png", "icon512.png"} {
		name := filename
		router.GET("/"+name, func(c *gin.Context) { a.serveKnownFile(c, a.indexFile(name), false) })
	}
	for _, filename := range a.rootVerificationAssets() {
		name := filename
		router.GET("/"+name, func(c *gin.Context) { a.serveKnownFile(c, a.indexFile(name), false) })
	}

	api := router.Group("/api")
	{
		api.GET("/user/status", a.userStatus)
		api.GET("/user/logout", a.logoutJSON)
		api.POST("/user/login", a.legacyLoginGone)
		api.GET("/page/render/:id", a.renderedPage)
		api.POST("/page/render/:id", a.renderedPage)
		api.GET("/cli/info", a.cliInfo)
		api.POST("/cli/device/code", a.createDeviceCode)
		api.POST("/cli/device/token", a.exchangeDeviceCode)
		api.GET("/cli/me", a.cliRequired(), a.cliIdentity)
		api.DELETE("/cli/token", a.cliRequired(), a.revokeCurrentCLIToken)

		admin := api.Group("")
		admin.Use(a.adminRequired())
		admin.POST("/page/search", a.searchPages)
		admin.POST("/page", a.createPage)
		admin.GET("/page", a.allPages)
		admin.GET("/page/export/:id", a.exportPage)
		admin.GET("/page/:id", a.getPage)
		admin.PUT("/page", a.updatePage)
		admin.PUT("/page/", a.updatePage)
		admin.DELETE("/page/:id", a.deletePage)
		admin.GET("/option", a.getOptions)
		admin.GET("/option/", a.getOptions)
		admin.PUT("/option", a.updateOptions)
		admin.PUT("/option/", a.updateOptions)
		admin.POST("/option/shutdown", a.shutdown)
		admin.GET("/option/:name", a.getOption)
		admin.GET("/file", a.getFiles)
		admin.GET("/file/", a.getFiles)
		admin.GET("/file/:id", a.getFile)
		admin.POST("/file", a.uploadFile)
		admin.POST("/file/", a.uploadFile)
		admin.POST("/file/search", a.searchFiles)
		admin.DELETE("/file/:id", a.deleteFile)
		admin.GET("/cli/device/:code", a.deviceCodeStatus)
		admin.POST("/cli/device/approve", a.approveDeviceCode)
		admin.POST("/cli/device/deny", a.denyDeviceCode)
		admin.GET("/cli/tokens", a.listCLITokens)
		admin.DELETE("/cli/tokens/:id", a.revokeCLIToken)
		admin.GET("/microblog", a.microblogAdmin)
		admin.POST("/microblog/search", a.searchMicroPosts)
		admin.POST("/microblog", a.createMicroPost)
		admin.PUT("/microblog/config", a.updateMicroblogConfig)
		admin.GET("/microblog/:id", a.getMicroPost)
		admin.PUT("/microblog/:id", a.updateMicroPost)
		admin.DELETE("/microblog/:id", a.deleteMicroPost)
	}

	router.GET("/admin", func(c *gin.Context) { c.Redirect(http.StatusMovedPermanently, "/admin/") })
	router.GET("/admin/*filepath", a.adminFile)
	router.NoRoute(func(c *gin.Context) {
		if a.tryMicroblog(c) {
			return
		}
		a.renderError(c, http.StatusNotFound, "未找到目标页面", "所请求的页面不存在，请检查页面链接是否正确")
	})
	return router
}

func (a *App) requestLogger() gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		// Query strings are intentionally excluded: OAuth codes and legacy
		// password-protected page URLs can contain credentials.
		return fmt.Sprintf("%s | %3d | %13v | %15s | %-7s %s\n",
			param.TimeStamp.Format(time.RFC3339), param.StatusCode, param.Latency,
			param.ClientIP, param.Method, param.Request.URL.Path)
	})
}

func (a *App) indexFile(name string) string {
	custom := filepath.Join(a.cfg.IndexPath, name)
	if info, err := os.Stat(custom); err == nil && !info.IsDir() {
		return custom
	}
	return filepath.Join(a.cfg.DefaultIndexPath, name)
}

// rootVerificationAssets preserves historical webmaster verification files
// without turning the data/index directory into an executable same-origin
// document root. Only regular, plainly named text files are exposed.
func (a *App) rootVerificationAssets() []string {
	seen := make(map[string]struct{})
	var names []string
	for _, dir := range []string{a.cfg.DefaultIndexPath, a.cfg.IndexPath} {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, entry := range entries {
			name := entry.Name()
			if _, ok := seen[name]; ok || !safeRootVerificationName(name) {
				continue
			}
			info, err := entry.Info()
			if err != nil || !info.Mode().IsRegular() {
				continue
			}
			seen[name] = struct{}{}
			names = append(names, name)
		}
	}
	return names
}

func safeRootVerificationName(name string) bool {
	if len(name) == 0 || len(name) > 128 || name == "robots.txt" || filepath.Ext(name) != ".txt" || name[0] == '.' {
		return false
	}
	for _, char := range name {
		if (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9') || char == '-' || char == '_' || char == '.' {
			continue
		}
		return false
	}
	return true
}

func (a *App) securityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		if strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https") && a.isTrustedProxyRequest(c.Request.RemoteAddr) {
			c.Set("trustedForwardedHTTPS", true)
		}
		h := c.Writer.Header()
		nonce, _ := randomToken(18)
		c.Set("cspNonce", nonce)
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
		h.Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'nonce-"+nonce+"'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https://github.com")
		if requestSecure(c) {
			h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		c.Next()
	}
}

func (a *App) isTrustedProxyRequest(remote string) bool {
	host, _, err := net.SplitHostPort(remote)
	if err != nil {
		host = remote
	}
	ip := net.ParseIP(host)
	if ip == nil {
		return false
	}
	if ip.IsLoopback() {
		return true
	}
	for _, configured := range a.cfg.TrustedProxies {
		if trustedIP := net.ParseIP(configured); trustedIP != nil && trustedIP.Equal(ip) {
			return true
		}
		if _, network, err := net.ParseCIDR(configured); err == nil && network.Contains(ip) {
			return true
		}
	}
	return false
}

func (a *App) limitBody() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead && !strings.HasPrefix(c.Request.URL.Path, "/api/file") {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 10<<20)
		}
		c.Next()
	}
}

func (a *App) adminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		if info, ok := a.authenticateCLIToken(c); ok {
			c.Set("cliToken", info)
			c.Set("githubUser", GitHubUser{ID: info.GitHubUserID, Login: info.GitHubLogin, IsAdmin: true})
			c.Next()
			return
		}
		if err := validateSameOrigin(c); err != nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"status": false, "message": err.Error()})
			return
		}
		_, entry, ok := a.sessions.get(c)
		if !ok || entry.User == nil || !entry.User.IsAdmin {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"status": false, "message": "请使用 GitHub 登录"})
			return
		}
		c.Set("githubUser", *entry.User)
		c.Next()
	}
}

func validateSameOrigin(c *gin.Context) error {
	if c.Request.Method == http.MethodGet || c.Request.Method == http.MethodHead || c.Request.Method == http.MethodOptions {
		return nil
	}
	if strings.EqualFold(c.GetHeader("Sec-Fetch-Site"), "cross-site") {
		return errors.New("拒绝跨站请求")
	}
	origin := strings.TrimSpace(c.GetHeader("Origin"))
	if origin == "" {
		return nil
	}
	parsed, err := url.Parse(origin)
	if err != nil || !strings.EqualFold(parsed.Host, c.Request.Host) {
		return errors.New("Origin 校验失败")
	}
	return nil
}

func (a *App) staticFile(root string) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := strings.TrimPrefix(c.Param("filepath"), "/")
		if name == "" || strings.Contains(name, "\x00") {
			c.Status(http.StatusNotFound)
			return
		}
		clean := filepath.Clean(name)
		if clean == "." || strings.HasPrefix(clean, "..") || filepath.IsAbs(clean) {
			c.Status(http.StatusNotFound)
			return
		}
		candidate := filepath.Join(root, clean)
		if !containedPath(root, candidate) {
			c.Status(http.StatusNotFound)
			return
		}
		cache := clean != "main.css" && clean != "main.js"
		if !cache {
			c.Header("Cache-Control", "no-cache")
		}
		a.serveKnownFile(c, candidate, cache)
	}
}

func uploadedCodeTheme(value string) string {
	value = strings.TrimSpace(value)
	if !strings.HasPrefix(value, "/upload/") {
		return ""
	}
	name := strings.TrimPrefix(value, "/upload/")
	if name == "" || filepath.Base(name) != name || !strings.EqualFold(filepath.Ext(name), ".css") {
		return ""
	}
	return name
}

func (a *App) codeThemeAsset(c *gin.Context) {
	options, err := a.store.Options(c.Request.Context())
	if err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	name := uploadedCodeTheme(options["code_theme"])
	if name == "" {
		c.Status(http.StatusNotFound)
		return
	}
	target := filepath.Join(a.cfg.UploadPath, name)
	if !containedPath(a.cfg.UploadPath, target) {
		c.Status(http.StatusNotFound)
		return
	}
	c.Header("Content-Type", "text/css; charset=utf-8")
	c.Header("Cache-Control", "no-cache")
	c.File(target)
}

func containedPath(root, candidate string) bool {
	realRoot, err := filepath.EvalSymlinks(root)
	if err != nil {
		return false
	}
	realCandidate, err := filepath.EvalSymlinks(candidate)
	if err != nil {
		return false
	}
	relative, err := filepath.Rel(realRoot, realCandidate)
	return err == nil && relative != ".." && !strings.HasPrefix(relative, ".."+string(filepath.Separator))
}

func (a *App) uploadedAsset(c *gin.Context) {
	name := strings.TrimPrefix(c.Param("filepath"), "/")
	clean := filepath.Clean(name)
	if clean == "." || filepath.Base(clean) != clean {
		c.Status(http.StatusNotFound)
		return
	}
	target := filepath.Join(a.cfg.UploadPath, clean)
	if !containedPath(a.cfg.UploadPath, target) {
		c.Status(http.StatusNotFound)
		return
	}
	file, err := os.Open(target)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	buffer := make([]byte, 512)
	read, _ := file.Read(buffer)
	_ = file.Close()
	contentType := http.DetectContentType(buffer[:read])
	safeInline := contentType == "image/png" || contentType == "image/jpeg" || contentType == "image/gif" || contentType == "image/webp" || contentType == "image/avif"
	if safeInline {
		c.Header("Content-Type", contentType)
		c.Header("Cache-Control", "public, max-age=2592000")
	} else {
		c.Header("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": clean}))
		c.Header("Content-Type", "application/octet-stream")
	}
	c.File(target)
}

func (a *App) serveKnownFile(c *gin.Context, name string, cache bool) {
	info, err := os.Stat(name)
	if err != nil || info.IsDir() {
		c.Status(http.StatusNotFound)
		return
	}
	if cache {
		c.Header("Cache-Control", "public, max-age=2592000, immutable")
	}
	c.File(name)
}

func (a *App) adminFile(c *gin.Context) {
	name := strings.TrimPrefix(c.Param("filepath"), "/")
	if name != "" {
		clean := filepath.Clean(name)
		if !strings.HasPrefix(clean, "..") && !filepath.IsAbs(clean) {
			candidate := filepath.Join(a.cfg.AdminPath, clean)
			if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
				if strings.Contains(clean, "assets/") {
					c.Header("Cache-Control", "public, max-age=31536000, immutable")
				}
				c.File(candidate)
				return
			}
		}
	}
	index := filepath.Join(a.cfg.AdminPath, "index.html")
	if _, err := os.Stat(index); err != nil {
		c.String(http.StatusServiceUnavailable, "管理后台尚未构建，请运行 npm run build")
		return
	}
	c.Header("Cache-Control", "no-store")
	c.File(index)
}

func shortDate(value string) string {
	if len(value) >= 10 {
		return value[:10]
	}
	return value
}

func archiveURL(value string) string {
	value = shortDate(value)
	if len(value) >= 7 && value[4] == '-' {
		return "/archive/" + value[:4] + "/" + value[5:7]
	}
	return "/archive"
}

func displayDateTime(value string) string {
	if parsed, err := time.Parse(time.RFC3339, value); err == nil {
		return parsed.In(time.Local).Format("2006-01-02 15:04:05")
	}
	value = strings.Replace(value, "T", " ", 1)
	if len(value) >= 19 {
		return value[:19]
	}
	return value
}

func splitTags(value string) []string {
	parts := strings.Split(value, ";")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if part = strings.TrimSpace(part); part != "" {
			result = append(result, part)
		}
	}
	return result
}
