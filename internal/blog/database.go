package blog

import (
	"context"
	"crypto/sha256"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/logger"
)

type Store struct{ db *gorm.DB }

// dbUser is retained only so new databases have the historical table needed by
// existing Page.UserId values. It is not part of authentication or the admin UI.
type dbUser struct {
	ID          string    `gorm:"column:id;primaryKey;type:text"`
	Username    string    `gorm:"column:username;unique"`
	DisplayName string    `gorm:"column:displayName;not null"`
	Password    string    `gorm:"column:password;not null"`
	AccessToken string    `gorm:"column:accessToken"`
	Email       string    `gorm:"column:email;unique"`
	URL         string    `gorm:"column:url"`
	Avatar      string    `gorm:"column:avatar"`
	IsAdmin     bool      `gorm:"column:isAdmin;default:false"`
	IsModerator bool      `gorm:"column:isModerator;default:false"`
	IsBlocked   bool      `gorm:"column:isBlocked;default:false"`
	CreatedAt   time.Time `gorm:"column:createdAt"`
	UpdatedAt   time.Time `gorm:"column:updatedAt"`
}

func (dbUser) TableName() string { return "Users" }

type dbPage struct {
	ID            string    `gorm:"column:id;primaryKey;type:text"`
	Type          int       `gorm:"column:type;default:0"`
	Link          string    `gorm:"column:link;not null;index:pages_link"`
	PageStatus    int       `gorm:"column:pageStatus;default:1;index:pages_public_order,priority:1"`
	CommentStatus int       `gorm:"column:commentStatus;default:1"`
	Title         string    `gorm:"column:title;not null"`
	Content       string    `gorm:"column:content;not null"`
	Tag           string    `gorm:"column:tag"`
	Password      string    `gorm:"column:password"`
	View          int       `gorm:"column:view;default:0"`
	UpVote        int       `gorm:"column:upVote;default:0"`
	DownVote      int       `gorm:"column:downVote;default:0"`
	Description   string    `gorm:"column:description"`
	CreatedAt     time.Time `gorm:"column:createdAt"`
	UpdatedAt     time.Time `gorm:"column:updatedAt;index:pages_public_order,priority:2"`
	UserID        *string   `gorm:"column:UserId"`
}

func (dbPage) TableName() string { return "Pages" }

type dbOption struct {
	Key   string `gorm:"column:key;primaryKey"`
	Value string `gorm:"column:value;type:text"`
}

func (dbOption) TableName() string { return "Options" }

type dbFile struct {
	ID          string    `gorm:"column:id;primaryKey;type:text"`
	Description string    `gorm:"column:description;type:text"`
	Path        string    `gorm:"column:path"`
	Filename    string    `gorm:"column:filename"`
	CreatedAt   time.Time `gorm:"column:createdAt"`
	UpdatedAt   time.Time `gorm:"column:updatedAt"`
}

func (dbFile) TableName() string { return "Files" }

type dbMicroPost struct {
	ID        uint64    `gorm:"column:id;primaryKey;autoIncrement"`
	Content   string    `gorm:"column:content;type:text;not null"`
	Status    int       `gorm:"column:status;not null;index:micro_posts_public_order,priority:1"`
	CreatedAt time.Time `gorm:"column:createdAt;index:micro_posts_public_order,priority:2"`
	UpdatedAt time.Time `gorm:"column:updatedAt"`
}

func (dbMicroPost) TableName() string { return "MicroPosts" }

// dbPageView stores only the information needed for first-party analytics.
// Client IP addresses are never persisted; VisitorHash is derived from a
// random first-party cookie with a server-side key.
type dbPageView struct {
	ID            uint64    `gorm:"column:id;primaryKey;autoIncrement"`
	PageID        string    `gorm:"column:pageId;type:text;not null;index:page_views_page_day,priority:1"`
	Path          string    `gorm:"column:path;type:text;not null"`
	Day           string    `gorm:"column:day;type:text;not null;index:page_views_day;index:page_views_page_day,priority:2;index:page_views_day_visitor,priority:1"`
	VisitorHash   string    `gorm:"column:visitorHash;type:text;not null;index:page_views_day_visitor,priority:2"`
	Referrer      string    `gorm:"column:referrer;type:text;not null"`
	SearchEngine  string    `gorm:"column:searchEngine;type:text;not null"`
	SearchKeyword string    `gorm:"column:searchKeyword;type:text;not null"`
	UserAgent     string    `gorm:"column:userAgent;type:text;not null"`
	CreatedAt     time.Time `gorm:"column:createdAt;index"`
}

