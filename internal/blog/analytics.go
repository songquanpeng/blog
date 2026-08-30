package blog

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const analyticsVisitorCookie = "blog_visitor"

type PageViewRecord struct {
	PageID        string
	Path          string
	Day           string
	VisitorHash   string
	Referrer      string
	SearchEngine  string
	SearchKeyword string
	UserAgent     string
	CreatedAt     time.Time
}

type AnalyticsSummary struct {
	PV      int64 `json:"pv"`
	UV      int64 `json:"uv"`
	TodayPV int64 `json:"todayPv"`
	TodayUV int64 `json:"todayUv"`
}

type AnalyticsDaily struct {
	Date string `json:"date" gorm:"column:date"`
	PV   int64  `json:"pv" gorm:"column:pv"`
	UV   int64  `json:"uv" gorm:"column:uv"`
}

type AnalyticsPage struct {
	PageID string `json:"pageId" gorm:"column:page_id"`
	Title  string `json:"title" gorm:"column:title"`
	Link   string `json:"link" gorm:"column:link"`
	PV     int64  `json:"pv" gorm:"column:pv"`
	UV     int64  `json:"uv" gorm:"column:uv"`
}

type AnalyticsDimension struct {
	Value string `json:"value" gorm:"column:value"`
	PV    int64  `json:"pv" gorm:"column:pv"`
}

type AnalyticsReport struct {
	Days           int                  `json:"days"`
	StartDate      string               `json:"startDate"`
	EndDate        string               `json:"endDate"`
	Summary        AnalyticsSummary     `json:"summary"`
	Daily          []AnalyticsDaily     `json:"daily"`
	Pages          []AnalyticsPage      `json:"pages"`
	Referrers      []AnalyticsDimension `json:"referrers"`
	SearchEngines  []AnalyticsDimension `json:"searchEngines"`
	SearchKeywords []AnalyticsDimension `json:"searchKeywords"`
	Agents         []AnalyticsDimension `json:"agents"`
}

func (s *Store) RecordPageView(ctx context.Context, record PageViewRecord) error {
	row := dbPageView{PageID: record.PageID, Path: record.Path, Day: record.Day,
		VisitorHash: record.VisitorHash, Referrer: record.Referrer, SearchEngine: record.SearchEngine,
		SearchKeyword: record.SearchKeyword, UserAgent: record.UserAgent, CreatedAt: record.CreatedAt}
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&row).Error; err != nil {
			return err
		}
		return tx.Model(&dbPage{}).Where("id = ?", record.PageID).
			UpdateColumn("view", gorm.Expr("COALESCE(view, 0) + 1")).Error
	})
}

func (s *Store) Analytics(ctx context.Context, days int, now time.Time, location *time.Location) (AnalyticsReport, error) {
	if location == nil {
		location = time.Local
	}
	if days < 1 {
		days = 30
	}
	if days > 365 {
		days = 365
	}
	today := now.In(location)
	endDay := today.Format("2006-01-02")
	start := time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, location).AddDate(0, 0, -(days - 1))
	startDay := start.Format("2006-01-02")
	report := AnalyticsReport{Days: days, StartDate: startDay, EndDate: endDay,
		Daily: []AnalyticsDaily{}, Pages: []AnalyticsPage{}, Referrers: []AnalyticsDimension{},
		SearchEngines: []AnalyticsDimension{}, SearchKeywords: []AnalyticsDimension{}, Agents: []AnalyticsDimension{}}

	base := s.db.WithContext(ctx).Model(&dbPageView{}).Where("day BETWEEN ? AND ?", startDay, endDay)
	if err := base.Select("COUNT(*) AS pv, COUNT(DISTINCT visitorHash) AS uv").Scan(&report.Summary).Error; err != nil {
		return report, err
	}
	var todaySummary struct {
		PV int64 `gorm:"column:pv"`
		UV int64 `gorm:"column:uv"`
	}
	if err := s.db.WithContext(ctx).Model(&dbPageView{}).Where("day = ?", endDay).
		Select("COUNT(*) AS pv, COUNT(DISTINCT visitorHash) AS uv").Scan(&todaySummary).Error; err != nil {
		return report, err
	}
	report.Summary.TodayPV, report.Summary.TodayUV = todaySummary.PV, todaySummary.UV

	var dailyRows []AnalyticsDaily
	if err := base.Select("day AS date, COUNT(*) AS pv, COUNT(DISTINCT visitorHash) AS uv").
		Group("day").Order("day").Scan(&dailyRows).Error; err != nil {
		return report, err
	}
	dailyByDate := make(map[string]AnalyticsDaily, len(dailyRows))
	for _, row := range dailyRows {
		dailyByDate[row.Date] = row
	}
	for day := start; !day.After(today); day = day.AddDate(0, 0, 1) {
		date := day.Format("2006-01-02")
		row := dailyByDate[date]
		row.Date = date
		report.Daily = append(report.Daily, row)
	}

	if err := s.db.WithContext(ctx).Table("PageViews AS v").
		Select("v.pageId AS page_id, COALESCE(p.title, v.path) AS title, COALESCE(p.link, '') AS link, COUNT(*) AS pv, COUNT(DISTINCT v.visitorHash) AS uv").
		Joins("LEFT JOIN Pages AS p ON p.id = v.pageId").Where("v.day BETWEEN ? AND ?", startDay, endDay).
		Group("v.pageId").Order("pv DESC, title ASC").Limit(100).Scan(&report.Pages).Error; err != nil {
		return report, err
	}
	if err := analyticsDimensionQuery(s.db.WithContext(ctx), "referrer", startDay, endDay, &report.Referrers); err != nil {
		return report, err
	}
	if err := analyticsNonEmptyDimensionQuery(s.db.WithContext(ctx), "searchEngine", startDay, endDay, &report.SearchEngines); err != nil {
		return report, err
	}
	if err := analyticsNonEmptyDimensionQuery(s.db.WithContext(ctx), "searchKeyword", startDay, endDay, &report.SearchKeywords); err != nil {
		return report, err
	}
	if err := analyticsDimensionQuery(s.db.WithContext(ctx), "userAgent", startDay, endDay, &report.Agents); err != nil {
		return report, err
	}
	return report, nil
}

