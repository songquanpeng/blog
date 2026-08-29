package blog

import (
	"crypto/subtle"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"time"
	"unicode"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func (a *App) userStatus(c *gin.Context) {
	_, entry, ok := a.sessions.get(c)
	if !ok || entry.User == nil || !entry.User.IsAdmin {
		c.JSON(http.StatusUnauthorized, gin.H{"status": false, "message": "请使用 GitHub 登录", "loginUrl": "/auth/github"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "ok", "user": entry.User})
}

func (a *App) logout(c *gin.Context) {
	a.sessions.delete(c)
	c.Redirect(http.StatusFound, "/admin/")
}

func (a *App) logoutJSON(c *gin.Context) {
	a.sessions.delete(c)
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "注销成功"})
}

func (a *App) legacyLoginGone(c *gin.Context) {
	c.JSON(http.StatusGone, gin.H{"status": false, "message": "密码登录已废弃，请使用 GitHub OAuth", "loginUrl": "/auth/github"})
}

type pageInput struct {
	ID            string `json:"id"`
	Type          int    `json:"type"`
	Link          string `json:"link"`
	PageStatus    *int   `json:"pageStatus"`
	CommentStatus *int   `json:"commentStatus"`
	Title         string `json:"title"`
	Content       string `json:"content"`
	Tag           string `json:"tag"`
	Password      string `json:"password"`
	Description   string `json:"description"`
}

func (input pageInput) page() Page {
	pageStatus, commentStatus := StatusRecalled, 0
	if input.PageStatus != nil {
		pageStatus = *input.PageStatus
	}
	if input.CommentStatus != nil {
		commentStatus = *input.CommentStatus
	}
	return Page{ID: strings.TrimSpace(input.ID), Type: input.Type, Link: strings.TrimSpace(input.Link),
		PageStatus: pageStatus, CommentStatus: commentStatus, Title: strings.TrimSpace(input.Title),
		Content: input.Content, Tag: strings.TrimSpace(input.Tag), Password: input.Password,
		Description: strings.TrimSpace(input.Description)}
}

func validatePage(page Page) error {
	if page.Title == "" || len([]rune(page.Title)) > 300 {
		return fmt.Errorf("标题为空或过长")
	}
	if page.Link == "" || len(page.Link) > 240 || strings.ContainsAny(page.Link, "/\\?#\x00") {
		return fmt.Errorf("页面链接为空、过长或包含非法字符")
	}
	if len(page.Content) > 8<<20 {
		return fmt.Errorf("页面内容不能超过 8 MiB")
	}
	if page.Type < PageArticle || page.Type > PageText {
		return fmt.Errorf("页面类型无效")
	}
	if page.PageStatus < StatusRecalled || page.PageStatus > StatusHidden {
		return fmt.Errorf("页面状态无效")
	}
	if page.CommentStatus != 0 && page.CommentStatus != 1 {
		return fmt.Errorf("评论状态无效")
	}
	return nil
}

func (a *App) createPage(c *gin.Context) {
	var input pageInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "JSON 参数无效"})
		return
	}
	page := input.page()
	if err := validatePage(page); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": err.Error()})
		return
	}
	if err := a.store.CreatePage(c.Request.Context(), &page); err != nil {
		a.apiFailure(c, "创建页面失败", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "ok", "id": page.ID})
}

func (a *App) allPages(c *gin.Context) {
	pages, err := a.store.AllPages(c.Request.Context())
	if err != nil {
		a.apiFailure(c, "读取页面失败", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "ok", "pages": pages})
}

func (a *App) searchPages(c *gin.Context) {
	var input struct {
		Type    int    `json:"type"`
		Keyword string `json:"keyword"`
	}
	input.Type = -1
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "搜索参数无效"})
		return
	}
	pages, err := a.store.SearchPages(c.Request.Context(), strings.TrimSpace(input.Keyword), input.Type)
	if err != nil {
		a.apiFailure(c, "搜索页面失败", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "ok", "pages": pages})
}

