package blog

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type oauthTokenResponse struct {
	AccessToken string `json:"access_token"`
	Error       string `json:"error"`
	Description string `json:"error_description"`
}

func (a *App) githubLogin(c *gin.Context) {
	if err := a.oauthConfigured(); err != nil {
		a.renderError(c, http.StatusServiceUnavailable, "GitHub 登录未配置", err.Error())
		return
	}
	token, _, err := a.sessions.ensure(c)
	if err != nil {
		a.renderError(c, http.StatusInternalServerError, "无法建立登录会话", err.Error())
		return
	}
	state, err := randomToken(32)
	if err != nil {
		a.renderError(c, http.StatusInternalServerError, "无法生成 OAuth state", err.Error())
		return
	}
	verifier, err := randomToken(32)
	if err != nil {
		a.renderError(c, http.StatusInternalServerError, "无法生成 PKCE verifier", err.Error())
		return
	}
	if err := a.sessions.update(token, func(entry *session) {
		entry.OAuthState = state
		entry.PKCEVerifier = verifier
		entry.OAuthExpires = time.Now().Add(10 * time.Minute)
		entry.OAuthReturnTo = safeOAuthReturnTo(c.Query("return_to"))
	}); err != nil {
		a.renderError(c, http.StatusInternalServerError, "无法保存登录会话", err.Error())
		return
	}
	query := url.Values{
		"client_id":             {a.cfg.GitHubClientID},
		"redirect_uri":          {a.callbackURL(c)},
		"state":                 {state},
		"code_challenge":        {pkceChallenge(verifier)},
		"code_challenge_method": {"S256"},
		"allow_signup":          {"false"},
	}
	c.Redirect(http.StatusFound, "https://github.com/login/oauth/authorize?"+query.Encode())
}

