package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func TestHelpIsMachineReadableAndAgentFriendly(t *testing.T) {
	var out, errOut bytes.Buffer
	if code := run([]string{"help", "--json", "--config", filepath.Join(t.TempDir(), "config.json")}, strings.NewReader(""), &out, &errOut); code != 0 {
		t.Fatalf("exit %d: %s", code, errOut.String())
	}
	payload := decodeCLIOutput(t, out.Bytes())
	data := objectValue(payload["data"])
	commands := objectValue(data["commands"])
	for _, command := range []string{"search QUERY", "page create", "page search QUERY", "page publish|recall|hide|top ID_OR_LINK", "microblog create [TEXT]", "microblog delete ID --yes", "file list|get|upload|delete", "site sidebar get|set FILE"} {
		if _, ok := commands[command]; !ok {
			t.Fatalf("manifest missing %q: %#v", command, commands)
		}
	}
}

func TestSearchAndMicroblogManagement(t *testing.T) {
	post := map[string]any{"id": 7, "content": "a small searchable thought", "status": 1, "createdAt": "2026-08-30T00:00:00Z", "updatedAt": "2026-08-30T00:00:00Z"}
	handler := http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.Header.Get("Authorization") != "Bearer test-token" {
			writeTestJSON(writer, http.StatusUnauthorized, map[string]any{"status": false, "message": "bad token"})
			return
		}
		switch request.Method + " " + request.URL.Path {
		case "POST /api/page/search":
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true, "pages": []any{map[string]any{
				"id": "p1", "title": "Searchable", "link": "searchable", "content": "deep body match", "type": 0,
				"pageStatus": 1, "view": 42, "upVote": 3, "downVote": 1, "createdAt": "2026-08-29T00:00:00Z",
			}}})
		case "GET /api/microblog":
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true, "posts": []any{post}, "total": 1})
		case "POST /api/microblog/search":
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true, "posts": []any{post}, "total": 1})
		case "GET /api/microblog/7":
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true, "post": post})
		case "POST /api/microblog":
			var input map[string]any
			_ = json.NewDecoder(request.Body).Decode(&input)
			post["content"], post["status"] = input["content"], input["status"]
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true, "post": post})
		case "PUT /api/microblog/7":
			_ = json.NewDecoder(request.Body).Decode(&post)
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true})
		case "DELETE /api/microblog/7":
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true})
		default:
			writeTestJSON(writer, http.StatusNotFound, map[string]any{"status": false, "message": "unexpected endpoint"})
		}
	})
	server := httptest.NewServer(handler)
	defer server.Close()
	configPath := writeTestConfig(t, server.URL, "test-token")

	search := runOK(t, []string{"search", "searchable", "--json", "--config", configPath})
	searchData := objectValue(search["data"])
	pages := objectSlice(searchData["pages"])
	if len(pages) != 1 || pages[0]["content"] != "deep body match" || intValue(pages[0]["view"]) != 42 {
		t.Fatalf("search did not preserve page content and metadata: %#v", searchData)
	}
	if posts := objectSlice(searchData["microPosts"]); len(posts) != 1 || posts[0]["content"] != "a small searchable thought" {
		t.Fatalf("search did not include microblogs: %#v", searchData)
	}
	commands := [][]string{
		{"page", "search", "body"},
		{"microblog", "list", "--status", "public"},
		{"microblog", "get", "7"},
		{"microblog", "create", "new thought", "--status", "private"},
		{"microblog", "update", "7", "updated thought"},
		{"microblog", "private", "7"},
		{"microblog", "publish", "7"},
		{"microblog", "delete", "7", "--yes"},
	}
	for _, command := range commands {
		arguments := append(append([]string{}, command...), "--json", "--config", configPath)
		if payload := runOK(t, arguments); payload["ok"] != true {
			t.Fatalf("%v output: %#v", command, payload)
		}
	}
}

