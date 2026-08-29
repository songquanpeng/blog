package blog

import (
	_ "embed"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

//go:embed cli_dist/blog-cli.py
var blogCLISource string

const deviceAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

var userCodePattern = regexp.MustCompile(`^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$`)

func (a *App) cliTokenTTL() time.Duration {
	if a.cfg.CLITokenTTL > 0 {
		return a.cfg.CLITokenTTL
	}
	return 365 * 24 * time.Hour
}

func (a *App) deviceCodeTTL() time.Duration {
	if a.cfg.DeviceCodeTTL > 0 {
		return a.cfg.DeviceCodeTTL
	}
	return 10 * time.Minute
}

func (a *App) requestBaseURL(c *gin.Context) string {
	if a.cfg.PublicURL != "" {
		return strings.TrimRight(a.cfg.PublicURL, "/")
	}
	scheme := "http"
	if requestSecure(c) {
		scheme = "https"
	}
	parsed, err := url.Parse(scheme + "://" + c.Request.Host)
	if err != nil || parsed.Host == "" || strings.ContainsAny(parsed.Host, "'\"`$;\\ \t\r\n") {
		return scheme + "://localhost:" + a.cfg.Port
	}
	return strings.TrimRight(parsed.String(), "/")
}

func shellQuote(value string) string { return "'" + strings.ReplaceAll(value, "'", "'\"'\"'") + "'" }

func (a *App) cliInfo(c *gin.Context) {
	base := a.requestBaseURL(c)
	c.JSON(http.StatusOK, gin.H{
		"status": true, "message": "ok", "name": "blog-cli", "baseUrl": base,
		"installCommand":            "curl -fsSL " + shellQuote(base+"/cli/install.sh") + " | sh",
		"tokenLifetimeSeconds":      int64(a.cliTokenTTL().Seconds()),
		"deviceCodeLifetimeSeconds": int64(a.deviceCodeTTL().Seconds()),
		"agentHint":                 "安装后运行 blog-cli help --json 获取完整的机器可读命令清单；非交互输出默认使用 JSON。",
	})
}

func randomUserCode() (string, error) {
	raw, err := randomToken(12)
	if err != nil {
		return "", err
	}
	var code strings.Builder
	for index := 0; index < 8; index++ {
		code.WriteByte(deviceAlphabet[int(raw[index])%len(deviceAlphabet)])
		if index == 3 {
			code.WriteByte('-')
		}
	}
	return code.String(), nil
}

func (a *App) createDeviceCode(c *gin.Context) {
	var input struct {
		ClientName string `json:"clientName"`
	}
	_ = c.ShouldBindJSON(&input)
	input.ClientName = strings.TrimSpace(input.ClientName)
	if input.ClientName == "" {
		input.ClientName = "blog-cli"
	}
	if len([]rune(input.ClientName)) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "error": "invalid_client", "message": "客户端名称不能超过 100 个字符"})
		return
	}
	deviceCode, err := randomToken(32)
	if err != nil {
		a.apiFailure(c, "无法生成 device code", err)
		return
	}
	var userCode string
	for attempt := 0; attempt < 5; attempt++ {
		userCode, err = randomUserCode()
		if err != nil {
			break
		}
		expiresAt := time.Now().UTC().Add(a.deviceCodeTTL())
		err = a.store.CreateDeviceAuthorization(c.Request.Context(), deviceCode, userCode, input.ClientName, expiresAt)
		if err == nil {
			base := a.requestBaseURL(c)
			verification := base + "/admin/#/cli"
			c.Header("Cache-Control", "no-store")
			c.JSON(http.StatusOK, gin.H{"status": true, "device_code": deviceCode, "user_code": userCode,
				"verification_uri": verification, "verification_uri_complete": verification + "?code=" + url.QueryEscape(userCode),
				"expires_in": int64(a.deviceCodeTTL().Seconds()), "interval": 5})
			return
		}
	}
	a.apiFailure(c, "无法创建 device flow", err)
}

