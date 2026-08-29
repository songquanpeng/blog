package main

import (
	"net/http"
	"os/exec"
	"runtime"
	"time"
)

func (app *application) authCommand(arguments []string) (any, []string, *cliError) {
	if len(arguments) == 0 {
		return nil, nil, argumentError("missing auth subcommand", "blog-cli help --json")
	}
	switch arguments[0] {
	case "login":
		args, err := parseArgs(arguments[1:], []string{"--client-name"}, []string{"--resume", "--wait", "--no-wait", "--no-browser"})
		if err != nil {
			return nil, nil, err
		}
		if len(args.positionals) != 0 {
			return nil, nil, argumentError("auth login accepts options only")
		}
		if args.has("--wait") && args.has("--no-wait") {
			return nil, nil, argumentError("--wait and --no-wait are mutually exclusive")
		}
		return app.login(args)
	case "status":
		if len(arguments) != 1 {
			return nil, nil, argumentError("auth status accepts no arguments")
		}
		payload, err := app.client.request(http.MethodGet, "/api/cli/me", nil, true)
		return payload, tokenHints(payload), err
	case "logout":
		if len(arguments) != 1 {
			return nil, nil, argumentError("auth logout accepts no arguments")
		}
		payload, err := app.client.request(http.MethodDelete, "/api/cli/token", nil, true)
		app.config.Token = ""
		app.config.Pending = nil
		if saveErr := app.config.save(); saveErr != nil && err == nil {
			err = saveErr
		}
		return payload, []string{"重新登录: blog-cli auth login"}, err
	default:
		return nil, nil, argumentError("unknown auth subcommand: "+arguments[0], "blog-cli help --json")
	}
}

func (app *application) login(args commandArgs) (any, []string, *cliError) {
	pending := app.config.Pending
	if args.has("--resume") && pending == nil {
		return nil, nil, &cliError{Code: "no_pending_login", Message: "no pending login to resume", Hints: []string{"blog-cli auth login"}, ExitCode: 2}
	}
	if !args.has("--resume") {
		name := args.value("--client-name")
		if name == "" {
			name = hostClientName()
		}
		payload, err := app.client.request(http.MethodPost, "/api/cli/device/code", map[string]any{"clientName": name}, false)
		if err != nil {
			return nil, nil, err
		}
		pending = &pendingLogin{DeviceCode: stringValue(payload["device_code"]), UserCode: stringValue(payload["user_code"]), VerificationURI: stringValue(payload["verification_uri"]), VerificationURIComplete: stringValue(payload["verification_uri_complete"]), ExpiresIn: int64(intValue(payload["expires_in"])), Interval: int64(intValue(payload["interval"])), CreatedAt: time.Now().Unix()}
		app.config.Pending = pending
		if err := app.config.save(); err != nil {
			return nil, nil, err
		}
		if !args.has("--no-browser") && !app.machine {
			_ = openBrowser(pending.VerificationURIComplete)
		}
	}
	wait := args.has("--wait") || (!app.machine && !args.has("--no-wait"))
	if !wait && !args.has("--resume") {
		return pendingResult(pending), []string{"请让博客管理员打开 verificationUriComplete 并批准授权", "批准后运行: blog-cli auth login --resume --json"}, nil
	}
	interval := time.Duration(pending.Interval) * time.Second
	if interval < 2*time.Second {
		interval = 2 * time.Second
	}
	deadline := time.Unix(pending.CreatedAt, 0).Add(time.Duration(pending.ExpiresIn) * time.Second)
	for {
		payload, err := app.client.request(http.MethodPost, "/api/cli/device/token", map[string]any{"grant_type": "urn:ietf:params:oauth:grant-type:device_code", "device_code": pending.DeviceCode}, false)
		if err == nil {
			app.config.Token = stringValue(payload["access_token"])
			app.client.token = app.config.Token
			app.config.Pending = nil
			delete(payload, "access_token")
			if saveErr := app.config.save(); saveErr != nil {
				return nil, nil, saveErr
			}
			return payload, tokenHints(payload), nil
		}
		if err.Code != "authorization_pending" {
			app.config.Pending = nil
			_ = app.config.save()
			return nil, nil, err
		}
		if !wait {
			return nil, nil, &cliError{Code: "authorization_pending", Message: "waiting for administrator approval", HTTPStatus: err.HTTPStatus, Hints: []string{pending.VerificationURIComplete, "批准后运行: blog-cli auth login --resume --json"}, ExitCode: 3}
		}
		if time.Now().After(deadline) {
			app.config.Pending = nil
			_ = app.config.save()
			return nil, nil, &cliError{Code: "expired_token", Message: "device code expired", Hints: []string{"blog-cli auth login"}, ExitCode: 3}
		}
		time.Sleep(interval)
	}
}

func pendingResult(pending *pendingLogin) map[string]any {
	return map[string]any{"state": "authorization_pending", "userCode": pending.UserCode, "verificationUri": pending.VerificationURI, "verificationUriComplete": pending.VerificationURIComplete, "resumeCommand": "blog-cli auth login --resume --json"}
}

func tokenHints(payload map[string]any) []string {
	hints := []string{"blog-cli page list --json", "blog-cli help --json"}
	if token := objectValue(payload["token"]); stringValue(token["expiresAt"]) != "" {
		hints = append([]string{"Token 到期时间: " + stringValue(token["expiresAt"])}, hints...)
	}
	return hints
}

func openBrowser(target string) error {
	var command *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		command = exec.Command("open", target)
	case "windows":
		command = exec.Command("rundll32", "url.dll,FileProtocolHandler", target)
	default:
		command = exec.Command("xdg-open", target)
	}
	return command.Start()
}
