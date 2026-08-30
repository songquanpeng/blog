package blog

import (
	"context"
	"net/http"
	"path/filepath"
	"testing"
	"time"
)

func TestGitHubProxyConfigRejectsUnsafeAddresses(t *testing.T) {
	valid := []githubProxyConfig{
		{Mode: "direct"},
		{Mode: "proxy", ProxyURL: "socks5://proxy.internal:1080"},
		{Mode: "proxy", ProxyURL: "http://10.0.0.2:3128"},
	}
	for _, config := range valid {
		if err := validateGitHubProxyConfig(config); err != nil {
			t.Errorf("valid config %#v rejected: %v", config, err)
		}
	}
	invalid := []githubProxyConfig{
		{Mode: "auto"},
		{Mode: "proxy"},
		{Mode: "proxy", ProxyURL: "ftp://proxy.example:21"},
		{Mode: "proxy", ProxyURL: "http://user:secret@proxy.example:3128"},
		{Mode: "proxy", ProxyURL: "http://proxy.example:3128/path"},
	}
	for _, config := range invalid {
		if err := validateGitHubProxyConfig(config); err == nil {
			t.Errorf("unsafe config %#v was accepted", config)
		}
	}
}

func TestDirectGitHubClientIgnoresProcessProxy(t *testing.T) {
	t.Setenv("HTTPS_PROXY", "http://untrusted.example:8080")
	client := directHTTPClient(time.Second)
	transport, ok := client.Transport.(*http.Transport)
	if !ok {
		t.Fatalf("transport type = %T", client.Transport)
	}
	request, _ := http.NewRequest(http.MethodGet, "https://api.github.com/user", nil)
	if transport.Proxy != nil {
		proxyURL, err := transport.Proxy(request)
		t.Fatalf("direct client inherited process proxy %v, %v", proxyURL, err)
	}
}

func TestEffectiveGitHubProxyConfigPrecedence(t *testing.T) {
	store, err := openStore(filepath.Join(t.TempDir(), "data.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	app := &App{store: store, cfg: Config{GitHubProxyMode: "proxy", GitHubProxyURL: "socks5://environment:1080"}}
	config, err := app.effectiveGitHubProxyConfig(context.Background())
	if err != nil || config.Mode != "proxy" || config.ProxyURL != "socks5://environment:1080" {
		t.Fatalf("environment fallback = %#v, %v", config, err)
	}
	if err := store.UpdateOptions(context.Background(), map[string]any{
		githubProxyModeOption: "direct",
		githubProxyURLOption:  "socks5://admin:1080",
	}); err != nil {
		t.Fatal(err)
	}
	config, err = app.effectiveGitHubProxyConfig(context.Background())
	if err != nil || config.Mode != "direct" || config.ProxyURL != "socks5://admin:1080" {
		t.Fatalf("admin override = %#v, %v", config, err)
	}
	app.cfg.GitHubProxyForceMode = "proxy"
	config, err = app.effectiveGitHubProxyConfig(context.Background())
	if err != nil || config.Mode != "proxy" || config.ProxyURL != "socks5://environment:1080" || !config.Forced {
		t.Fatalf("forced override = %#v, %v", config, err)
	}
}

func TestProxyGitHubClientUsesConfiguredEndpoint(t *testing.T) {
	app := &App{httpClient: directHTTPClient(time.Second)}
	client, err := app.githubHTTPClient(githubProxyConfig{Mode: "proxy", ProxyURL: "socks5://proxy.internal:1080"})
	if err != nil {
		t.Fatal(err)
	}
	transport := client.Transport.(*http.Transport)
	request, _ := http.NewRequest(http.MethodGet, "https://api.github.com/user", nil)
	proxyURL, err := transport.Proxy(request)
	if err != nil || proxyURL.String() != "socks5://proxy.internal:1080" {
		t.Fatalf("proxy = %v, %v", proxyURL, err)
	}
}
