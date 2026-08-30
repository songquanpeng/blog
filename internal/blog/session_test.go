package blog

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func sessionTestContext() (*gin.Context, *httptest.ResponseRecorder) {
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, "https://blog.example/admin/", nil)
	return context, recorder
}

func TestBrowserSessionSurvivesStoreRestart(t *testing.T) {
	gin.SetMode(gin.TestMode)
	store, err := openStore(t.TempDir() + "/data.db")
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()

	secret := []byte("0123456789abcdef0123456789abcdef")
	first := newSessionStore(secret, 365*24*time.Hour, store)
	context, recorder := sessionTestContext()
	token, _, err := first.new(context)
	if err != nil {
		t.Fatal(err)
	}
	if err := first.update(token, func(entry *session) {
		entry.User = &GitHubUser{ID: 42, Login: "owner", IsAdmin: true}
	}); err != nil {
		t.Fatal(err)
	}

	response := recorder.Result()
	cookies := response.Cookies()
	if len(cookies) != 1 {
		t.Fatalf("session cookies = %d", len(cookies))
	}
	if cookies[0].MaxAge != 365*24*60*60 || cookies[0].Expires.Before(time.Now().Add(364*24*time.Hour)) {
		t.Fatalf("cookie is not valid for one year: %#v", cookies[0])
	}

	// A fresh in-memory store simulates the process created by a deployment.
	second := newSessionStore(secret, 365*24*time.Hour, store)
	requestContext, _ := sessionTestContext()
	requestContext.Request.AddCookie(cookies[0])
	loadedToken, loaded, ok := second.get(requestContext)
	if !ok || loadedToken != token || loaded.User == nil || loaded.User.Login != "owner" || !loaded.User.IsAdmin {
		t.Fatalf("persisted session was not restored: token=%q entry=%#v ok=%v", loadedToken, loaded, ok)
	}

	var row dbBrowserSession
	if err := store.db.First(&row).Error; err != nil {
		t.Fatal(err)
	}
	if row.TokenHash == token || strings.Contains(row.Payload, token) {
		t.Fatal("raw browser-session token was persisted")
	}
}

func TestBrowserSessionLogoutDeletesPersistedState(t *testing.T) {
	gin.SetMode(gin.TestMode)
	store, err := openStore(t.TempDir() + "/data.db")
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()

	sessions := newSessionStore([]byte("0123456789abcdef0123456789abcdef"), time.Hour, store)
	context, recorder := sessionTestContext()
	_, _, err = sessions.new(context)
	if err != nil {
		t.Fatal(err)
	}
	cookie := recorder.Result().Cookies()[0]

	logoutContext, _ := sessionTestContext()
	logoutContext.Request.AddCookie(cookie)
	sessions.delete(logoutContext)

	fresh := newSessionStore(sessions.secret, time.Hour, store)
	requestContext, _ := sessionTestContext()
	requestContext.Request.AddCookie(cookie)
	if _, _, ok := fresh.get(requestContext); ok {
		t.Fatal("logged-out session was restored from persistent storage")
	}
}
