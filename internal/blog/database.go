package blog

import (
	"context"
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

type DBPage = dbPage

type pageRow struct {
	DBPage
	Author string `gorm:"column:author"`
}

var defaultOptions = []dbOption{
	{Key: "ad", Value: ""}, {Key: "allow_comments", Value: "true"},
	{Key: "author", Value: "我的名字"}, {Key: "brand_image", Value: ""},
	{Key: "code_theme", Value: ""}, {Key: "copyright", Value: ""},
	{Key: "description", Value: "站点描述信息"}, {Key: "disqus", Value: ""},
	{Key: "domain", Value: "www.your-domain.com"}, {Key: "extra_footer_code", Value: ""},
	{Key: "extra_footer_text", Value: ""}, {Key: "extra_header_code", Value: ""},
	{Key: "favicon", Value: "/favicon.ico"}, {Key: "language", Value: "zh-CN"},
	{Key: "message_push_api", Value: ""}, {Key: "motto", Value: "我的格言"},
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
	for _, model := range []any{&dbUser{}, &dbPage{}, &dbOption{}, &dbFile{}} {
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
		Select("p.*, COALESCE(u.displayName, '') AS author").
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
		CreatedAt: formatDBTime(row.CreatedAt), UpdatedAt: formatDBTime(row.UpdatedAt),
		UserID: userID, Author: row.Author}
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
	return s.findPages(s.pageQuery(ctx).Where("p.pageStatus != ?", StatusRecalled).Order("p.createdAt DESC"))
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
	query := s.pageQuery(ctx).Where("p.title LIKE ? OR p.description LIKE ? OR p.tag LIKE ? OR p.link LIKE ?", like, like, like, like)
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

func (s *Store) IncrementView(ctx context.Context, id string) {
	_ = s.db.WithContext(ctx).Model(&dbPage{}).Where("id = ?", id).UpdateColumn("view", gorm.Expr("COALESCE(view, 0) + 1")).Error
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
