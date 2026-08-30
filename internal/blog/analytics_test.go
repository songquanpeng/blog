package blog

import (
	"path/filepath"
	"testing"
	"time"
)

func TestAnalyticsAggregatesPVUVPagesAndSources(t *testing.T) {
	store, err := openStore(filepath.Join(t.TempDir(), "data.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	first := Page{Type: PageArticle, Link: "first", PageStatus: StatusPublished, CommentStatus: 1, Title: "First", Content: "content"}
	second := Page{Type: PageArticle, Link: "second", PageStatus: StatusPublished, CommentStatus: 1, Title: "Second", Content: "content"}
	for _, page := range []*Page{&first, &second} {
		if err := store.CreatePage(t.Context(), page); err != nil {
			t.Fatal(err)
		}
	}
	location := time.FixedZone("test", 8*60*60)
	now := time.Date(2026, 8, 30, 12, 0, 0, 0, location)
	records := []PageViewRecord{
		{PageID: first.ID, Path: "/page/first", Day: "2026-08-30", VisitorHash: "visitor-a", Referrer: "google.com", SearchEngine: "Google", SearchKeyword: "go blog", UserAgent: "Browser A", CreatedAt: now.UTC()},
		{PageID: first.ID, Path: "/page/first", Day: "2026-08-30", VisitorHash: "visitor-a", Referrer: "直接访问", UserAgent: "Browser A", CreatedAt: now.UTC()},
		{PageID: first.ID, Path: "/page/first", Day: "2026-08-30", VisitorHash: "visitor-b", Referrer: "baidu.com", SearchEngine: "百度", SearchKeyword: "独立博客", UserAgent: "Browser B", CreatedAt: now.UTC()},
		{PageID: second.ID, Path: "/page/second", Day: "2026-08-30", VisitorHash: "visitor-a", Referrer: "站内访问", UserAgent: "Browser A", CreatedAt: now.UTC()},
		{PageID: first.ID, Path: "/page/first", Day: "2026-08-29", VisitorHash: "visitor-c", Referrer: "example.com", UserAgent: "Browser C", CreatedAt: now.Add(-24 * time.Hour).UTC()},
	}
	for _, record := range records {
		if err := store.RecordPageView(t.Context(), record); err != nil {
			t.Fatal(err)
		}
	}

	report, err := store.Analytics(t.Context(), 2, now, location)
	if err != nil {
		t.Fatal(err)
	}
	if report.Summary.PV != 5 || report.Summary.UV != 3 || report.Summary.TodayPV != 4 || report.Summary.TodayUV != 2 {
		t.Fatalf("unexpected summary: %#v", report.Summary)
	}
	if len(report.Daily) != 2 || report.Daily[0].PV != 1 || report.Daily[1].PV != 4 || report.Daily[1].UV != 2 {
		t.Fatalf("unexpected daily report: %#v", report.Daily)
	}
	if len(report.Pages) != 2 || report.Pages[0].PageID != first.ID || report.Pages[0].PV != 4 || report.Pages[0].UV != 3 {
		t.Fatalf("unexpected page report: %#v", report.Pages)
	}
	if len(report.SearchEngines) != 2 || report.SearchEngines[0].PV != 1 || len(report.SearchKeywords) != 2 {
		t.Fatalf("unexpected search report: engines=%#v keywords=%#v", report.SearchEngines, report.SearchKeywords)
	}
	updated, err := store.PageByID(t.Context(), first.ID)
	if err != nil || updated.View != 4 {
		t.Fatalf("legacy page view count was not updated: %#v, %v", updated, err)
	}
}

func TestAnalyticsTrafficSourceRecognizesSearchTerms(t *testing.T) {
	tests := []struct {
		name, raw, requestHost, referrer, engine, keyword string
	}{
		{name: "direct", referrer: "直接访问"},
		{name: "same origin ignores port", raw: "https://blog.example/page/old?private=yes", requestHost: "blog.example:443", referrer: "站内访问"},
		{name: "google", raw: "https://www.google.com/search?q=go%20sqlite", requestHost: "blog.example", referrer: "www.google.com", engine: "Google", keyword: "go sqlite"},
		{name: "baidu", raw: "https://www.baidu.com/s?wd=%E7%8B%AC%E7%AB%8B%E5%8D%9A%E5%AE%A2", requestHost: "blog.example", referrer: "www.baidu.com", engine: "百度", keyword: "独立博客"},
		{name: "external strips path", raw: "https://news.example/private/path?token=secret", requestHost: "blog.example", referrer: "news.example"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			referrer, engine, keyword := analyticsTrafficSource(test.raw, test.requestHost)
			if referrer != test.referrer || engine != test.engine || keyword != test.keyword {
				t.Fatalf("traffic source = %q, %q, %q; want %q, %q, %q", referrer, engine, keyword, test.referrer, test.engine, test.keyword)
			}
		})
	}
}

func TestAnalyticsVisitorHashIsKeyedAndStable(t *testing.T) {
	first := analyticsVisitorHash([]byte("first secret"), "visitor")
	if first != analyticsVisitorHash([]byte("first secret"), "visitor") {
		t.Fatal("visitor hash is not stable")
	}
	if first == analyticsVisitorHash([]byte("second secret"), "visitor") || first == analyticsVisitorHash([]byte("first secret"), "another visitor") {
		t.Fatal("visitor hash does not separate keys or visitors")
	}
}
