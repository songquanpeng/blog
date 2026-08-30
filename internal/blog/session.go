package blog

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

const sessionCookie = "blog"

type session struct {
	User          *GitHubUser
	OAuthState    string
	PKCEVerifier  string
	OAuthExpires  time.Time
	OAuthReturnTo string
	ExpiresAt     time.Time
}

type sessionStore struct {
	mu       sync.RWMutex
	sessions map[string]*session
	secret   []byte
	ttl      time.Duration
	store    *Store
}

func newSessionStore(secret []byte, ttl time.Duration, stores ...*Store) *sessionStore {
	s := &sessionStore{sessions: make(map[string]*session), secret: secret, ttl: ttl}
	if len(stores) > 0 {
		s.store = stores[0]
	}
	return s
}

func (s *sessionStore) new(c *gin.Context) (string, *session, error) {
	token, err := randomToken(32)
	if err != nil {
		return "", nil, err
	}
	entry := &session{ExpiresAt: time.Now().Add(s.ttl)}
	s.mu.Lock()
	s.pruneLocked()
	if len(s.sessions) >= 10000 {
		s.mu.Unlock()
		return "", nil, errors.New("会话数量已达安全上限，请稍后重试")
	}
	s.sessions[token] = entry
	s.mu.Unlock()
	if s.store != nil {
		if err := s.store.SaveBrowserSession(c.Request.Context(), token, *entry); err != nil {
			s.deleteToken(token)
			return "", nil, err
		}
	}
	s.setCookie(c, token)
	return token, entry, nil
}

func (s *sessionStore) get(c *gin.Context) (string, *session, bool) {
	raw, err := c.Cookie(sessionCookie)
	if err != nil {
		return "", nil, false
	}
	token, valid := s.verify(raw)
	if !valid {
		return "", nil, false
	}
	s.mu.RLock()
	entry, ok := s.sessions[token]
	s.mu.RUnlock()
	if !ok && s.store != nil {
		entry, err = s.store.BrowserSession(c.Request.Context(), token)
		if err == nil {
			s.mu.Lock()
			s.sessions[token] = entry
			s.mu.Unlock()
			ok = true
		}
	}
	if !ok || time.Now().After(entry.ExpiresAt) {
		if ok {
			s.deleteToken(token)
		}
		return "", nil, false
	}
	return token, entry, true
}

func (s *sessionStore) ensure(c *gin.Context) (string, *session, error) {
	if token, entry, ok := s.get(c); ok {
		return token, entry, nil
	}
	return s.new(c)
}

func (s *sessionStore) update(token string, mutate func(*session)) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if entry, ok := s.sessions[token]; ok {
		updated := cloneSession(entry)
		mutate(updated)
		updated.ExpiresAt = time.Now().Add(s.ttl)
		if s.store != nil {
			if err := s.store.SaveBrowserSession(context.Background(), token, *updated); err != nil {
				return err
			}
		}
		s.sessions[token] = updated
	}
	return nil
}

func (s *sessionStore) delete(c *gin.Context) {
	if token, _, ok := s.get(c); ok {
		s.deleteToken(token)
	}
	http.SetCookie(c.Writer, &http.Cookie{Name: sessionCookie, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, Secure: requestSecure(c), SameSite: http.SameSiteLaxMode})
}

func (s *sessionStore) deleteToken(token string) {
	s.mu.Lock()
	delete(s.sessions, token)
	s.mu.Unlock()
	if s.store != nil {
		_ = s.store.DeleteBrowserSession(context.Background(), token)
	}
}

func (s *sessionStore) setCookie(c *gin.Context, token string) {
	value := token + "." + s.sign(token)
	http.SetCookie(c.Writer, &http.Cookie{
		Name: sessionCookie, Value: value, Path: "/", MaxAge: int(s.ttl.Seconds()),
		Expires:  time.Now().Add(s.ttl),
		HttpOnly: true, Secure: requestSecure(c), SameSite: http.SameSiteLaxMode,
	})
}

func cloneSession(entry *session) *session {
	cloned := *entry
	if entry.User != nil {
		user := *entry.User
		cloned.User = &user
	}
	return &cloned
}

func (s *sessionStore) sign(token string) string {
	h := hmac.New(sha256.New, s.secret)
	_, _ = h.Write([]byte(token))
	return hex.EncodeToString(h.Sum(nil))
}

func (s *sessionStore) verify(value string) (string, bool) {
	parts := strings.Split(value, ".")
	if len(parts) != 2 || len(parts[0]) < 32 {
		return "", false
	}
	want := s.sign(parts[0])
	return parts[0], subtle.ConstantTimeCompare([]byte(want), []byte(parts[1])) == 1
}

func (s *sessionStore) pruneLocked() {
	if len(s.sessions) < 256 {
		return
	}
	now := time.Now()
	for token, entry := range s.sessions {
		if now.After(entry.ExpiresAt) {
			delete(s.sessions, token)
		}
	}
}

func pkceChallenge(verifier string) string {
	digest := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(digest[:])
}

func requestSecure(c *gin.Context) bool {
	return c.Request.TLS != nil || c.GetBool("trustedForwardedHTTPS")
}
