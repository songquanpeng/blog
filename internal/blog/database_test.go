package blog

import (
	"context"
	"database/sql"
	"errors"
	"path/filepath"
	"strings"
	"testing"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"gorm.io/gorm"
)

func TestStripFrontMatterOnlyAtDocumentStart(t *testing.T) {
	bodyWithRule := "first paragraph\n\n---\n\nlast paragraph"
	if got := stripFrontMatter(bodyWithRule); got != bodyWithRule {
		t.Fatalf("horizontal rule truncated article: %q", got)
	}
	frontMatter := "---\ntitle: Example\ntags: test\n---\n# Heading\n\nBody"
	if got := stripFrontMatter(frontMatter); got != "# Heading\n\nBody" {
		t.Fatalf("front matter body = %q", got)
	}
	malformed := "---\ntitle: Missing closing delimiter\nBody"
	if got := stripFrontMatter(malformed); got != malformed {
		t.Fatalf("malformed front matter was removed: %q", got)
	}
}

func TestVersionUploadedSVGReferences(t *testing.T) {
	rendered := `<p><img src="/upload/chart.svg" alt="chart"><img src='/upload/diagram.SVG'><img src="https://example.com/chart.svg"><img src="/upload/already.svg?rev=1"></p>`
	got := versionUploadedSVGReferences(rendered)
	for _, expected := range []string{`src="/upload/chart.svg?v=svg-inline-20260830"`, `src='/upload/diagram.SVG?v=svg-inline-20260830'`} {
		if !strings.Contains(got, expected) {
			t.Fatalf("versioned SVG output missing %q: %s", expected, got)
		}
	}
	if !strings.Contains(got, `src="https://example.com/chart.svg"`) || !strings.Contains(got, `src="/upload/already.svg?rev=1"`) {
		t.Fatalf("unrelated SVG source changed: %s", got)
	}
}

func TestHistoricalSequelizeDatabaseIsReadable(t *testing.T) {
	path := filepath.Join(t.TempDir(), "data.db")
	db, err := sql.Open("sqlite3", path)
	if err != nil {
		t.Fatal(err)
	}
	schema := []string{
		`CREATE TABLE Users (
			id VARCHAR(255) PRIMARY KEY, username VARCHAR(255), displayName VARCHAR(255) NOT NULL,
			password VARCHAR(255) NOT NULL, accessToken VARCHAR(255), email VARCHAR(255),
			url VARCHAR(255), avatar VARCHAR(255), isAdmin TINYINT, isModerator TINYINT,
			isBlocked TINYINT, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL
		)`,
		`CREATE TABLE Pages (
			id VARCHAR(255) PRIMARY KEY, type INTEGER, link VARCHAR(255) NOT NULL, pageStatus INTEGER,
			commentStatus INTEGER, title VARCHAR(255) NOT NULL, content TEXT NOT NULL, tag VARCHAR(255),
			password VARCHAR(255), view INTEGER, upVote INTEGER, downVote INTEGER, description TEXT,
			updatedAt DATETIME, createdAt DATETIME NOT NULL, UserId VARCHAR(255)
		)`,
		`INSERT INTO Users VALUES ('legacy-user','admin','Legacy Author','unused','token','', '', '',1,1,0,'2021-01-01 00:00:00','2021-01-01 00:00:00')`,
		`INSERT INTO Pages VALUES ('legacy-page',0,'hello',1,1,'Hello','# Hello','Go;Gin','',7,0,0,'Old article','2021-02-03 04:05:06.455 +00:00','2021-02-01 00:00:00.000 +00:00','legacy-user')`,
		`INSERT INTO Pages VALUES ('legacy-notice',0,'notice',0,1,'Notice','Historical notice','','',0,0,0,'','2021-02-03 04:05:06.455 +00:00','2021-02-01 00:00:00.000 +00:00','legacy-user')`,
	}
	for _, statement := range schema {
		if _, err := db.Exec(statement); err != nil {
			t.Fatal(err)
		}
	}
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}

	store, err := openStore(path)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	page, err := store.PublicPageByLink(context.Background(), "hello")
	if err != nil {
		t.Fatal(err)
	}
	if page.Title != "Hello" || page.Author != "Legacy Author" || page.View != 7 {
		t.Fatalf("unexpected historical page: %#v", page)
	}
	createdAt, err := time.Parse(time.RFC3339, page.CreatedAt)
	if err != nil || createdAt.Unix() != 1612137600 {
		t.Fatalf("historical createdAt = %q, want parseable original instant", page.CreatedAt)
	}
	if _, err := store.PublicPageByLink(context.Background(), "notice"); !errors.Is(err, gorm.ErrRecordNotFound) {
		t.Fatalf("recalled notice unexpectedly public: %v", err)
	}
	notice, err := store.PageByLink(context.Background(), "notice")
	if err != nil || notice.Content != "Historical notice" {
		t.Fatalf("historical special notice not readable: %#v, %v", notice, err)
	}
	options, err := store.Options(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if options["theme"] != "bulma" {
		t.Fatalf("theme = %q, want bulma", options["theme"])
	}
}