func (a *App) getPage(c *gin.Context) {
	page, err := a.store.PageByID(c.Request.Context(), c.Param("id"))
	if err != nil {
		status := http.StatusInternalServerError
		if err == gorm.ErrRecordNotFound {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"status": false, "message": "页面不存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "ok", "page": page})
}

func (a *App) renderedPage(c *gin.Context) {
	page, err := a.store.PageByID(c.Request.Context(), c.Param("id"))
	if err != nil || page.PageStatus == StatusRecalled {
		c.JSON(http.StatusNotFound, gin.H{"status": false, "message": "文章不存在或已撤回"})
		return
	}
	provided := c.Query("password")
	if c.Request.Method == http.MethodPost {
		var input struct {
			Password string `json:"password"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "参数无效"})
			return
		}
		provided = input.Password
	}
	if page.Password != "" && (len(provided) != len(page.Password) || subtle.ConstantTimeCompare([]byte(provided), []byte(page.Password)) != 1) {
		c.JSON(http.StatusForbidden, gin.H{"status": false, "message": "密码错误"})
		return
	}
	if page.Type == PageRaw {
		// Raw pages are returned verbatim and mounted in an opaque sandbox by the
		// public UI. This preserves owner-authored tools without giving them the
		// blog origin or access to the administrator session.
		c.JSON(http.StatusOK, gin.H{"status": true, "message": "ok", "content": stripFrontMatter(page.Content), "raw": true})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "ok", "content": a.renderContent(page), "raw": false})
}

func (a *App) exportPage(c *gin.Context) {
	page, err := a.store.PageByID(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	filename := strings.ReplaceAll(page.Link, "\"", "") + ".md"
	c.Header("Content-Disposition", "attachment; filename*=UTF-8''"+urlEncode(filename))
	c.Data(http.StatusOK, "text/markdown; charset=utf-8", []byte(page.Content))
}

func urlEncode(value string) string {
	return url.PathEscape(value)
}

func (a *App) updatePage(c *gin.Context) {
	var input pageInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "JSON 参数无效"})
		return
	}
	page := input.page()
	if page.ID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "页面 ID 为空"})
		return
	}
	if err := validatePage(page); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": err.Error()})
		return
	}
	updated, err := a.store.UpdatePage(c.Request.Context(), page)
	if err != nil {
		a.apiFailure(c, "更新页面失败", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": updated, "message": map[bool]string{true: "ok", false: "页面不存在"}[updated]})
}

func (a *App) deletePage(c *gin.Context) {
	deleted, err := a.store.DeletePage(c.Request.Context(), c.Param("id"))
	if err != nil {
		a.apiFailure(c, "删除页面失败", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": deleted, "message": map[bool]string{true: "ok", false: "页面不存在"}[deleted]})
}

func (a *App) getOptions(c *gin.Context) {
	options, err := a.store.OptionList(c.Request.Context())
	if err != nil {
		a.apiFailure(c, "读取设置失败", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "ok", "options": options})
}

func (a *App) getOption(c *gin.Context) {
	options, err := a.store.Options(c.Request.Context())
	if err != nil {
		a.apiFailure(c, "读取设置失败", err)
		return
	}
	value, ok := options[c.Param("name")]
	c.JSON(http.StatusOK, gin.H{"status": ok, "message": map[bool]string{true: "ok", false: "设置不存在"}[ok], "option": Option{Key: c.Param("name"), Value: value}})
}

func (a *App) updateOptions(c *gin.Context) {
	var options map[string]any
	if err := c.ShouldBindJSON(&options); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "设置参数无效"})
		return
	}
	if err := a.store.UpdateOptions(c.Request.Context(), options); err != nil {
		a.apiFailure(c, "保存设置失败", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "ok"})
}

func (a *App) shutdown(c *gin.Context) {
	if !a.cfg.EnableShutdown {
		c.JSON(http.StatusForbidden, gin.H{"status": false, "message": "远程关机默认禁用；如确有需要请设置 BLOG_ENABLE_SHUTDOWN=true"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "服务正在关闭"})
	go func() {
		time.Sleep(200 * time.Millisecond)
		_ = syscall.Kill(syscall.Getpid(), syscall.SIGTERM)
	}()
}

func (a *App) getFiles(c *gin.Context) { a.fileList(c, "") }

func (a *App) searchFiles(c *gin.Context) {
	var input struct {
		Keyword string `json:"keyword"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "搜索参数无效"})
		return
	}
	a.fileList(c, strings.TrimSpace(input.Keyword))
}

func (a *App) fileList(c *gin.Context, keyword string) {
	files, err := a.store.Files(c.Request.Context(), keyword)
	if err != nil {
		a.apiFailure(c, "读取文件失败", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "ok", "files": files})
}

func (a *App) getFile(c *gin.Context) {
	file, err := a.store.FileByID(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": false, "message": "文件不存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "ok", "file": file})
}