func (dbPageView) TableName() string { return "PageViews" }

// CLI credentials live in dedicated tables so historical user access tokens
// can never become administrator credentials by accident. Only SHA-256
// digests of bearer and device codes are persisted.
type dbDeviceAuthorization struct {
	DeviceCodeHash string     `gorm:"column:deviceCodeHash;primaryKey;type:text"`
	UserCodeHash   string     `gorm:"column:userCodeHash;uniqueIndex;not null;type:text"`
	ClientName     string     `gorm:"column:clientName;type:text"`
	Status         string     `gorm:"column:status;index;not null"`
	GitHubUserID   int64      `gorm:"column:githubUserId"`
	GitHubLogin    string     `gorm:"column:githubLogin;type:text"`
	ExpiresAt      time.Time  `gorm:"column:expiresAt;index;not null"`
	ApprovedAt     *time.Time `gorm:"column:approvedAt"`
	CreatedAt      time.Time  `gorm:"column:createdAt"`
}

func (dbDeviceAuthorization) TableName() string { return "CLIDeviceAuthorizations" }

type dbCLIToken struct {
	ID           string     `gorm:"column:id;primaryKey;type:text"`
	TokenHash    string     `gorm:"column:tokenHash;uniqueIndex;not null;type:text"`
	ClientName   string     `gorm:"column:clientName;type:text"`
	GitHubUserID int64      `gorm:"column:githubUserId;index"`
	GitHubLogin  string     `gorm:"column:githubLogin;type:text"`
	ExpiresAt    time.Time  `gorm:"column:expiresAt;index;not null"`
	LastUsedAt   *time.Time `gorm:"column:lastUsedAt"`
	CreatedAt    time.Time  `gorm:"column:createdAt"`
}

func (dbCLIToken) TableName() string { return "CLITokens" }

type CLITokenInfo struct {
	ID           string `json:"id"`
	ClientName   string `json:"clientName"`
	GitHubUserID int64  `json:"githubUserId"`
	GitHubLogin  string `json:"githubLogin"`
	ExpiresAt    string `json:"expiresAt"`
	LastUsedAt   string `json:"lastUsedAt,omitempty"`
	CreatedAt    string `json:"createdAt"`
}

func credentialHash(value string) string {
	digest := sha256.Sum256([]byte(value))
	return fmt.Sprintf("%x", digest[:])
}

type DBPage = dbPage

type pageRow struct {
	DBPage
	Author       string `gorm:"column:author"`
	CreatedAtRaw string `gorm:"column:created_at_raw"`
	UpdatedAtRaw string `gorm:"column:updated_at_raw"`
}

var defaultOptions = []dbOption{
	{Key: "ad", Value: ""}, {Key: "allow_comments", Value: "true"},
	{Key: "author", Value: "我的名字"}, {Key: "brand_image", Value: ""},
	{Key: "code_theme", Value: ""}, {Key: "copyright", Value: ""},
	{Key: "description", Value: "站点描述信息"}, {Key: "disqus", Value: ""},
	{Key: "domain", Value: "www.your-domain.com"}, {Key: "extra_footer_code", Value: ""},
	{Key: "extra_footer_text", Value: ""}, {Key: "extra_header_code", Value: ""},
	{Key: "favicon", Value: "/favicon.ico"}, {Key: "language", Value: "zh-CN"},
	{Key: "social_image", Value: ""},
	{Key: "message_push_api", Value: ""}, {Key: "motto", Value: "我的格言"},
	{Key: "microblog_enabled", Value: "true"}, {Key: "microblog_path", Value: "microblog"},
	{Key: "microblog_title", Value: "片语"}, {Key: "microblog_description", Value: "随手记下的想法与日常。"},
	{Key: "nav_links", Value: `[{"key":"Meta","value":[{"link":"/","text":"首页"},{"link":"/archive","text":"存档"},{"link":"/page/links","text":"友链"},{"link":"/page/about","text":"关于"}]},{"key":"其他","value":[{"link":"/admin/","text":"后台管理"},{"link":"/feed.xml","text":"订阅博客"}]}]`},
	{Key: "port", Value: "3000"}, {Key: "site_name", Value: "站点名称"},
	{Key: "theme", Value: "bulma"}, {Key: "index_page_content", Value: ""},
	{Key: "use_cache", Value: "true"},
}

