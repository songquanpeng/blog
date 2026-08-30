package blog

import (
	"crypto/rand"
	"encoding/base64"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port                string
	DatabasePath        string
	UploadPath          string
	AdminPath           string
	TemplateGlob        string
	IndexPath           string
	DefaultIndexPath    string
	TrustedProxies      []string
	SessionSecret       []byte
	AllowUnsafeHTML     bool
	EnableShutdown      bool
	MaxUploadBytes      int64
	SessionTTL          time.Duration
	CLITokenTTL         time.Duration
	DeviceCodeTTL       time.Duration
	GitHubClientID      string
	GitHubClientSecret  string
	GitHubAllowedLogin  string
	GitHubAllowedUserID int64
	OAuthCallbackURL    string
	PublicURL           string
	AnalyticsLocation   *time.Location
}

func loadConfig() (Config, error) {
	analyticsLocation, err := time.LoadLocation(env("BLOG_ANALYTICS_TIMEZONE", "Asia/Shanghai"))
	if err != nil {
		return Config{}, err
	}
	cfg := Config{
		Port:               env("PORT", "3000"),
		DatabasePath:       env("SQLITE_PATH", "./data/data.db"),
		UploadPath:         env("UPLOAD_PATH", "./data/upload"),
		AdminPath:          env("ADMIN_PATH", "./public/admin"),
		TemplateGlob:       env("TEMPLATE_GLOB", "./templates/*.gohtml"),
		IndexPath:          env("INDEX_PATH", "./data/index"),
		DefaultIndexPath:   env("DEFAULT_INDEX_PATH", "./data/index"),
		AllowUnsafeHTML:    envBool("BLOG_ALLOW_UNSAFE_HTML", true),
		EnableShutdown:     envBool("BLOG_ENABLE_SHUTDOWN", false),
		MaxUploadBytes:     int64(envInt("MAX_UPLOAD_MB", 20)) << 20,
		SessionTTL:         time.Duration(envInt("SESSION_TTL_HOURS", 24)) * time.Hour,
		CLITokenTTL:        time.Duration(envInt("CLI_TOKEN_TTL_HOURS", 365*24)) * time.Hour,
		DeviceCodeTTL:      time.Duration(envInt("CLI_DEVICE_CODE_TTL_MINUTES", 10)) * time.Minute,
		GitHubClientID:     strings.TrimSpace(os.Getenv("GITHUB_CLIENT_ID")),
		GitHubClientSecret: strings.TrimSpace(os.Getenv("GITHUB_CLIENT_SECRET")),
		GitHubAllowedLogin: strings.TrimSpace(os.Getenv("GITHUB_ALLOWED_LOGIN")),
		OAuthCallbackURL:   strings.TrimSpace(os.Getenv("GITHUB_CALLBACK_URL")),
		PublicURL:          strings.TrimRight(strings.TrimSpace(os.Getenv("PUBLIC_URL")), "/"),
		AnalyticsLocation:  analyticsLocation,
	}
	if id, err := strconv.ParseInt(strings.TrimSpace(os.Getenv("GITHUB_ALLOWED_USER_ID")), 10, 64); err == nil {
		cfg.GitHubAllowedUserID = id
	}
	if raw := strings.TrimSpace(os.Getenv("TRUSTED_PROXIES")); raw != "" {
		for _, proxy := range strings.Split(raw, ",") {
			if proxy = strings.TrimSpace(proxy); proxy != "" {
				cfg.TrustedProxies = append(cfg.TrustedProxies, proxy)
			}
		}
	}
	if secret := os.Getenv("SESSION_SECRET"); len(secret) >= 32 {
		cfg.SessionSecret = []byte(secret)
	} else {
		cfg.SessionSecret = make([]byte, 32)
		if _, err := rand.Read(cfg.SessionSecret); err != nil {
			return Config{}, err
		}
	}
	for _, dir := range []string{filepath.Dir(cfg.DatabasePath), cfg.UploadPath} {
		if err := os.MkdirAll(dir, 0o750); err != nil {
			return Config{}, err
		}
	}
	return cfg, nil
}

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	return err == nil && parsed
}

func envInt(key string, fallback int) int {
	value, err := strconv.Atoi(strings.TrimSpace(os.Getenv(key)))
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func randomToken(size int) (string, error) {
	buf := make([]byte, size)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}