func cleanUploadName(value string) string {
	value = filepath.Base(strings.ReplaceAll(value, " ", "_"))
	value = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) || strings.ContainsRune("/\\?#%", r) {
			return -1
		}
		return r
	}, value)
	if len(value) > 180 {
		ext := filepath.Ext(value)
		runes := []rune(strings.TrimSuffix(value, ext))
		if len(runes) > 120 {
			runes = runes[:120]
		}
		value = string(runes) + ext
	}
	return strings.Trim(value, ".")
}

func (a *App) uploadFile(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, a.cfg.MaxUploadBytes)
	if err := c.Request.ParseMultipartForm(a.cfg.MaxUploadBytes); err != nil {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"status": false, "message": "上传文件过大或表单无效"})
		return
	}
	source, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "缺少文件"})
		return
	}
	defer source.Close()
	name := cleanUploadName(header.Filename)
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "文件名无效"})
		return
	}
	id, target, err := a.reserveUpload(name)
	if err != nil {
		a.apiFailure(c, "无法保存文件", err)
		return
	}
	if err := copyUpload(target, source, a.cfg.MaxUploadBytes); err != nil {
		_ = os.Remove(target)
		a.apiFailure(c, "保存文件失败", err)
		return
	}
	file := StoredFile{ID: id, Description: strings.TrimSpace(c.PostForm("description")), Filename: header.Filename, Path: "/upload/" + url.PathEscape(id)}
	if err := a.store.CreateFile(c.Request.Context(), file); err != nil {
		_ = os.Remove(target)
		a.apiFailure(c, "记录文件失败", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "ok", "file": file})
}

func (a *App) reserveUpload(name string) (string, string, error) {
	for attempt := 0; attempt < 5; attempt++ {
		id := name
		if attempt > 0 {
			token, err := randomToken(6)
			if err != nil {
				return "", "", err
			}
			ext := filepath.Ext(name)
			id = strings.TrimSuffix(name, ext) + "_" + token + ext
		}
		target := filepath.Join(a.cfg.UploadPath, id)
		file, err := os.OpenFile(target, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o640)
		if err == nil {
			_ = file.Close()
			return id, target, nil
		}
		if !os.IsExist(err) {
			return "", "", err
		}
	}
	return "", "", fmt.Errorf("同名文件过多")
}

func copyUpload(target string, source multipart.File, max int64) error {
	destination, err := os.OpenFile(target, os.O_WRONLY|os.O_TRUNC, 0o640)
	if err != nil {
		return err
	}
	defer destination.Close()
	written, err := io.Copy(destination, io.LimitReader(source, max+1))
	if err != nil {
		return err
	}
	if written > max {
		return fmt.Errorf("上传文件超过 %d MiB", max>>20)
	}
	return destination.Sync()
}

func (a *App) deleteFile(c *gin.Context) {
	file, err := a.store.FileByID(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": false, "message": "文件不存在"})
		return
	}
	if filepath.Base(file.ID) != file.ID {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "历史文件路径不安全，拒绝删除"})
		return
	}
	path := filepath.Join(a.cfg.UploadPath, file.ID)
	backup := path + ".deleting"
	if err := os.Rename(path, backup); err != nil && !os.IsNotExist(err) {
		a.apiFailure(c, "移动待删除文件失败", err)
		return
	}
	deleted, dbErr := a.store.DeleteFile(c.Request.Context(), file.ID)
	if dbErr != nil {
		_ = os.Rename(backup, path)
		a.apiFailure(c, "删除文件记录失败", dbErr)
		return
	}
	_ = os.Remove(backup)
	c.JSON(http.StatusOK, gin.H{"status": deleted, "message": map[bool]string{true: "ok", false: "文件不存在"}[deleted]})
}

func (a *App) apiFailure(c *gin.Context, public string, err error) {
	log.Printf("%s: %v", public, err)
	c.JSON(http.StatusInternalServerError, gin.H{"status": false, "message": public})
}