func (a *App) githubCallback(c *gin.Context) {
	token, entry, ok := a.sessions.get(c)
	if !ok || entry.OAuthState == "" || time.Now().After(entry.OAuthExpires) || subtleString(entry.OAuthState, c.Query("state")) == false {
		a.renderError(c, http.StatusBadRequest, "GitHub 登录失败", "OAuth state 无效或已过期")
		return
	}
	code := strings.TrimSpace(c.Query("code"))
	if code == "" {
		a.renderError(c, http.StatusBadRequest, "GitHub 登录失败", "GitHub 未返回授权码")
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	network, err := a.effectiveGitHubProxyConfig(ctx)
	if err != nil {
		a.renderError(c, http.StatusBadGateway, "GitHub 登录失败", "GitHub 网络设置无效："+err.Error())
		return
	}
	client, err := a.githubHTTPClient(network)
	if err != nil {
		a.renderError(c, http.StatusBadGateway, "GitHub 登录失败", "无法建立 GitHub 网络出口："+err.Error())
		return
	}
	accessToken, err := a.exchangeGitHubCodeWithClient(ctx, client, code, entry.PKCEVerifier, a.callbackURL(c))
	if err != nil {
		a.renderError(c, http.StatusBadGateway, "GitHub 登录失败", fmt.Sprintf("经 %s 出口请求失败：%v", network.RouteName, err))
		return
	}
	user, err := a.fetchGitHubUserWithClient(ctx, client, accessToken)
	if err != nil {
		a.renderError(c, http.StatusBadGateway, "GitHub 身份校验失败", fmt.Sprintf("经 %s 出口请求失败：%v", network.RouteName, err))
		return
	}
	if !a.allowedGitHubUser(user) {
		a.sessions.delete(c)
		a.renderError(c, http.StatusForbidden, "访问被拒绝", "该 GitHub 账户不是本站管理员")
		return
	}
	user.IsAdmin = true
	returnTo := entry.OAuthReturnTo
	if err := a.sessions.update(token, func(entry *session) {
		entry.User = &user
		entry.OAuthState = ""
		entry.PKCEVerifier = ""
		entry.OAuthExpires = time.Time{}
		entry.OAuthReturnTo = ""
	}); err != nil {
		a.renderError(c, http.StatusInternalServerError, "无法保存登录会话", err.Error())
		return
	}
	if returnTo == "" {
		returnTo = "/admin/"
	}
	c.Redirect(http.StatusFound, returnTo)
}

func safeOAuthReturnTo(value string) string {
	value = strings.TrimSpace(value)
	if value == "" || strings.ContainsAny(value, "\\\r\n") || strings.HasPrefix(value, "//") {
		return ""
	}
	parsed, err := url.Parse(value)
	if err != nil || parsed.IsAbs() || parsed.Host != "" || parsed.Path != "/admin/" {
		return ""
	}
	return parsed.String()
}

func (a *App) oauthConfigured() error {
	if a.cfg.GitHubClientID == "" || a.cfg.GitHubClientSecret == "" {
		return errors.New("请设置 GITHUB_CLIENT_ID 与 GITHUB_CLIENT_SECRET")
	}
	if a.cfg.GitHubAllowedUserID == 0 && a.cfg.GitHubAllowedLogin == "" {
		return errors.New("请设置 GITHUB_ALLOWED_USER_ID（推荐）或 GITHUB_ALLOWED_LOGIN")
	}
	return nil
}

func (a *App) callbackURL(c *gin.Context) string {
	if a.cfg.OAuthCallbackURL != "" {
		return a.cfg.OAuthCallbackURL
	}
	if a.cfg.PublicURL != "" {
		return a.cfg.PublicURL + "/auth/github/callback"
	}
	scheme := "http"
	if requestSecure(c) {
		scheme = "https"
	}
	return scheme + "://" + c.Request.Host + "/auth/github/callback"
}

func (a *App) exchangeGitHubCode(ctx context.Context, code, verifier, callback string) (string, error) {
	return a.exchangeGitHubCodeWithClient(ctx, a.httpClient, code, verifier, callback)
}

func (a *App) exchangeGitHubCodeWithClient(ctx context.Context, client *http.Client, code, verifier, callback string) (string, error) {
	form := url.Values{
		"client_id": {a.cfg.GitHubClientID}, "client_secret": {a.cfg.GitHubClientSecret},
		"code": {code}, "redirect_uri": {callback}, "code_verifier": {verifier},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://github.com/login/oauth/access_token", strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "songquanpeng-blog")
	response, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer response.Body.Close()
	var payload oauthTokenResponse
	if err := json.NewDecoder(io.LimitReader(response.Body, 1<<20)).Decode(&payload); err != nil {
		return "", err
	}
	if response.StatusCode != http.StatusOK || payload.AccessToken == "" {
		return "", fmt.Errorf("GitHub token exchange failed: %s %s", payload.Error, payload.Description)
	}
	return payload.AccessToken, nil
}

func (a *App) fetchGitHubUser(ctx context.Context, token string) (GitHubUser, error) {
	return a.fetchGitHubUserWithClient(ctx, a.httpClient, token)
}

func (a *App) fetchGitHubUserWithClient(ctx context.Context, client *http.Client, token string) (GitHubUser, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.github.com/user", nil)
	if err != nil {
		return GitHubUser{}, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", "songquanpeng-blog")
	response, err := client.Do(req)
	if err != nil {
		return GitHubUser{}, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return GitHubUser{}, fmt.Errorf("GitHub user API returned %s", response.Status)
	}
	var user GitHubUser
	if err := json.NewDecoder(io.LimitReader(response.Body, 1<<20)).Decode(&user); err != nil {
		return GitHubUser{}, err
	}
	if user.ID == 0 || user.Login == "" {
		return GitHubUser{}, errors.New("GitHub 返回了无效用户")
	}
	return user, nil
}

func (a *App) allowedGitHubUser(user GitHubUser) bool {
	if a.cfg.GitHubAllowedUserID != 0 {
		return user.ID == a.cfg.GitHubAllowedUserID
	}
	return strings.EqualFold(user.Login, a.cfg.GitHubAllowedLogin)
}

func subtleString(left, right string) bool {
	if len(left) != len(right) {
		return false
	}
	var diff byte
	for i := range left {
		diff |= left[i] ^ right[i]
	}
	return diff == 0
}