func TestArticleFileAndSettingsManagement(t *testing.T) {
	var lock sync.Mutex
	seen := map[string]int{}
	page := map[string]any{"id": "p1", "title": "First", "link": "post", "content": "body", "type": 0, "pageStatus": 1, "commentStatus": 1, "tag": "", "description": "", "password": ""}
	handler := http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.Header.Get("Authorization") != "Bearer test-token" {
			writeTestJSON(writer, http.StatusUnauthorized, map[string]any{"status": false, "error": "authentication_required", "message": "bad token"})
			return
		}
		key := request.Method + " " + request.URL.Path
		lock.Lock()
		seen[key]++
		lock.Unlock()
		switch key {
		case "POST /api/page":
			var input map[string]any
			_ = json.NewDecoder(request.Body).Decode(&input)
			if input["title"] != "First" || input["content"] != "body" {
				t.Errorf("create input: %#v", input)
			}
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true, "id": "p1"})
		case "GET /api/page":
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true, "pages": []any{page}})
		case "GET /api/page/p1":
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true, "page": page})
		case "GET /api/page/post":
			writeTestJSON(writer, http.StatusNotFound, map[string]any{"status": false, "message": "missing"})
		case "PUT /api/page":
			var input map[string]any
			_ = json.NewDecoder(request.Body).Decode(&input)
			page = input
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true})
		case "DELETE /api/page/p1":
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true})
		case "GET /api/page/export/p1":
			writer.WriteHeader(http.StatusOK)
			_, _ = io.WriteString(writer, "# First\n\nbody\n")
		case "GET /api/file":
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true, "files": []any{map[string]any{"id": "cover.png", "path": "/upload/cover.png"}}})
		case "GET /api/file/cover.png":
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true, "file": map[string]any{"id": "cover.png"}})
		case "POST /api/file":
			if err := request.ParseMultipartForm(2 << 20); err != nil {
				t.Errorf("multipart: %v", err)
			}
			if request.FormValue("description") != "cover" {
				t.Errorf("description = %q", request.FormValue("description"))
			}
			file, header, err := request.FormFile("file")
			if err != nil {
				t.Errorf("upload file: %v", err)
			} else {
				_ = file.Close()
				if header.Filename != "cover.png" {
					t.Errorf("filename = %q", header.Filename)
				}
			}
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true, "file": map[string]any{"id": "cover.png", "path": "/upload/cover.png"}})
		case "DELETE /api/file/cover.png":
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true})
		case "GET /api/option":
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true, "options": []any{map[string]any{"key": "site_name", "value": "Blog"}, map[string]any{"key": "nav_links", "value": "[]"}}})
		case "GET /api/option/site_name":
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true, "option": map[string]any{"key": "site_name", "value": "Blog"}})
		case "GET /api/option/nav_links":
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true, "option": map[string]any{"key": "nav_links", "value": "[]"}})
		case "PUT /api/option":
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true})
		default:
			writeTestJSON(writer, http.StatusNotFound, map[string]any{"status": false, "message": "unexpected " + key})
		}
	})
	server := httptest.NewServer(handler)
	defer server.Close()
	configPath := writeTestConfig(t, server.URL, "test-token")
	contentPath := filepath.Join(t.TempDir(), "post.md")
	if err := os.WriteFile(contentPath, []byte("body"), 0o600); err != nil {
		t.Fatal(err)
	}
	uploadPath := filepath.Join(t.TempDir(), "cover.png")
	if err := os.WriteFile(uploadPath, []byte("png"), 0o600); err != nil {
		t.Fatal(err)
	}
	exportPath := filepath.Join(t.TempDir(), "export.md")
	sidebarPath := filepath.Join(t.TempDir(), "sidebar.json")
	if err := os.WriteFile(sidebarPath, []byte(`[{"key":"main","value":[]}]`), 0o600); err != nil {
		t.Fatal(err)
	}

	commands := [][]string{
		{"page", "create", "--title", "First", "--link", "post", "--content-file", contentPath},
		{"page", "list"}, {"page", "get", "p1"}, {"page", "hide", "post"},
		{"page", "update", "p1", "--description", "updated"}, {"page", "export", "p1", "--output", exportPath},
		{"file", "list"}, {"file", "get", "cover.png"}, {"file", "upload", uploadPath, "--description", "cover"},
		{"settings", "list"}, {"settings", "get", "site_name"}, {"settings", "set", "site_name", "New Blog"},
		{"site", "show"}, {"site", "title", "New Blog"}, {"site", "sidebar", "get"}, {"site", "sidebar", "set", sidebarPath},
		{"file", "delete", "cover.png", "--yes"}, {"page", "delete", "p1", "--yes"},
	}
	for _, command := range commands {
		arguments := append(append([]string{}, command...), "--json", "--config", configPath)
		var out, errOut bytes.Buffer
		if code := run(arguments, strings.NewReader(""), &out, &errOut); code != 0 {
			t.Fatalf("%v exit %d: %s", command, code, errOut.String())
		}
		if payload := decodeCLIOutput(t, out.Bytes()); payload["ok"] != true {
			t.Fatalf("%v output: %#v", command, payload)
		}
	}
	content, err := os.ReadFile(exportPath)
	if err != nil || string(content) != "# First\n\nbody\n" {
		t.Fatalf("export = %q, %v", content, err)
	}
	for _, endpoint := range []string{"POST /api/page", "PUT /api/page", "DELETE /api/page/p1", "POST /api/file", "DELETE /api/file/cover.png", "PUT /api/option"} {
		if seen[endpoint] == 0 {
			t.Errorf("endpoint not covered: %s", endpoint)
		}
	}
}