func (a *App) exchangeDeviceCode(c *gin.Context) {
	var input struct {
		DeviceCode string `json:"device_code"`
		GrantType  string `json:"grant_type"`
	}
	if err := c.ShouldBindJSON(&input); err != nil || strings.TrimSpace(input.DeviceCode) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "error": "invalid_request", "message": "缺少 device_code"})
		return
	}
	if input.GrantType != "" && input.GrantType != "urn:ietf:params:oauth:grant-type:device_code" {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "error": "unsupported_grant_type", "message": "grant_type 无效"})
		return
	}
	rawToken, err := randomToken(32)
	if err != nil {
		a.apiFailure(c, "无法签发 CLI token", err)
		return
	}
	info, state, err := a.store.ExchangeDeviceAuthorization(c.Request.Context(), input.DeviceCode, rawToken, time.Now().UTC().Add(a.cliTokenTTL()))
	if err != nil && err != gorm.ErrRecordNotFound {
		a.apiFailure(c, "无法兑换 device code", err)
		return
	}
	c.Header("Cache-Control", "no-store")
	if state != "ok" {
		status := http.StatusBadRequest
		if state == "authorization_pending" {
			status = http.StatusPreconditionRequired
		}
		c.JSON(status, gin.H{"status": false, "error": state, "message": deviceErrorMessage(state)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "access_token": rawToken, "token_type": "Bearer",
		"expires_in": int64(a.cliTokenTTL().Seconds()), "token": info})
}

func deviceErrorMessage(state string) string {
	switch state {
	case "authorization_pending":
		return "等待管理员在浏览器中批准"
	case "expired_token":
		return "device code 已过期，请重新登录"
	case "access_denied":
		return "管理员拒绝了本次授权"
	default:
		return "device code 无效或已被兑换"
	}
}

func normalizeUserCode(value string) string {
	value = strings.ToUpper(strings.TrimSpace(value))
	value = strings.ReplaceAll(value, " ", "")
	if len(value) == 8 && !strings.Contains(value, "-") {
		value = value[:4] + "-" + value[4:]
	}
	return value
}

func (a *App) deviceCodeStatus(c *gin.Context) {
	code := normalizeUserCode(c.Param("code"))
	if !userCodePattern.MatchString(code) {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "授权码格式无效"})
		return
	}
	row, err := a.store.DeviceAuthorizationByUserCode(c.Request.Context(), code)
	if err != nil || time.Now().After(row.ExpiresAt) {
		c.JSON(http.StatusNotFound, gin.H{"status": false, "message": "授权请求不存在或已过期"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "device": gin.H{"userCode": code, "clientName": row.ClientName,
		"state": row.Status, "expiresAt": formatDBTime(row.ExpiresAt)}})
}

func (a *App) approveDeviceCode(c *gin.Context) { a.decideDeviceCode(c, true) }
func (a *App) denyDeviceCode(c *gin.Context)    { a.decideDeviceCode(c, false) }

