package blog

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	githubProxyModeOption = "github_proxy_mode"
	githubProxyURLOption  = "github_proxy_url"
)

type githubProxyConfig struct {
	Mode      string `json:"mode"`
	ProxyURL  string `json:"proxyUrl"`
	Forced    bool   `json:"forced,omitempty"`
	RouteName string `json:"routeName,omitempty"`
}

type githubConnectivityCheck struct {
	Name       string `json:"name"`
	URL        string `json:"url"`
	StatusCode int    `json:"statusCode"`
	LatencyMS  int64  `json:"latencyMs"`
}

func directHTTPClient(timeout time.Duration) *http.Client {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	// Direct mode is deliberately independent of process-wide HTTP_PROXY and
	// HTTPS_PROXY variables. Only this feature's explicit setting may reroute
	// OAuth credentials.
	transport.Proxy = nil
	return &http.Client{Timeout: timeout, Transport: transport}
}

func validateGitHubProxyConfig(config githubProxyConfig) error {
	config.Mode = strings.ToLower(strings.TrimSpace(config.Mode))
	config.ProxyURL = strings.TrimSpace(config.ProxyURL)
	if config.Mode != "direct" && config.Mode != "proxy" {
		return errors.New("GitHub 网络出口必须是 direct 或 proxy")
	}
	if config.Mode == "proxy" && config.ProxyURL == "" {
		return errors.New("使用代理出口时必须填写代理地址")
	}
	if config.ProxyURL == "" {
		return nil
	}
	parsed, err := url.Parse(config.ProxyURL)
	if err != nil || parsed.Host == "" {
		return errors.New("GitHub 代理地址格式无效")
	}
	switch strings.ToLower(parsed.Scheme) {
	case "http", "https", "socks5", "socks5h":
	default:
		return errors.New("GitHub 代理仅支持 http、https 或 socks5")
	}
	if parsed.User != nil {
		return errors.New("代理地址不能包含用户名或密码，请使用受限的私有隧道")
	}
	if parsed.RawQuery != "" || parsed.Fragment != "" || (parsed.Path != "" && parsed.Path != "/") {
		return errors.New("GitHub 代理地址不能包含路径、查询参数或片段")
	}
	return nil
}

func (a *App) effectiveGitHubProxyConfig(ctx context.Context) (githubProxyConfig, error) {
	config := githubProxyConfig{Mode: a.cfg.GitHubProxyMode, ProxyURL: a.cfg.GitHubProxyURL}
	if config.Mode == "" {
		config.Mode = "direct"
	}
	if a.store != nil {
		options, err := a.store.Options(ctx)
		if err != nil {
			return githubProxyConfig{}, err
		}
		if value, ok := options[githubProxyModeOption]; ok && strings.TrimSpace(value) != "" {
			config.Mode = strings.ToLower(strings.TrimSpace(value))
		}
		if value, ok := options[githubProxyURLOption]; ok {
			config.ProxyURL = strings.TrimSpace(value)
		}
	}
	if a.cfg.GitHubProxyForceMode != "" {
		config.Mode = a.cfg.GitHubProxyForceMode
		config.Forced = true
		// A forced proxy mode is the recovery path when a saved admin setting
		// prevents login, so its environment URL must override the database too.
		if config.Mode == "proxy" && a.cfg.GitHubProxyURL != "" {
			config.ProxyURL = a.cfg.GitHubProxyURL
		}
	}
	if err := validateGitHubProxyConfig(config); err != nil {
		return githubProxyConfig{}, err
	}
	config.RouteName = map[bool]string{true: "proxy", false: "direct"}[config.Mode == "proxy"]
	return config, nil
}

func (a *App) githubHTTPClient(config githubProxyConfig) (*http.Client, error) {
	if err := validateGitHubProxyConfig(config); err != nil {
		return nil, err
	}
	base := a.httpClient
	if base == nil {
		base = directHTTPClient(12 * time.Second)
	}
	if config.Mode == "direct" {
		return base, nil
	}
	proxyURL, _ := url.Parse(config.ProxyURL)
	var transport *http.Transport
	if base.Transport == nil {
		transport = http.DefaultTransport.(*http.Transport).Clone()
	} else {
		configured, ok := base.Transport.(*http.Transport)
		if !ok {
			return nil, errors.New("GitHub 代理需要标准 HTTP transport")
		}
		transport = configured.Clone()
	}
	transport.Proxy = http.ProxyURL(proxyURL)
	client := *base
	client.Transport = transport
	return &client, nil
}

func (a *App) getGitHubNetworkConfig(c *gin.Context) {
	config, err := a.effectiveGitHubProxyConfig(c.Request.Context())
	if err != nil {
		a.apiFailure(c, "读取 GitHub 网络设置失败", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "ok", "config": config})
}

func (a *App) testGitHubNetwork(c *gin.Context) {
	var requested githubProxyConfig
	if err := c.ShouldBindJSON(&requested); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "GitHub 网络设置参数无效"})
		return
	}
	requested.Mode = strings.ToLower(strings.TrimSpace(requested.Mode))
	requested.ProxyURL = strings.TrimSpace(requested.ProxyURL)
	if a.cfg.GitHubProxyForceMode != "" {
		requested.Mode = a.cfg.GitHubProxyForceMode
		requested.Forced = true
	}
	if err := validateGitHubProxyConfig(requested); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": err.Error()})
		return
	}
	client, err := a.githubHTTPClient(requested)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": err.Error()})
		return
	}
	checks := make([]githubConnectivityCheck, 0, 2)
	for _, target := range []struct{ name, url string }{
		{name: "GitHub OAuth", url: "https://github.com/login/oauth/access_token"},
		{name: "GitHub API", url: "https://api.github.com/rate_limit"},
	} {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
		started := time.Now()
		req, requestErr := http.NewRequestWithContext(ctx, http.MethodGet, target.url, nil)
		if requestErr == nil {
			req.Header.Set("Accept", "application/vnd.github+json")
			req.Header.Set("User-Agent", "songquanpeng-blog-connectivity-check")
		}
		if requestErr != nil {
			cancel()
			c.JSON(http.StatusInternalServerError, gin.H{"status": false, "message": requestErr.Error()})
			return
		}
		response, requestErr := client.Do(req)
		latency := time.Since(started).Milliseconds()
		cancel()
		if requestErr != nil {
			c.JSON(http.StatusBadGateway, gin.H{"status": false, "message": fmt.Sprintf("%s 连接失败：%v", target.name, requestErr)})
			return
		}
		response.Body.Close()
		checks = append(checks, githubConnectivityCheck{Name: target.name, URL: target.url, StatusCode: response.StatusCode, LatencyMS: latency})
	}
	routeName := map[bool]string{true: "proxy", false: "direct"}[requested.Mode == "proxy"]
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "GitHub 连接正常", "route": routeName, "checks": checks})
}