func openStore(path string) (*Store, error) {
	db, err := gorm.Open(sqlite.Open(path+"?_busy_timeout=5000&_journal_mode=WAL&_foreign_keys=on"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, err
	}
	s := &Store{db: db}
	if err := s.migrate(); err != nil {
		_ = s.Close()
		return nil, err
	}
	return s, nil
}

func (s *Store) Close() error {
	db, err := s.db.DB()
	if err != nil {
		return err
	}
	return db.Close()
}

func (s *Store) migrate() error {
	// Do not auto-alter Sequelize-created tables. SQLite table reconstruction
	// would be an unnecessary risk for historical installations.
	for _, model := range []any{&dbUser{}, &dbPage{}, &dbOption{}, &dbFile{}, &dbMicroPost{}, &dbDeviceAuthorization{}, &dbCLIToken{}, &dbPageView{}} {
		if !s.db.Migrator().HasTable(model) {
			if err := s.db.AutoMigrate(model); err != nil {
				return fmt.Errorf("gorm migrate: %w", err)
			}
		}
	}
	if err := s.db.Clauses(clause.OnConflict{DoNothing: true}).Create(&defaultOptions).Error; err != nil {
		return err
	}
	return s.db.Model(&dbOption{}).Where("key = ?", "theme").Update("value", "bulma").Error
}

func (s *Store) CreateDeviceAuthorization(ctx context.Context, deviceCode, userCode, clientName string, expiresAt time.Time) error {
	_ = s.db.WithContext(ctx).Where("expiresAt < ?", time.Now()).Delete(&dbDeviceAuthorization{}).Error
	row := dbDeviceAuthorization{DeviceCodeHash: credentialHash(deviceCode), UserCodeHash: credentialHash(strings.ToUpper(userCode)),
		ClientName: clientName, Status: "pending", ExpiresAt: expiresAt}
	return s.db.WithContext(ctx).Create(&row).Error
}

func (s *Store) DeviceAuthorizationByUserCode(ctx context.Context, userCode string) (dbDeviceAuthorization, error) {
	var row dbDeviceAuthorization
	err := s.db.WithContext(ctx).First(&row, "userCodeHash = ?", credentialHash(strings.ToUpper(userCode))).Error
	return row, err
}

func (s *Store) ApproveDeviceAuthorization(ctx context.Context, userCode string, user GitHubUser) (dbDeviceAuthorization, error) {
	now := time.Now().UTC()
	result := s.db.WithContext(ctx).Model(&dbDeviceAuthorization{}).
		Where("userCodeHash = ? AND status = ? AND expiresAt > ?", credentialHash(strings.ToUpper(userCode)), "pending", now).
		Updates(map[string]any{"status": "approved", "githubUserId": user.ID, "githubLogin": user.Login, "approvedAt": now})
	if result.Error != nil {
		return dbDeviceAuthorization{}, result.Error
	}
	if result.RowsAffected != 1 {
		return dbDeviceAuthorization{}, gorm.ErrRecordNotFound
	}
	return s.DeviceAuthorizationByUserCode(ctx, userCode)
}

func (s *Store) DenyDeviceAuthorization(ctx context.Context, userCode string) error {
	result := s.db.WithContext(ctx).Model(&dbDeviceAuthorization{}).
		Where("userCodeHash = ? AND status = ?", credentialHash(strings.ToUpper(userCode)), "pending").Update("status", "denied")
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != 1 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// ExchangeDeviceAuthorization consumes an approved device code exactly once
// and creates a separately revocable bearer credential.
func (s *Store) ExchangeDeviceAuthorization(ctx context.Context, deviceCode, rawToken string, tokenExpiresAt time.Time) (CLITokenInfo, string, error) {
	var info CLITokenInfo
	state := "invalid_grant"
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var row dbDeviceAuthorization
		result := tx.Where("deviceCodeHash = ?", credentialHash(deviceCode)).Limit(1).Find(&row)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}
		if time.Now().After(row.ExpiresAt) {
			state = "expired_token"
			return nil
		}
		if row.Status == "pending" {
			state = "authorization_pending"
			return nil
		}
		if row.Status == "denied" {
			state = "access_denied"
			return nil
		}
		result = tx.Where("deviceCodeHash = ? AND status = ?", row.DeviceCodeHash, "approved").Delete(&dbDeviceAuthorization{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			state = "invalid_grant"
			return nil
		}
		tokenRow := dbCLIToken{ID: uuid.NewString(), TokenHash: credentialHash(rawToken), ClientName: row.ClientName,
			GitHubUserID: row.GitHubUserID, GitHubLogin: row.GitHubLogin, ExpiresAt: tokenExpiresAt}
		if err := tx.Create(&tokenRow).Error; err != nil {
			return err
		}
		info = cliTokenInfo(tokenRow)
		state = "ok"
		return nil
	})
	return info, state, err
}

