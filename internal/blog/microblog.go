package blog

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"unicode"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const microblogPageSize = 12

type microblogConfig struct {
	Enabled     bool   `json:"enabled"`
	Path        string `json:"path"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

type publicMicroPost struct {
	ID           uint64 `json:"id"`
	HTML         string `json:"html"`
	CreatedAt    string `json:"createdAt"`
	CreatedLabel string `json:"createdLabel"`
	Accent       int    `json:"accent"`
}

func microblogAccent(content string) int {
	for _, char := range strings.TrimSpace(content) {
		return int(char) % 9
	}
	return 0
}

func (a *App) renderPublicMicroPosts(posts []MicroPost) []publicMicroPost {
	items := make([]publicMicroPost, 0, len(posts))
	for i := range posts {
		posts[i].Rendered = a.renderContent(Page{Type: PageArticle, Content: posts[i].Content})
		items = append(items, publicMicroPost{
			ID: posts[i].ID, HTML: string(posts[i].Rendered),
			CreatedAt: posts[i].CreatedAt, CreatedLabel: displayDateTime(posts[i].CreatedAt),
			Accent: posts[i].Accent,
		})
	}
	return items
}

func currentMicroblogConfig(options map[string]string) microblogConfig {
	enabled, err := strconv.ParseBool(strings.TrimSpace(options["microblog_enabled"]))
	if err != nil {
		enabled = true
	}
	path := strings.Trim(strings.TrimSpace(options["microblog_path"]), "/")
	if validateMicroblogPath(path) != nil {
		path = "microblog"
	}
	return microblogConfig{
		Enabled: enabled, Path: path,
		Title:       option(options, "microblog_title", "片语"),
		Description: option(options, "microblog_description", "随手记下的想法与日常。"),
	}
}

func validateMicroblogPath(path string) error {
	path = strings.Trim(strings.TrimSpace(path), "/")
	if path == "" || len(path) > 120 || strings.Contains(path, "//") {
		return fmt.Errorf("访问路径为空、过长或格式无效")
	}
	reserved := map[string]bool{
		"admin": true, "api": true, "archive": true, "auth": true, "cli": true,
		"page": true, "raw": true, "static": true, "tag": true, "upload": true,
	}
	parts := strings.Split(path, "/")
	if reserved[strings.ToLower(parts[0])] {
		return fmt.Errorf("访问路径与系统路径冲突")
	}
	for _, part := range parts {
		if part == "" || part == "." || part == ".." {
			return fmt.Errorf("访问路径格式无效")
		}
		for _, char := range part {
			if unicode.IsLetter(char) || unicode.IsDigit(char) || char == '-' || char == '_' {
				continue
			}
			return fmt.Errorf("访问路径只能包含字母、数字、短横线、下划线和斜杠")
		}
	}
	return nil
}

func validateMicroPost(post MicroPost) error {
	post.Content = strings.TrimSpace(post.Content)
	if post.Content == "" {
		return fmt.Errorf("内容不能为空")
	}
	if len(post.Content) > 64<<10 {
		return fmt.Errorf("内容不能超过 64 KiB")
	}
	if post.Status != MicroPostPrivate && post.Status != MicroPostPublic {
		return fmt.Errorf("发布状态无效")
	}
	return nil
}

func microblogOffset(c *gin.Context) int {
	offset, err := strconv.Atoi(c.Query("offset"))
	if err != nil || offset < 0 || offset > 10_000_000 {
		return 0
	}
	return offset
}

func microblogLimit(c *gin.Context) int {
	limit, err := strconv.Atoi(c.Query("limit"))
	if err != nil || limit < 1 || limit > 500 {
		return 100
	}
	return limit
}

func (a *App) microblogAdmin(c *gin.Context) {
	posts, total, err := a.store.MicroPosts(c.Request.Context(), false, microblogOffset(c), microblogLimit(c))
	if err != nil {
		a.apiFailure(c, "读取微博客失败", err)
		return
	}
	options, err := a.store.Options(c.Request.Context())
	if err != nil {
		a.apiFailure(c, "读取微博客设置失败", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "ok", "posts": posts, "total": total, "config": currentMicroblogConfig(options)})
}

func (a *App) searchMicroPosts(c *gin.Context) {
	var input struct {
		Keyword string `json:"keyword"`
		Status  int    `json:"status"`
		Offset  int    `json:"offset"`
		Limit   int    `json:"limit"`
	}
	input.Status, input.Limit = -1, 100
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "搜索参数无效"})
		return
	}
	if input.Offset < 0 || input.Limit < 1 || input.Limit > 500 || input.Status < -1 || input.Status > 1 {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "搜索范围无效"})
		return
	}
	posts, total, err := a.store.SearchMicroPosts(c.Request.Context(), input.Keyword, input.Status, input.Offset, input.Limit)
	if err != nil {
		a.apiFailure(c, "搜索微博客失败", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "ok", "posts": posts, "total": total,
		"offset": input.Offset, "limit": input.Limit})
}

func (a *App) getMicroPost(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "微博 ID 无效"})
		return
	}
	post, err := a.store.MicroPostByID(c.Request.Context(), id)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"status": false, "message": "微博不存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "ok", "post": post})
}

func (a *App) createMicroPost(c *gin.Context) {
	var post MicroPost
	if err := c.ShouldBindJSON(&post); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "JSON 参数无效"})
		return
	}
	post.Content = strings.TrimSpace(post.Content)
	if err := validateMicroPost(post); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": err.Error()})
		return
	}
	if err := a.store.CreateMicroPost(c.Request.Context(), &post); err != nil {
		a.apiFailure(c, "发布微博失败", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "ok", "post": post})
}

func (a *App) updateMicroPost(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "微博 ID 无效"})
		return
	}
	var post MicroPost
	if err := c.ShouldBindJSON(&post); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "JSON 参数无效"})
		return
	}
	post.ID, post.Content = id, strings.TrimSpace(post.Content)
	if err := validateMicroPost(post); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": err.Error()})
		return
	}
	updated, err := a.store.UpdateMicroPost(c.Request.Context(), post)
	if err != nil {
		a.apiFailure(c, "更新微博失败", err)
		return
	}
	status := http.StatusOK
	if !updated {
		status = http.StatusNotFound
	}
	c.JSON(status, gin.H{"status": updated, "message": map[bool]string{true: "ok", false: "微博不存在"}[updated]})
}

func (a *App) deleteMicroPost(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "微博 ID 无效"})
		return
	}
	deleted, err := a.store.DeleteMicroPost(c.Request.Context(), id)
	if err != nil {
		a.apiFailure(c, "删除微博失败", err)
		return
	}
	status := http.StatusOK
	if !deleted {
		status = http.StatusNotFound
	}
	c.JSON(status, gin.H{"status": deleted, "message": map[bool]string{true: "ok", false: "微博不存在"}[deleted]})
}

func (a *App) updateMicroblogConfig(c *gin.Context) {
	var input microblogConfig
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "设置参数无效"})
		return
	}
	input.Path = strings.Trim(strings.TrimSpace(input.Path), "/")
	input.Title, input.Description = strings.TrimSpace(input.Title), strings.TrimSpace(input.Description)
	if err := validateMicroblogPath(input.Path); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": err.Error()})
		return
	}
	if input.Title == "" || len([]rune(input.Title)) > 80 || len([]rune(input.Description)) > 240 {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "标题为空或标题、简介过长"})
		return
	}
	values := map[string]any{
		"microblog_enabled": strconv.FormatBool(input.Enabled), "microblog_path": input.Path,
		"microblog_title": input.Title, "microblog_description": input.Description,
	}
	if err := a.store.UpdateOptions(c.Request.Context(), values); err != nil {
		a.apiFailure(c, "保存微博客设置失败", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "ok", "config": input})
}

// tryMicroblog is called from NoRoute so the public path can be changed at
// runtime without rebuilding Gin's route tree or restarting the application.
func (a *App) tryMicroblog(c *gin.Context) bool {
	if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
		return false
	}
	options, err := a.store.Options(c.Request.Context())
	if err != nil {
		return false
	}
	config := currentMicroblogConfig(options)
	requestPath := strings.Trim(c.Request.URL.Path, "/")
	if !config.Enabled || requestPath != config.Path {
		return false
	}
	if c.Query("format") == "json" {
		offset := microblogOffset(c)
		posts, total, err := a.store.MicroPosts(c.Request.Context(), true, offset, microblogPageSize)
		if err != nil {
			a.apiFailure(c, "微博客加载失败", err)
			return true
		}
		nextOffset := offset + len(posts)
		c.Header("Cache-Control", "no-store")
		c.Header("X-Robots-Tag", "noindex, nofollow")
		c.JSON(http.StatusOK, gin.H{
			"status": true, "posts": a.renderPublicMicroPosts(posts), "total": total,
			"nextOffset": nextOffset, "hasMore": int64(nextOffset) < total,
		})
		return true
	}
	pageNumber, parseErr := strconv.Atoi(c.Query("p"))
	if parseErr != nil || pageNumber < 0 || pageNumber > 1_000_000 {
		pageNumber = 0
	}
	offset := pageNumber * microblogPageSize
	posts, total, err := a.store.MicroPosts(c.Request.Context(), true, offset, microblogPageSize)
	if err != nil {
		a.renderError(c, http.StatusInternalServerError, "微博客加载失败", err.Error())
		return true
	}
	basePath := "/" + config.Path
	if offset >= int(total) && pageNumber > 0 {
		c.Redirect(http.StatusFound, basePath)
		return true
	}
	canonicalPath := basePath
	if pageNumber > 0 {
		canonicalPath += fmt.Sprintf("?p=%d", pageNumber)
	}
	data, err := a.baseView(c, config.Title, config.Description, canonicalPath)
	if err != nil {
		a.renderError(c, http.StatusInternalServerError, "微博客加载失败", err.Error())
		return true
	}
	for i := range posts {
		posts[i].Rendered = a.renderContent(Page{Type: PageArticle, Content: posts[i].Content})
	}
	data.Kind, data.MicroPosts, data.ListTitle = "microblog", posts, config.Title
	data.MicroOffset = offset + len(posts)
	if pageNumber > 0 {
		data.PrevURL = basePath
		if pageNumber > 1 {
			data.PrevURL = fmt.Sprintf("%s?p=%d", basePath, pageNumber-1)
		}
	}
	if int64(offset+len(posts)) < total {
		data.NextURL = fmt.Sprintf("%s?p=%d", basePath, pageNumber+1)
	}
	data.JSONLD = microblogJSONLD(data, posts, config.Title)
	a.render(c, http.StatusOK, data)
	return true
}