func (a *App) decideDeviceCode(c *gin.Context, approve bool) {
	var input struct {
		UserCode string `json:"userCode"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "授权参数无效"})
		return
	}
	code := normalizeUserCode(input.UserCode)
	if !userCodePattern.MatchString(code) {
		c.JSON(http.StatusBadRequest, gin.H{"status": false, "message": "授权码格式无效"})
		return
	}
	if approve {
		user, _ := c.Get("githubUser")
		_, err := a.store.ApproveDeviceAuthorization(c.Request.Context(), code, user.(GitHubUser))
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"status": false, "message": "授权请求不存在、已过期或已处理"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": true, "message": "CLI 已授权，可以返回终端继续登录", "userCode": code})
		return
	}
	if err := a.store.DenyDeviceAuthorization(c.Request.Context(), code); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": false, "message": "授权请求不存在或已处理"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "已拒绝 CLI 授权", "userCode": code})
}

func bearerValue(c *gin.Context) string {
	header := strings.TrimSpace(c.GetHeader("Authorization"))
	parts := strings.Fields(header)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return parts[1]
}

func (a *App) authenticateCLIToken(c *gin.Context) (CLITokenInfo, bool) {
	if a.store == nil {
		return CLITokenInfo{}, false
	}
	raw := bearerValue(c)
	if raw == "" {
		return CLITokenInfo{}, false
	}
	info, err := a.store.ValidateCLIToken(c.Request.Context(), raw)
	return info, err == nil
}

func (a *App) cliRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		info, ok := a.authenticateCLIToken(c)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"status": false, "error": "authentication_required",
				"message": "CLI token 无效或已过期", "hint": "运行 blog-cli auth login 重新授权"})
			return
		}
		c.Set("cliToken", info)
		c.Next()
	}
}

func (a *App) cliIdentity(c *gin.Context) {
	info, _ := c.Get("cliToken")
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "ok", "token": info})
}

func (a *App) revokeCurrentCLIToken(c *gin.Context) {
	info, _ := c.Get("cliToken")
	deleted, err := a.store.RevokeCLIToken(c.Request.Context(), info.(CLITokenInfo).ID)
	if err != nil {
		a.apiFailure(c, "撤销 CLI token 失败", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": deleted, "message": "CLI token 已撤销"})
}

func (a *App) listCLITokens(c *gin.Context) {
	tokens, err := a.store.CLITokens(c.Request.Context())
	if err != nil {
		a.apiFailure(c, "读取 CLI token 失败", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": true, "message": "ok", "tokens": tokens})
}

func (a *App) revokeCLIToken(c *gin.Context) {
	deleted, err := a.store.RevokeCLIToken(c.Request.Context(), c.Param("id"))
	if err != nil {
		a.apiFailure(c, "撤销 CLI token 失败", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": deleted, "message": map[bool]string{true: "CLI token 已撤销", false: "CLI token 不存在"}[deleted]})
}

func (a *App) cliDownload(c *gin.Context) {
	source := strings.ReplaceAll(blogCLISource, `"__BLOG_BASE_URL__"`, strconv.Quote(a.requestBaseURL(c)))
	c.Header("Content-Type", "text/x-python; charset=utf-8")
	c.Header("Content-Disposition", `attachment; filename="blog-cli"`)
	c.Header("Cache-Control", "no-store")
	c.String(http.StatusOK, "%s", source)
}

func (a *App) cliInstaller(c *gin.Context) {
	base := a.requestBaseURL(c)
	script := fmt.Sprintf(`#!/bin/sh
set -eu
base_url=${1:-%s}
install_dir=${BLOG_CLI_INSTALL_DIR:-"$HOME/.local/bin"}
if ! command -v python3 >/dev/null 2>&1; then
  printf 'blog-cli requires Python 3.9 or newer\n' >&2
  exit 1
fi
mkdir -p "$install_dir"
temporary=$(mktemp "${TMPDIR:-/tmp}/blog-cli.XXXXXX")
trap 'rm -f "$temporary"' EXIT HUP INT TERM
curl -fsSL "$base_url/cli/blog-cli" -o "$temporary"
chmod 0755 "$temporary"
mv "$temporary" "$install_dir/blog-cli"
trap - EXIT HUP INT TERM
printf 'blog-cli installed at %%s\n' "$install_dir/blog-cli"
case ":$PATH:" in
  *":$install_dir:"*) ;;
  *) printf 'Add %%s to PATH, then run: blog-cli auth login\n' "$install_dir" ;;
esac
`, shellQuote(base))
	c.Header("Content-Type", "text/x-shellscript; charset=utf-8")
	c.Header("Content-Disposition", `attachment; filename="install.sh"`)
	c.Header("Cache-Control", "no-store")
	c.String(http.StatusOK, "%s", script)
}