func (s *Store) ValidateCLIToken(ctx context.Context, rawToken string) (CLITokenInfo, error) {
	var row dbCLIToken
	result := s.db.WithContext(ctx).Where("tokenHash = ?", credentialHash(rawToken)).Limit(1).Find(&row)
	if result.Error != nil {
		return CLITokenInfo{}, result.Error
	}
	if result.RowsAffected == 0 {
		return CLITokenInfo{}, gorm.ErrRecordNotFound
	}
	if time.Now().After(row.ExpiresAt) {
		_ = s.db.WithContext(ctx).Delete(&row).Error
		return CLITokenInfo{}, gorm.ErrRecordNotFound
	}
	now := time.Now().UTC()
	_ = s.db.WithContext(ctx).Model(&row).Update("lastUsedAt", now).Error
	row.LastUsedAt = &now
	return cliTokenInfo(row), nil
}

func (s *Store) CLITokens(ctx context.Context) ([]CLITokenInfo, error) {
	_ = s.db.WithContext(ctx).Where("expiresAt < ?", time.Now()).Delete(&dbCLIToken{}).Error
	var rows []dbCLIToken
	if err := s.db.WithContext(ctx).Order("createdAt DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	result := make([]CLITokenInfo, 0, len(rows))
	for _, row := range rows {
		result = append(result, cliTokenInfo(row))
	}
	return result, nil
}

func (s *Store) RevokeCLIToken(ctx context.Context, id string) (bool, error) {
	result := s.db.WithContext(ctx).Where("id = ?", id).Delete(&dbCLIToken{})
	return result.RowsAffected == 1, result.Error
}

func cliTokenInfo(row dbCLIToken) CLITokenInfo {
	info := CLITokenInfo{ID: row.ID, ClientName: row.ClientName, GitHubUserID: row.GitHubUserID,
		GitHubLogin: row.GitHubLogin, ExpiresAt: formatDBTime(row.ExpiresAt), CreatedAt: formatDBTime(row.CreatedAt)}
	if row.LastUsedAt != nil {
		info.LastUsedAt = formatDBTime(*row.LastUsedAt)
	}
	return info
}

func (s *Store) Options(ctx context.Context) (map[string]string, error) {
	var rows []dbOption
	if err := s.db.WithContext(ctx).Order("key").Find(&rows).Error; err != nil {
		return nil, err
	}
	result := make(map[string]string, len(rows))
	for _, row := range rows {
		result[row.Key] = row.Value
	}
	result["theme"] = "bulma"
	return result, nil
}

func (s *Store) OptionList(ctx context.Context) ([]Option, error) {
	var rows []dbOption
	if err := s.db.WithContext(ctx).Order("key").Find(&rows).Error; err != nil {
		return nil, err
	}
	options := make([]Option, 0, len(rows))
	for _, row := range rows {
		options = append(options, Option{Key: row.Key, Value: row.Value})
	}
	return options, nil
}

func (s *Store) UpdateOptions(ctx context.Context, options map[string]any) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for key, raw := range options {
			key = strings.TrimSpace(key)
			if key == "" || len(key) > 100 {
				continue
			}
			value := fmt.Sprint(raw)
			if key == "theme" {
				value = "bulma"
			}
			if len(value) > 1<<20 {
				return errors.New("设置值过大")
			}
			row := dbOption{Key: key, Value: value}
			conflict := clause.OnConflict{Columns: []clause.Column{{Name: "key"}}, DoUpdates: clause.AssignmentColumns([]string{"value"})}
			if err := tx.Clauses(conflict).Create(&row).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *Store) pageQuery(ctx context.Context) *gorm.DB {
	return s.db.WithContext(ctx).Table("Pages AS p").
		Select("p.*, COALESCE(u.displayName, '') AS author, CAST(p.createdAt AS TEXT) AS created_at_raw, CAST(p.updatedAt AS TEXT) AS updated_at_raw").
		Joins("LEFT JOIN Users AS u ON u.id = p.UserId")
}

func toPage(row pageRow) Page {
	userID := ""
	if row.UserID != nil {
		userID = *row.UserID
	}
	return Page{ID: row.ID, Type: row.Type, Link: row.Link, PageStatus: row.PageStatus,
		CommentStatus: row.CommentStatus, Title: row.Title, Content: row.Content,
		Tag: row.Tag, Password: row.Password, View: row.View, UpVote: row.UpVote,
		DownVote: row.DownVote, Description: row.Description,
		CreatedAt: normalizeDBTime(row.CreatedAtRaw, row.CreatedAt), UpdatedAt: normalizeDBTime(row.UpdatedAtRaw, row.UpdatedAt),
		UserID: userID, Author: row.Author}
}

func normalizeDBTime(raw string, fallback time.Time) string {
	raw = strings.TrimSpace(raw)
	if raw != "" {
		layouts := []string{
			time.RFC3339Nano,
			"2006-01-02 15:04:05.999999999 -07:00",
			"2006-01-02 15:04:05.999999999Z07:00",
			"2006-01-02 15:04:05",
			"2006-01-02",
		}
		for _, layout := range layouts {
			if parsed, err := time.Parse(layout, raw); err == nil {
				return parsed.In(time.Local).Format(time.RFC3339)
			}
		}
		// Preserve a historical value we do not recognize. Templates can still
		// display its YYYY-MM-DD prefix instead of silently showing no date.
		return raw
	}
	return formatDBTime(fallback)
}

func formatDBTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}

