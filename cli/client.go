package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type apiClient struct {
	baseURL string
	token   string
	http    *http.Client
}

func newAPIClient(baseURL, token string) *apiClient {
	return &apiClient{baseURL: strings.TrimRight(baseURL, "/"), token: token, http: &http.Client{Timeout: 60 * time.Second}}
}

func (client *apiClient) request(method, path string, body any, authenticated bool) (map[string]any, *cliError) {
	if err := client.requireBaseURL(); err != nil {
		return nil, err
	}
	var reader io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return nil, asCLIError(err, "local_error")
		}
		reader = bytes.NewReader(encoded)
	}
	request, err := http.NewRequest(method, client.baseURL+path, reader)
	if err != nil {
		return nil, asCLIError(err, "request_failed")
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("User-Agent", "blog-cli/"+version)
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	if authenticated {
		if client.token == "" {
			return nil, &cliError{Code: "authentication_required", Message: "尚未登录", Hints: []string{"blog-cli auth login"}, ExitCode: 4}
		}
		request.Header.Set("Authorization", "Bearer "+client.token)
	}
	response, err := client.http.Do(request)
	if err != nil {
		return nil, &cliError{Code: "connection_failed", Message: fmt.Sprintf("无法连接 %s: %v", client.baseURL, err),
			Hints: []string{"检查网络和 --base-url；运行 blog-cli info --json 验证服务地址"}, ExitCode: 1}
	}
	defer response.Body.Close()
	return decodeResponse(response)
}

func (client *apiClient) raw(method, path string) ([]byte, http.Header, *cliError) {
	if err := client.requireBaseURL(); err != nil {
		return nil, nil, err
	}
	if client.token == "" {
		return nil, nil, &cliError{Code: "authentication_required", Message: "尚未登录", Hints: []string{"blog-cli auth login"}, ExitCode: 4}
	}
	request, err := http.NewRequest(method, client.baseURL+path, nil)
	if err != nil {
		return nil, nil, asCLIError(err, "request_failed")
	}
	request.Header.Set("Accept", "*/*")
	request.Header.Set("Authorization", "Bearer "+client.token)
	request.Header.Set("User-Agent", "blog-cli/"+version)
	response, err := client.http.Do(request)
	if err != nil {
		return nil, nil, asCLIError(err, "connection_failed")
	}
	defer response.Body.Close()
	content, readErr := io.ReadAll(io.LimitReader(response.Body, 16<<20))
	if readErr != nil {
		return nil, nil, asCLIError(readErr, "request_failed")
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, nil, responseError(response, content)
	}
	return content, response.Header.Clone(), nil
}

func (client *apiClient) upload(path, description string) (map[string]any, *cliError) {
	if err := client.requireBaseURL(); err != nil {
		return nil, err
	}
	if client.token == "" {
		return nil, &cliError{Code: "authentication_required", Message: "尚未登录", Hints: []string{"blog-cli auth login"}, ExitCode: 4}
	}
	file, err := os.Open(path)
	if err != nil {
		return nil, &cliError{Code: "file_not_found", Message: err.Error(), ExitCode: 2}
	}
	defer file.Close()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	if err := writer.WriteField("description", description); err != nil {
		return nil, asCLIError(err, "local_error")
	}
	part, err := writer.CreateFormFile("file", filepath.Base(path))
	if err != nil {
		return nil, asCLIError(err, "local_error")
	}
	if _, err := io.Copy(part, file); err != nil {
		return nil, asCLIError(err, "local_error")
	}
	if err := writer.Close(); err != nil {
		return nil, asCLIError(err, "local_error")
	}
	request, err := http.NewRequest(http.MethodPost, client.baseURL+"/api/file", &body)
	if err != nil {
		return nil, asCLIError(err, "request_failed")
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", writer.FormDataContentType())
	request.Header.Set("Authorization", "Bearer "+client.token)
	request.Header.Set("User-Agent", "blog-cli/"+version)
	response, err := client.http.Do(request)
	if err != nil {
		return nil, asCLIError(err, "connection_failed")
	}
	defer response.Body.Close()
	return decodeResponse(response)
}

func decodeResponse(response *http.Response) (map[string]any, *cliError) {
	content, err := io.ReadAll(io.LimitReader(response.Body, 16<<20))
	if err != nil {
		return nil, asCLIError(err, "request_failed")
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, responseError(response, content)
	}
	if len(content) == 0 {
		return map[string]any{"status": true}, nil
	}
	var payload map[string]any
	if err := json.Unmarshal(content, &payload); err != nil {
		return nil, &cliError{Code: "invalid_response", Message: "server returned invalid JSON", HTTPStatus: response.StatusCode, ExitCode: 1}
	}
	if status, exists := payload["status"].(bool); exists && !status {
		return nil, payloadError(response.StatusCode, payload)
	}
	return payload, nil
}

func responseError(response *http.Response, content []byte) *cliError {
	var payload map[string]any
	if json.Unmarshal(content, &payload) != nil {
		return &cliError{Code: "http_error", Message: strings.TrimSpace(string(content)), HTTPStatus: response.StatusCode, ExitCode: 1}
	}
	return payloadError(response.StatusCode, payload)
}

func payloadError(status int, payload map[string]any) *cliError {
	code, _ := payload["error"].(string)
	if code == "" {
		code = "http_error"
	}
	message, _ := payload["message"].(string)
	if message == "" {
		message = http.StatusText(status)
	}
	hints := []string{}
	if hint, ok := payload["hint"].(string); ok && hint != "" {
		hints = append(hints, hint)
	}
	exitCode := 1
	if status == http.StatusUnauthorized {
		exitCode = 4
		hints = append(hints, "blog-cli auth login")
	}
	return &cliError{Code: code, Message: message, HTTPStatus: status, Details: payload, Hints: hints, ExitCode: exitCode}
}

func pathEscape(value string) string { return url.PathEscape(value) }

func (client *apiClient) requireBaseURL() *cliError {
	if client.baseURL != "" {
		return nil
	}
	return &cliError{Code: "base_url_required", Message: "blog server URL is not configured", Hints: []string{
		"Install blog-cli from the blog admin CLI page", "or pass --base-url https://your-blog.example once",
	}, ExitCode: 2}
}