func TestDeviceFlowPersistsTokenWithoutEnvironmentToken(t *testing.T) {
	approved := false
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case "/api/cli/device/code":
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true, "device_code": "device", "user_code": "ABCD-EFGH", "verification_uri": "https://example.test/admin/#/cli", "verification_uri_complete": "https://example.test/admin/#/cli?code=ABCD-EFGH", "expires_in": 600, "interval": 2})
		case "/api/cli/device/token":
			if !approved {
				writeTestJSON(writer, http.StatusPreconditionRequired, map[string]any{"status": false, "error": "authorization_pending", "message": "pending"})
				return
			}
			writeTestJSON(writer, http.StatusOK, map[string]any{"status": true, "access_token": "issued-token", "token": map[string]any{"expiresAt": "2027-01-01"}})
		}
	}))
	defer server.Close()
	configPath := writeTestConfig(t, server.URL, "")
	runOK(t, []string{"auth", "login", "--no-wait", "--no-browser", "--json", "--config", configPath})
	approved = true
	runOK(t, []string{"auth", "login", "--resume", "--json", "--config", configPath})
	config, err := loadConfiguration(configPath)
	if err != nil {
		t.Fatal(err)
	}
	if config.Token != "issued-token" || config.Pending != nil {
		t.Fatalf("saved config: %#v", config)
	}
}

func runOK(t *testing.T, arguments []string) map[string]any {
	t.Helper()
	var out, errOut bytes.Buffer
	if code := run(arguments, strings.NewReader(""), &out, &errOut); code != 0 {
		t.Fatalf("%v exit %d: %s", arguments, code, errOut.String())
	}
	return decodeCLIOutput(t, out.Bytes())
}

func writeTestConfig(t *testing.T, baseURL, token string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "config.json")
	content, _ := json.Marshal(map[string]any{"baseUrl": baseURL, "token": token})
	if err := os.WriteFile(path, content, 0o600); err != nil {
		t.Fatal(err)
	}
	return path
}

func decodeCLIOutput(t *testing.T, content []byte) map[string]any {
	t.Helper()
	var payload map[string]any
	if err := json.Unmarshal(content, &payload); err != nil {
		t.Fatalf("decode %q: %v", content, err)
	}
	return payload
}

func writeTestJSON(writer http.ResponseWriter, status int, payload any) {
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(payload)
}