func fromPage(page Page) dbPage {
	var userID *string
	if page.UserID != "" {
		value := page.UserID
		userID = &value
	}
	return dbPage{ID: page.ID, Type: page.Type, Link: page.Link, PageStatus: page.PageStatus,
		CommentStatus: page.CommentStatus, Title: page.Title, Content: page.Content,
		Tag: page.Tag, Password: page.Password, View: page.View, UpVote: page.UpVote,
		DownVote: page.DownVote, Description: page.Description, UserID: userID}
}

func (s *Store) findPages(query *gorm.DB) ([]Page, error) {
	var rows []pageRow
	if err := query.Scan(&rows).Error; err != nil {
		return nil, err
	}
	pages := make([]Page, 0, len(rows))
	for _, row := range rows {
		pages = append(pages, toPage(row))
	}
	return pages, nil
}

func (s *Store) PublicPages(ctx context.Context) ([]Page, error) {
	return s.findPages(s.pageQuery(ctx).Where("p.pageStatus IN ?", []int{StatusPublished, StatusTopped}).Order("p.pageStatus DESC, p.updatedAt DESC"))
}

func (s *Store) ArchivePages(ctx context.Context) ([]Page, error) {
	return s.findPages(s.pageQuery(ctx).Where("p.pageStatus != ?", StatusRecalled).Order("p.updatedAt ASC"))
}

func (s *Store) PagesByTag(ctx context.Context, tag string) ([]Page, error) {
	return s.findPages(s.pageQuery(ctx).Where("p.pageStatus != ? AND (';' || p.tag || ';') LIKE ?", StatusRecalled, "%;"+tag+";%").Order("p.updatedAt DESC"))
}

