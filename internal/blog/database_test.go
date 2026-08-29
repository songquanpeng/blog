package blog

import (
	"context"
	"database/sql"
	"path/filepath"
	"strings"
	"testing"

	_ "github.com/mattn/go-sqlite3"
)

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
		`INSERT INTO Pages VALUES ('legacy-page',0,'hello',1,1,'Hello','# Hello','Go;Gin','',7,0,0,'Old article','2021-02-03 04:05:06','2021-02-01 00:00:00','legacy-user')`,
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
	options, err := store.Options(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if options["theme"] != "bulma" {
		t.Fatalf("theme = %q, want bulma", options["theme"])
	}
}

func TestContentSanitizationAndFrontMatter(t *testing.T) {
	app := &App{cfg: Config{AllowUnsafeHTML: false}}
	page := Page{Type: PageArticle, Content: "---\ntitle: test\n---\n# Safe\n<script>alert(1)</script><a href=\"javascript:alert(2)\">bad</a>"}
	rendered := string(app.renderContent(page))
	if strings.Contains(rendered, "<script") || strings.Contains(rendered, "javascript:") {
		t.Fatalf("unsafe HTML survived sanitization: %s", rendered)
	}
	if !strings.Contains(rendered, "Safe") {
		t.Fatalf("expected markdown content, got %s", rendered)
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
