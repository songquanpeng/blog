package blog

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestCLIDeviceFlowIssuesRevocableAdminToken(t *testing.T) {
	store, err := openStore(filepath.Join(t.TempDir(), "data.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	sessions := newSessionStore([]byte("0123456789abcdef0123456789abcdef"), time.Hour)
	app := &App{store: store, sessions: sessions, cfg: Config{
		PublicURL: "https://blog.example", CLITokenTTL: 365 * 24 * time.Hour, DeviceCodeTTL: 10 * time.Minute,
	}}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/api/cli/device/code", app.createDeviceCode)
	router.POST("/api/cli/device/token", app.exchangeDeviceCode)
	router.GET("/api/cli/me", app.cliRequired(), app.cliIdentity)
	router.DELETE("/api/cli/token", app.cliRequired(), app.revokeCurrentCLIToken)
	admin := router.Group("/api")
	admin.Use(app.adminRequired())
	admin.POST("/cli/device/approve", app.approveDeviceCode)
	admin.GET("/option", app.getOptions)

	requestJSON := func(method, target string, body any, cookie *http.Cookie, bearer string) *httptest.ResponseRecorder {
		t.Helper()
		var encoded bytes.Buffer
		if body != nil {
			if err := json.NewEncoder(&encoded).Encode(body); err != nil {
				t.Fatal(err)
			}
		}
		request := httptest.NewRequest(method, target, &encoded)
		request.Header.Set("Content-Type", "application/json")
		if cookie != nil {
			request.AddCookie(cookie)
		}
		if bearer != "" {
			request.Header.Set("Authorization", "Bearer "+bearer)
		}
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, request)
		return recorder
	}

	created := requestJSON(http.MethodPost, "/api/cli/device/code", map[string]any{"clientName": "test agent"}, nil, "")
	if created.Code != http.StatusOK {
		t.Fatalf("create device code = %d %s", created.Code, created.Body.String())
	}
	var device struct {
		DeviceCode              string `json:"device_code"`
		UserCode                string `json:"user_code"`
		VerificationURIComplete string `json:"verification_uri_complete"`
	}
	if err := json.Unmarshal(created.Body.Bytes(), &device); err != nil {
		t.Fatal(err)
	}
	if device.DeviceCode == "" || !userCodePattern.MatchString(device.UserCode) || !strings.Contains(device.VerificationURIComplete, device.UserCode) {
		t.Fatalf("invalid device response: %#v", device)
	}
	var storedDevice dbDeviceAuthorization
	if err := store.db.First(&storedDevice).Error; err != nil {
		t.Fatal(err)
	}
	if storedDevice.DeviceCodeHash == device.DeviceCode || storedDevice.UserCodeHash == device.UserCode {
		t.Fatal("device credentials were stored in plaintext")
	}

	pending := requestJSON(http.MethodPost, "/api/cli/device/token", map[string]any{"device_code": device.DeviceCode}, nil, "")
	if pending.Code != http.StatusPreconditionRequired || !strings.Contains(pending.Body.String(), "authorization_pending") {
		t.Fatalf("pending exchange = %d %s", pending.Code, pending.Body.String())
	}

	sessionToken := strings.Repeat("s", 43)
	sessions.sessions[sessionToken] = &session{User: &GitHubUser{ID: 42, Login: "owner", IsAdmin: true}, ExpiresAt: time.Now().Add(time.Hour)}
	cookie := &http.Cookie{Name: sessionCookie, Value: sessionToken + "." + sessions.sign(sessionToken), Path: "/"}
	approved := requestJSON(http.MethodPost, "/api/cli/device/approve", map[string]any{"userCode": device.UserCode}, cookie, "")
	if approved.Code != http.StatusOK {
		t.Fatalf("approve = %d %s", approved.Code, approved.Body.String())
	}

	exchanged := requestJSON(http.MethodPost, "/api/cli/device/token", map[string]any{"device_code": device.DeviceCode}, nil, "")
	if exchanged.Code != http.StatusOK {
		t.Fatalf("exchange = %d %s", exchanged.Code, exchanged.Body.String())
	}
	var tokenPayload struct {
		AccessToken string       `json:"access_token"`
		ExpiresIn   int64        `json:"expires_in"`
		Token       CLITokenInfo `json:"token"`
	}
	if err := json.Unmarshal(exchanged.Body.Bytes(), &tokenPayload); err != nil {
		t.Fatal(err)
	}
	if tokenPayload.AccessToken == "" || tokenPayload.ExpiresIn != int64((365*24*time.Hour).Seconds()) || tokenPayload.Token.GitHubLogin != "owner" {
		t.Fatalf("invalid token payload: %#v", tokenPayload)
	}
	var storedToken dbCLIToken
	if err := store.db.First(&storedToken).Error; err != nil {
		t.Fatal(err)
	}
	if storedToken.TokenHash == tokenPayload.AccessToken {
		t.Fatal("access token was stored in plaintext")
	}

	reused := requestJSON(http.MethodPost, "/api/cli/device/token", map[string]any{"device_code": device.DeviceCode}, nil, "")
	if reused.Code != http.StatusBadRequest || !strings.Contains(reused.Body.String(), "invalid_grant") {
		t.Fatalf("reused exchange = %d %s", reused.Code, reused.Body.String())
	}
	options := requestJSON(http.MethodGet, "/api/option", nil, nil, tokenPayload.AccessToken)
	if options.Code != http.StatusOK {
		t.Fatalf("CLI token cannot use admin API = %d %s", options.Code, options.Body.String())
	}
	logout := requestJSON(http.MethodDelete, "/api/cli/token", nil, nil, tokenPayload.AccessToken)
	if logout.Code != http.StatusOK {
		t.Fatalf("revoke current token = %d %s", logout.Code, logout.Body.String())
	}
	unauthorized := requestJSON(http.MethodGet, "/api/option", nil, nil, tokenPayload.AccessToken)
	if unauthorized.Code != http.StatusUnauthorized {
		t.Fatalf("revoked token still works = %d %s", unauthorized.Code, unauthorized.Body.String())
	}
}

func TestCLIAssetsUseConfiguredBaseURL(t *testing.T) {
	gin.SetMode(gin.TestMode)
	dist := t.TempDir()
	artifact := "blog-cli-linux-amd64.gz"
	if err := os.WriteFile(filepath.Join(dist, artifact), []byte("go-binary-gzip"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dist, artifact+".sha256"), []byte("abc123\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	app := &App{cfg: Config{PublicURL: "https://blog.example/base"}, cliDistPath: dist}
	router := gin.New()
	router.GET("/cli/download/:artifact", app.cliDownload)
	router.GET("/cli/install.sh", app.cliInstaller)
	router.GET("/api/cli/info", app.cliInfo)

	for target, expected := range map[string]string{
		"/cli/download/" + artifact:             "go-binary-gzip",
		"/cli/download/" + artifact + ".sha256": "abc123",
		"/cli/install.sh":                       `base_url=${1:-'https://blog.example/base'}`,
		"/api/cli/info":                         `https://blog.example/base/cli/install.sh`,
	} {
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, target, nil))
		if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), expected) {
			t.Fatalf("%s = %d, missing %q in %s", target, recorder.Code, expected, recorder.Body.String())
		}
	}

	installer := httptest.NewRecorder()
	router.ServeHTTP(installer, httptest.NewRequest(http.MethodGet, "/cli/install.sh", nil))
	if strings.Contains(installer.Body.String(), "python3") || !strings.Contains(installer.Body.String(), "/cli/download/") || !strings.Contains(installer.Body.String(), "sha256") {
		t.Fatalf("installer is not standalone/checksummed: %s", installer.Body.String())
	}
	missing := httptest.NewRecorder()
	router.ServeHTTP(missing, httptest.NewRequest(http.MethodGet, "/cli/download/blog-cli-windows-amd64.gz", nil))
	if missing.Code != http.StatusNotFound {
		t.Fatalf("unsupported artifact = %d", missing.Code)
	}
}