func TestPublicThemeOptionPersistsAndNormalizes(t *testing.T) {
	path := filepath.Join(t.TempDir(), "data.db")
	store, err := openStore(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := store.UpdateOptions(t.Context(), map[string]any{"theme": "studio"}); err != nil {
		t.Fatal(err)
	}
	store.Close()

	store, err = openStore(path)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	options, err := store.Options(t.Context())
	if err != nil || options["theme"] != "studio" {
		t.Fatalf("persisted theme = %q, %v", options["theme"], err)
	}
	if err := store.UpdateOptions(t.Context(), map[string]any{"theme": "unknown"}); err != nil {
		t.Fatal(err)
	}
	options, err = store.Options(t.Context())
	if err != nil || options["theme"] != "bulma" {
		t.Fatalf("normalized theme = %q, %v", options["theme"], err)
	}
}

func TestSearchPagesMatchesBodyAndPreservesMetrics(t *testing.T) {
	store, err := openStore(filepath.Join(t.TempDir(), "data.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	page := Page{Type: PageArticle, Link: "body-search", PageStatus: StatusPublished, CommentStatus: 1,
		Title: "Unrelated title", Content: "A uniquely searchable phrase", View: 37, UpVote: 4, DownVote: 2}
	if err := store.CreatePage(t.Context(), &page); err != nil {
		t.Fatal(err)
	}
	pages, err := store.SearchPages(t.Context(), "uniquely searchable", -1)
	if err != nil || len(pages) != 1 {
		t.Fatalf("search pages = %#v, %v", pages, err)
	}
	if pages[0].Content != page.Content || pages[0].View != 37 || pages[0].UpVote != 4 || pages[0].DownVote != 2 {
		t.Fatalf("search result lost content or metadata: %#v", pages[0])
	}
}

func TestContentSanitizationAndFrontMatter(t *testing.T) {
	app := &App{cfg: Config{AllowUnsafeHTML: false}}
	page := Page{Type: PageArticle, Content: "---\ntitle: test\n---\n# Safe\n<script>alert(1)</script><a href=\"javascript:alert(2)\">bad</a><img src=\"https://example.com/qr.png\" alt=\"QR code\" onerror=\"alert(3)\">"}
	rendered := string(app.renderContent(page))
	if strings.Contains(rendered, "<script") || strings.Contains(rendered, "javascript:") || strings.Contains(rendered, "onerror") {
		t.Fatalf("unsafe HTML survived sanitization: %s", rendered)
	}
	if !strings.Contains(rendered, "Safe") {
		t.Fatalf("expected markdown content, got %s", rendered)
	}
	if !strings.Contains(rendered, `<img src="https://example.com/qr.png" alt="QR code">`) {
		t.Fatalf("safe owner-authored image was omitted: %s", rendered)
	}
}

func TestLegacyLinkWithoutImageUsesFavicon(t *testing.T) {
	links := parseLinks("title: Example\nlink: https://example.com/path/\nimage:\n")
	if len(links) != 1 || links[0].Image != "https://example.com/path/favicon.ico" {
		t.Fatalf("legacy favicon fallback = %#v", links)
	}
}

func TestUploadedCodeThemePathValidation(t *testing.T) {
	if got := uploadedCodeTheme("/upload/solarized.css"); got != "solarized.css" {
		t.Fatalf("valid code theme = %q", got)
	}
	for _, value := range []string{"https://example.com/theme.css", "/upload/../secret.css", "/upload/theme.js"} {
		if got := uploadedCodeTheme(value); got != "" {
			t.Fatalf("unsafe code theme %q accepted as %q", value, got)
		}
	}
}

func TestPageValidationRejectsUnsafeLinks(t *testing.T) {
	page := Page{Type: PageArticle, Link: "../admin", PageStatus: StatusPublished, CommentStatus: 1, Title: "x", Content: "x"}
	if err := validatePage(page); err == nil {
		t.Fatal("expected unsafe page link to be rejected")
	}
	page.Link = "safe-link"
	if err := validatePage(page); err != nil {
		t.Fatalf("safe page rejected: %v", err)
	}
}

func TestGitHubIdentityAllowlistPrefersImmutableID(t *testing.T) {
	app := &App{cfg: Config{GitHubAllowedUserID: 42, GitHubAllowedLogin: "old-name"}}
	if !app.allowedGitHubUser(GitHubUser{ID: 42, Login: "new-name"}) {
		t.Fatal("matching immutable GitHub ID should be allowed")
	}
	if app.allowedGitHubUser(GitHubUser{ID: 7, Login: "old-name"}) {
		t.Fatal("login must not override configured immutable ID")
	}
}

func TestPublicAssetURL(t *testing.T) {
	for _, test := range []struct {
		name  string
		value string
		want  string
	}{
		{name: "root relative", value: "/upload/brand.webp", want: "https://justsong.cn/upload/brand.webp"},
		{name: "absolute", value: "https://cdn.example.com/brand.webp", want: "https://cdn.example.com/brand.webp"},
		{name: "protocol relative rejected", value: "//evil.example/image.png", want: ""},
		{name: "script rejected", value: "javascript:alert(1)", want: ""},
	} {
		t.Run(test.name, func(t *testing.T) {
			if got := publicAssetURL("https://justsong.cn", test.value); got != test.want {
				t.Fatalf("publicAssetURL() = %q, want %q", got, test.want)
			}
		})
	}
}