func (s *Store) PagesByMonth(ctx context.Context, year, month int) ([]Page, error) {
	prefix := fmt.Sprintf("%04d-%02d%%", year, month)
	return s.findPages(s.pageQuery(ctx).Where("p.pageStatus != ? AND CAST(p.createdAt AS TEXT) LIKE ?", StatusRecalled, prefix).Order("p.createdAt DESC"))
}

func (s *Store) AllPages(ctx context.Context) ([]Page, error) {
	return s.findPages(s.pageQuery(ctx).Order("p.updatedAt DESC"))
}

func (s *Store) SearchPages(ctx context.Context, keyword string, pageType int) ([]Page, error) {
	like := "%" + keyword + "%"
	query := s.pageQuery(ctx).Where("p.title LIKE ? OR p.description LIKE ? OR p.tag LIKE ? OR p.link LIKE ? OR p.content LIKE ?", like, like, like, like, like)
	if pageType >= 0 {
		query = query.Where("p.type = ?", pageType)
	}
	return s.findPages(query.Order("p.updatedAt DESC"))
}

func (s *Store) PageByID(ctx context.Context, id string) (Page, error) {
	var row pageRow
	result := s.pageQuery(ctx).Where("p.id = ?", id).Limit(1).Scan(&row)
	if result.Error != nil {
		return Page{}, result.Error
	}
	if row.ID == "" {
		return Page{}, gorm.ErrRecordNotFound
	}
	return toPage(row), nil
}

func (s *Store) PublicPageByLink(ctx context.Context, link string) (Page, error) {
	var row pageRow
	result := s.pageQuery(ctx).Where("p.link = ? AND p.pageStatus != ?", link, StatusRecalled).Order("p.updatedAt DESC").Limit(1).Scan(&row)
	if result.Error != nil {
		return Page{}, result.Error
	}
	if row.ID == "" {
		return Page{}, gorm.ErrRecordNotFound
	}
	return toPage(row), nil
}

func (s *Store) PageByLink(ctx context.Context, link string) (Page, error) {
	var row pageRow
	result := s.pageQuery(ctx).Where("p.link = ?", link).Order("p.updatedAt DESC").Limit(1).Scan(&row)
	if result.Error != nil {
		return Page{}, result.Error
	}
	if row.ID == "" {
		return Page{}, gorm.ErrRecordNotFound
	}
	return toPage(row), nil
}

func (s *Store) CreatePage(ctx context.Context, page *Page) error {
	page.ID = uuid.NewString()
	row := fromPage(*page)
	if err := s.db.WithContext(ctx).Create(&row).Error; err != nil {
		return err
	}
	page.CreatedAt, page.UpdatedAt = formatDBTime(row.CreatedAt), formatDBTime(row.UpdatedAt)
	return nil
}

func (s *Store) UpdatePage(ctx context.Context, page Page) (bool, error) {
	updates := map[string]any{"type": page.Type, "link": page.Link, "pageStatus": page.PageStatus,
		"commentStatus": page.CommentStatus, "title": page.Title, "content": page.Content,
		"tag": page.Tag, "password": page.Password, "description": page.Description, "updatedAt": time.Now().UTC()}
	result := s.db.WithContext(ctx).Model(&dbPage{}).Where("id = ?", page.ID).Updates(updates)
	return result.RowsAffected == 1, result.Error
}

func (s *Store) DeletePage(ctx context.Context, id string) (bool, error) {
	result := s.db.WithContext(ctx).Where("id = ?", id).Delete(&dbPage{})
	return result.RowsAffected == 1, result.Error
}

func (s *Store) Files(ctx context.Context, keyword string) ([]StoredFile, error) {
	query := s.db.WithContext(ctx).Model(&dbFile{}).Order("updatedAt DESC")
	if keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where("filename LIKE ? OR description LIKE ?", like, like)
	}
	var rows []dbFile
	if err := query.Find(&rows).Error; err != nil {
		return nil, err
	}
	files := make([]StoredFile, 0, len(rows))
	for _, row := range rows {
		files = append(files, StoredFile{ID: row.ID, Description: row.Description, Path: row.Path,
			Filename: row.Filename, CreatedAt: formatDBTime(row.CreatedAt), UpdatedAt: formatDBTime(row.UpdatedAt)})
	}
	return files, nil
}

