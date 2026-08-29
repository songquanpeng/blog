package blog

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

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
	csp := recorder.Header().Get("Content-Security-Policy")
	if !strings.Contains(csp, "sandbox allow-scripts") || strings.Contains(csp, "allow-same-origin") {
		t.Fatalf("raw page CSP does not enforce opaque sandbox: %q", csp)
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
	app := &App{store: store, sessions: sessions, cfg: Config{APIToken: "publisher-token", UploadPath: dataDir, MaxUploadBytes: 1 << 20}}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	api := router.Group("/api")
	api.POST("/page", app.publisherRequired(), app.createPage)
	admin := api.Group("")
	admin.Use(app.adminRequired())
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

	createBody := bytes.NewBufferString(`{"title":"Regression","link":"regression","content":"# ok","tags":["test"]}`)
	createRequest := httptest.NewRequest(http.MethodPost, "/api/page", createBody)
	createRequest.Header.Set("Content-Type", "application/json")
	createRequest.Header.Set("Authorization", "Bearer publisher-token")
	createRecorder := httptest.NewRecorder()
	router.ServeHTTP(createRecorder, createRequest)
	if createRecorder.Code != http.StatusOK {
		t.Fatalf("create page = %d %s", createRecorder.Code, createRecorder.Body.String())
	}
	var created struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(createRecorder.Body.Bytes(), &created); err != nil || created.ID == "" {
		t.Fatalf("create response = %s, %v", createRecorder.Body.String(), err)
	}

	if recorder := do(http.MethodGet, "/api/page/"+created.ID, "", nil, true); recorder.Code != http.StatusOK {
		t.Fatalf("get page = %d %s", recorder.Code, recorder.Body.String())
	}
	update := bytes.NewBufferString(`{"id":"` + created.ID + `","title":"Updated","link":"regression","content":"# updated","pageStatus":1,"commentStatus":1}`)
	if recorder := do(http.MethodPut, "/api/page", "application/json", update, true); recorder.Code != http.StatusOK {
		t.Fatalf("update page = %d %s", recorder.Code, recorder.Body.String())
	}
	if recorder := do(http.MethodPut, "/api/option", "application/json", bytes.NewBufferString(`{"theme":"bootstrap5","site_name":"Regression"}`), true); recorder.Code != http.StatusOK {
		t.Fatalf("update options = %d %s", recorder.Code, recorder.Body.String())
	}
	options, _ := store.Options(t.Context())
	if options["theme"] != "bulma" || options["site_name"] != "Regression" {
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