func analyticsNonEmptyDimensionQuery(db *gorm.DB, column, startDay, endDay string, target *[]AnalyticsDimension) error {
	return db.Model(&dbPageView{}).Select(column+" AS value, COUNT(*) AS pv").
		Where("day BETWEEN ? AND ? AND "+column+" != ''", startDay, endDay).
		Group(column).Order("pv DESC, value ASC").Limit(12).Scan(target).Error
}

func analyticsDimensionQuery(db *gorm.DB, column, startDay, endDay string, target *[]AnalyticsDimension) error {
	return db.Model(&dbPageView{}).Select(column+" AS value, COUNT(*) AS pv").
		Where("day BETWEEN ? AND ?", startDay, endDay).Group(column).Order("pv DESC, value ASC").Limit(12).Scan(target).Error
}

func (a *App) recordArticleView(c *gin.Context, page Page) {
	visitorID, err := c.Cookie(analyticsVisitorCookie)
	if err != nil || len(visitorID) < 16 || len(visitorID) > 128 {
		visitorID, err = randomToken(24)
		if err != nil {
			return
		}
		c.SetSameSite(http.SameSiteLaxMode)
		c.SetCookie(analyticsVisitorCookie, visitorID, 400*24*60*60, "/", "", requestSecure(c), true)
	}
	location := a.cfg.AnalyticsLocation
	if location == nil {
		location = time.Local
	}
	now := time.Now()
	referrer, searchEngine, searchKeyword := analyticsTrafficSource(c.GetHeader("Referer"), c.Request.Host)
	record := PageViewRecord{PageID: page.ID, Path: "/page/" + page.Link,
		Day: now.In(location).Format("2006-01-02"), VisitorHash: analyticsVisitorHash(a.cfg.SessionSecret, visitorID),
		Referrer: referrer, SearchEngine: searchEngine, SearchKeyword: searchKeyword,
		UserAgent: analyticsText(c.GetHeader("User-Agent"), "未知 UA", 512), CreatedAt: now.UTC()}
	_ = a.store.RecordPageView(c.Request.Context(), record)
}

func analyticsVisitorHash(secret []byte, visitorID string) string {
	if len(secret) == 0 {
		digest := sha256.Sum256([]byte(visitorID))
		return hex.EncodeToString(digest[:])
	}
	digest := hmac.New(sha256.New, secret)
	_, _ = digest.Write([]byte(visitorID))
	return hex.EncodeToString(digest.Sum(nil))
}

func analyticsTrafficSource(raw, requestHost string) (referrer, searchEngine, searchKeyword string) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "直接访问", "", ""
	}
	parsed, err := url.Parse(raw)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
		return "其他来源", "", ""
	}
	requestURL, _ := url.Parse("//" + requestHost)
	if strings.EqualFold(parsed.Hostname(), requestURL.Hostname()) {
		return "站内访问", "", ""
	}
	host := strings.ToLower(strings.TrimSuffix(parsed.Hostname(), "."))
	engine, keys := searchEngineForHost(host)
	keyword := ""
	for _, key := range keys {
		if value := parsed.Query().Get(key); value != "" {
			keyword = analyticsText(value, "", 300)
			break
		}
	}
	return analyticsText(host, "其他来源", 255), engine, keyword
}

func searchEngineForHost(host string) (string, []string) {
	type searchEngine struct {
		name    string
		domains []string
		keys    []string
	}
	engines := []searchEngine{
		{name: "Google", domains: []string{"google.com", "google.cn"}, keys: []string{"q"}},
		{name: "百度", domains: []string{"baidu.com"}, keys: []string{"wd", "word"}},
		{name: "Bing", domains: []string{"bing.com", "cn.bing.com"}, keys: []string{"q"}},
		{name: "搜狗", domains: []string{"sogou.com"}, keys: []string{"query", "keyword"}},
		{name: "360 搜索", domains: []string{"so.com"}, keys: []string{"q"}},
		{name: "DuckDuckGo", domains: []string{"duckduckgo.com"}, keys: []string{"q"}},
		{name: "Yahoo", domains: []string{"search.yahoo.com", "yahoo.com"}, keys: []string{"p"}},
		{name: "Yandex", domains: []string{"yandex.com", "yandex.ru"}, keys: []string{"text"}},
		{name: "神马", domains: []string{"sm.cn"}, keys: []string{"q"}},
	}
	for _, engine := range engines {
		for _, domain := range engine.domains {
			if host == domain || strings.HasSuffix(host, "."+domain) {
				return engine.name, engine.keys
			}
		}
	}
	return "", nil
}

func analyticsText(value, fallback string, limit int) string {
	value = strings.TrimSpace(strings.Map(func(r rune) rune {
		if r < 32 || r == 127 {
			return -1
		}
		return r
	}, value))
	if value == "" {
		return fallback
	}
	runes := []rune(value)
	if len(runes) > limit {
		value = string(runes[:limit])
	}
	return value
}

func (a *App) analyticsReport(c *gin.Context) {
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))
	if days < 1 || days > 365 {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "统计周期需为 1–365 天"})
		return
	}
	report, err := a.store.Analytics(c.Request.Context(), days, time.Now(), a.cfg.AnalyticsLocation)
	if err != nil {
		a.apiFailure(c, "读取统计数据失败", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "ok", "analytics": report})
}
