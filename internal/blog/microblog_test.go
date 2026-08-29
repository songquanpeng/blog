package blog

import (
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestMicroblogPublicPathAndFeatureSwitch(t *testing.T) {
	store, err := openStore(filepath.Join(t.TempDir(), "data.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	for _, post := range []MicroPost{
		{Content: "public note", Status: MicroPostPublic},
		{Content: "private note", Status: MicroPostPrivate},
	} {
		if err := store.CreateMicroPost(t.Context(), &post); err != nil {
			t.Fatal(err)
		}
	}
	if err := store.UpdateOptions(t.Context(), map[string]any{
		"microblog_path": "notes/daily", "microblog_title": "片语", "microblog_enabled": "true",
	}); err != nil {
		t.Fatal(err)
	}
	templates := template.Must(template.New("layout.gohtml").Parse(`{{define "layout.gohtml"}}{{.Kind}}:{{range .MicroPosts}}{{.Content}}{{end}}{{end}}`))
	app := &App{store: store, templates: templates}
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.NoRoute(func(c *gin.Context) {
		if app.tryMicroblog(c) {
			return
		}
		c.Status(http.StatusNotFound)
	})

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/notes/daily", nil))
	if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), "public note") || strings.Contains(recorder.Body.String(), "private note") {
		t.Fatalf("public microblog = %d %q", recorder.Code, recorder.Body.String())
	}

	if err := store.UpdateOptions(t.Context(), map[string]any{"microblog_enabled": "false"}); err != nil {
		t.Fatal(err)
	}
	recorder = httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/notes/daily", nil))
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("disabled microblog = %d %q", recorder.Code, recorder.Body.String())
	}
}

func TestMicroblogPublicInfiniteScrollFeed(t *testing.T) {
	store, err := openStore(filepath.Join(t.TempDir(), "data.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	for i := 0; i < microblogPageSize+3; i++ {
		post := MicroPost{Content: fmt.Sprintf("public note %d", i), Status: MicroPostPublic}
		if err := store.CreateMicroPost(t.Context(), &post); err != nil {
			t.Fatal(err)
		}
	}
	private := MicroPost{Content: "private note", Status: MicroPostPrivate}
	if err := store.CreateMicroPost(t.Context(), &private); err != nil {
		t.Fatal(err)
	}
	if err := store.UpdateOptions(t.Context(), map[string]any{"microblog_path": "notes", "microblog_enabled": "true"}); err != nil {
		t.Fatal(err)
	}

	app := &App{store: store}
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.NoRoute(func(c *gin.Context) {
		if !app.tryMicroblog(c) {
			c.Status(http.StatusNotFound)
		}
	})
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, fmt.Sprintf("/notes?format=json&offset=%d", microblogPageSize), nil))
	if recorder.Code != http.StatusOK {
		t.Fatalf("feed response = %d %s", recorder.Code, recorder.Body.String())
	}
	var payload struct {
		Status     bool              `json:"status"`
		Posts      []publicMicroPost `json:"posts"`
		NextOffset int               `json:"nextOffset"`
		HasMore    bool              `json:"hasMore"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if !payload.Status || len(payload.Posts) != 3 || payload.NextOffset != microblogPageSize+3 || payload.HasMore {
		t.Fatalf("feed payload = %#v", payload)
	}
	for _, post := range payload.Posts {
		if !strings.Contains(post.HTML, "<p>") || strings.Contains(post.HTML, "private note") || post.CreatedLabel == "" {
			t.Fatalf("rendered feed post = %#v", post)
		}
	}
	if cache := recorder.Header().Get("Cache-Control"); cache != "no-store" {
		t.Fatalf("feed cache policy = %q", cache)
	}
}

func TestMicroblogCRUD(t *testing.T) {
	store, err := openStore(filepath.Join(t.TempDir(), "data.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	post := MicroPost{Content: "first", Status: MicroPostPublic}
	if err := store.CreateMicroPost(t.Context(), &post); err != nil || post.ID == 0 {
		t.Fatalf("create = %#v, %v", post, err)
	}
	post.Content, post.Status = "updated", MicroPostPrivate
	if updated, err := store.UpdateMicroPost(t.Context(), post); err != nil || !updated {
		t.Fatalf("update = %v, %v", updated, err)
	}
	posts, total, err := store.MicroPosts(t.Context(), false, 0, 100)
	if err != nil || total != 1 || len(posts) != 1 || posts[0].Content != "updated" || posts[0].Status != MicroPostPrivate {
		t.Fatalf("list = %#v, %d, %v", posts, total, err)
	}
	found, err := store.MicroPostByID(t.Context(), post.ID)
	if err != nil || found.Content != "updated" {
		t.Fatalf("get = %#v, %v", found, err)
	}
	matched, matchedTotal, err := store.SearchMicroPosts(t.Context(), "date", MicroPostPrivate, 0, 20)
	if err != nil || matchedTotal != 1 || len(matched) != 1 || matched[0].ID != post.ID {
		t.Fatalf("search = %#v, %d, %v", matched, matchedTotal, err)
	}
	public, publicTotal, err := store.MicroPosts(t.Context(), true, 0, 100)
	if err != nil || publicTotal != 0 || len(public) != 0 {
		t.Fatalf("public list = %#v, %d, %v", public, publicTotal, err)
	}
	if deleted, err := store.DeleteMicroPost(t.Context(), post.ID); err != nil || !deleted {
		t.Fatalf("delete = %v, %v", deleted, err)
	}
}

func TestValidateMicroblogPath(t *testing.T) {
	for _, path := range []string{"microblog", "notes/daily", "随笔/日常"} {
		if err := validateMicroblogPath(path); err != nil {
			t.Errorf("valid path %q: %v", path, err)
		}
	}
	for _, path := range []string{"", "api/notes", "../notes", "notes?q=1", "notes//daily"} {
		if err := validateMicroblogPath(path); err == nil {
			t.Errorf("invalid path %q was accepted", path)
		}
	}
}
