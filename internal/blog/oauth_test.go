package blog

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestGitHubLoginUsesStatePKCEAndCookieSecurityAttributes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	app := &App{
		cfg: Config{
			GitHubClientID:      "client",
			GitHubClientSecret:  "secret",
			GitHubAllowedUserID: 42,
			OAuthCallbackURL:    "https://blog.example/auth/github/callback",
		},
		sessions: newSessionStore([]byte("0123456789abcdef0123456789abcdef"), time.Hour),
	}
	router := gin.New()
	router.GET("/auth/github", app.githubLogin)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/auth/github", nil)
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusFound {
		t.Fatalf("status = %d, want 302", recorder.Code)
	}
	location, err := url.Parse(recorder.Header().Get("Location"))
	if err != nil {
		t.Fatal(err)
	}
	query := location.Query()
	for _, key := range []string{"state", "code_challenge", "code_challenge_method", "redirect_uri"} {
		if query.Get(key) == "" {
			t.Fatalf("OAuth redirect is missing %s", key)
		}
	}
	if query.Get("code_challenge_method") != "S256" {
		t.Fatalf("PKCE method = %q", query.Get("code_challenge_method"))
	}
	cookie := recorder.Header().Get("Set-Cookie")
	if !strings.Contains(cookie, "HttpOnly") || !strings.Contains(cookie, "SameSite=Lax") {
		t.Fatalf("session cookie lacks security attributes: %s", cookie)
	}
}