func (s *Store) FileByID(ctx context.Context, id string) (StoredFile, error) {
	var row dbFile
	err := s.db.WithContext(ctx).First(&row, "id = ?", id).Error
	return StoredFile{ID: row.ID, Description: row.Description, Path: row.Path,
		Filename: row.Filename, CreatedAt: formatDBTime(row.CreatedAt), UpdatedAt: formatDBTime(row.UpdatedAt)}, err
}

func (s *Store) CreateFile(ctx context.Context, file StoredFile) error {
	row := dbFile{ID: file.ID, Description: file.Description, Path: file.Path, Filename: file.Filename}
	return s.db.WithContext(ctx).Create(&row).Error
}

func (s *Store) DeleteFile(ctx context.Context, id string) (bool, error) {
	result := s.db.WithContext(ctx).Where("id = ?", id).Delete(&dbFile{})
	return result.RowsAffected == 1, result.Error
}

func toMicroPost(row dbMicroPost) MicroPost {
	return MicroPost{ID: row.ID, Content: row.Content, Status: row.Status,
		CreatedAt: formatDBTime(row.CreatedAt), UpdatedAt: formatDBTime(row.UpdatedAt), Accent: microblogAccent(row.Content)}
}

func (s *Store) MicroPosts(ctx context.Context, publicOnly bool, offset, limit int) ([]MicroPost, int64, error) {
	query := s.db.WithContext(ctx).Model(&dbMicroPost{})
	if publicOnly {
		query = query.Where("status = ?", MicroPostPublic)
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var rows []dbMicroPost
	if err := query.Order("createdAt DESC, id DESC").Offset(offset).Limit(limit).Find(&rows).Error; err != nil {
		return nil, 0, err
	}
	posts := make([]MicroPost, 0, len(rows))
	for _, row := range rows {
		posts = append(posts, toMicroPost(row))
	}
	return posts, total, nil
}

func (s *Store) SearchMicroPosts(ctx context.Context, keyword string, status, offset, limit int) ([]MicroPost, int64, error) {
	query := s.db.WithContext(ctx).Model(&dbMicroPost{})
	if keyword = strings.TrimSpace(keyword); keyword != "" {
		query = query.Where("content LIKE ?", "%"+keyword+"%")
	}
	if status == MicroPostPrivate || status == MicroPostPublic {
		query = query.Where("status = ?", status)
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var rows []dbMicroPost
	if err := query.Order("createdAt DESC, id DESC").Offset(offset).Limit(limit).Find(&rows).Error; err != nil {
		return nil, 0, err
	}
	posts := make([]MicroPost, 0, len(rows))
	for _, row := range rows {
		posts = append(posts, toMicroPost(row))
	}
	return posts, total, nil
}

func (s *Store) MicroPostByID(ctx context.Context, id uint64) (MicroPost, error) {
	var row dbMicroPost
	err := s.db.WithContext(ctx).First(&row, "id = ?", id).Error
	return toMicroPost(row), err
}

func (s *Store) CreateMicroPost(ctx context.Context, post *MicroPost) error {
	row := dbMicroPost{Content: post.Content, Status: post.Status}
	// Status 0 is a meaningful private state. Select it explicitly so GORM
	// does not replace the zero value with the schema's public default.
	if err := s.db.WithContext(ctx).Select("Content", "Status").Create(&row).Error; err != nil {
		return err
	}
	*post = toMicroPost(row)
	return nil
}

func (s *Store) UpdateMicroPost(ctx context.Context, post MicroPost) (bool, error) {
	result := s.db.WithContext(ctx).Model(&dbMicroPost{}).Where("id = ?", post.ID).
		Updates(map[string]any{"content": post.Content, "status": post.Status, "updatedAt": time.Now().UTC()})
	return result.RowsAffected == 1, result.Error
}

func (s *Store) DeleteMicroPost(ctx context.Context, id uint64) (bool, error) {
	result := s.db.WithContext(ctx).Where("id = ?", id).Delete(&dbMicroPost{})
	return result.RowsAffected == 1, result.Error
}
