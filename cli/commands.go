package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

var pageTypes = map[string]int{
	"article": 0, "code": 1, "bulletin": 2, "discussion": 3, "links": 4,
	"html": 5, "media": 6, "timeline": 7, "redirect": 8, "text": 9,
}

var pageStatuses = map[string]int{"recalled": 0, "published": 1, "topped": 2, "hidden": 3}
var statusCommands = map[string]int{"recall": 0, "publish": 1, "top": 2, "hide": 3}

func (app *application) execute(arguments []string) (any, []string, *cliError) {
	if len(arguments) == 0 || arguments[0] == "help" || contains(arguments, "--help") {
		return commandManifest(), []string{"登录: blog-cli auth login", "列出文章: blog-cli page list --json"}, nil
	}
	if arguments[0] == "version" || arguments[0] == "--version" {
		return map[string]any{"name": "blog-cli", "version": version}, nil, nil
	}
	command := arguments[0]
	if command == "pages" {
		command = "page"
	}
	if command == "files" {
		command = "file"
	}
	if command == "setting" {
		command = "settings"
	}
	switch command {
	case "info":
		if len(arguments) != 1 {
			return nil, nil, argumentError("info accepts no arguments")
		}
		payload, err := app.client.request(http.MethodGet, "/api/cli/info", nil, false)
		return payload, []string{"blog-cli auth status --json", "blog-cli help --json"}, err
	case "auth":
		return app.authCommand(arguments[1:])
	case "page":
		return app.pageCommand(arguments[1:])
	case "settings":
		return app.settingsCommand(arguments[1:])
	case "site":
		return app.siteCommand(arguments[1:])
	case "file":
		return app.fileCommand(arguments[1:])
	case "server":
		return app.serverCommand(arguments[1:])
	default:
		return nil, nil, argumentError("unknown command: "+command, "blog-cli help --json")
	}
}

func (app *application) pageCommand(arguments []string) (any, []string, *cliError) {
	if len(arguments) == 0 {
		return nil, nil, argumentError("missing page subcommand", "blog-cli help --json")
	}
	action, rest := arguments[0], arguments[1:]
	switch action {
	case "list":
		args, err := parseArgs(rest, []string{"--search", "--type", "--status"}, nil)
		if err != nil {
			return nil, nil, err
		}
		if err := requirePositionals(args, 0, "page list [--search TEXT] [--type TYPE] [--status STATUS]"); err != nil {
			return nil, nil, err
		}
		kind, kindSet, parseErr := namedValue(args, "--type", pageTypes)
		if parseErr != nil {
			return nil, nil, parseErr
		}
		status, statusSet, parseErr := namedValue(args, "--status", pageStatuses)
		if parseErr != nil {
			return nil, nil, parseErr
		}
		var payload map[string]any
		if args.has("--search") {
			searchType := -1
			if kindSet {
				searchType = kind
			}
			payload, err = app.client.request(http.MethodPost, "/api/page/search", map[string]any{"keyword": args.value("--search"), "type": searchType}, true)
		} else {
			payload, err = app.client.request(http.MethodGet, "/api/page", nil, true)
		}
		if err != nil {
			return nil, nil, err
		}
		pages := objectSlice(payload["pages"])
		filtered := make([]map[string]any, 0, len(pages))
		for _, page := range pages {
			if kindSet && intValue(page["type"]) != kind || statusSet && intValue(page["pageStatus"]) != status {
				continue
			}
			delete(page, "content")
			delete(page, "password")
			filtered = append(filtered, page)
		}
		return map[string]any{"pages": filtered, "count": len(filtered)}, []string{"查看全文: blog-cli page get ID_OR_LINK --json", "新建: blog-cli page create --help"}, nil
	case "get":
		args, err := parseArgs(rest, nil, nil)
		if err != nil {
			return nil, nil, err
		}
		if err := requirePositionals(args, 1, "page get ID_OR_LINK"); err != nil {
			return nil, nil, err
		}
		page, err := app.resolvePage(args.positionals[0])
		if err != nil {
			return nil, nil, err
		}
		id, link := stringValue(page["id"]), stringValue(page["link"])
		return map[string]any{"page": page}, []string{"blog-cli page update " + id + " --help", "blog-cli page export " + id + " --output " + link + ".md"}, nil
	case "create":
		args, err := parsePageArgs(rest)
		if err != nil {
			return nil, nil, err
		}
		if len(args.positionals) != 0 {
			return nil, nil, argumentError("page create accepts options only")
		}
		input, err := app.pageInput(args, true)
		if err != nil {
			return nil, nil, err
		}
		payload, requestErr := app.client.request(http.MethodPost, "/api/page", input, true)
		if requestErr != nil {
			return nil, nil, requestErr
		}
		id := stringValue(payload["id"])
		return payload, []string{"blog-cli page get " + id + " --json", "blog-cli page recall " + id + " --json"}, nil
	case "update":
		args, err := parsePageArgs(rest)
		if err != nil {
			return nil, nil, err
		}
		if err := requirePositionals(args, 1, "page update ID_OR_LINK [options]"); err != nil {
			return nil, nil, err
		}
		changes, err := app.pageInput(args, false)
		if err != nil {
			return nil, nil, err
		}
		if len(changes) == 0 {
			return nil, nil, argumentError("no fields to update", "blog-cli page update --help")
		}
		page, err := app.resolvePage(args.positionals[0])
		if err != nil {
			return nil, nil, err
		}
		for key, value := range changes {
			page[key] = value
		}
		payload, requestErr := app.client.request(http.MethodPut, "/api/page", page, true)
		if requestErr != nil {
			return nil, nil, requestErr
		}
		return map[string]any{"result": payload, "page": page}, []string{"blog-cli page get " + stringValue(page["id"]) + " --json"}, nil
	case "publish", "recall", "hide", "top":
		args, err := parseArgs(rest, nil, nil)
		if err != nil {
			return nil, nil, err
		}
		if err := requirePositionals(args, 1, "page "+action+" ID_OR_LINK"); err != nil {
			return nil, nil, err
		}
		page, err := app.resolvePage(args.positionals[0])
		if err != nil {
			return nil, nil, err
		}
		page["pageStatus"] = statusCommands[action]
		if _, err = app.client.request(http.MethodPut, "/api/page", page, true); err != nil {
			return nil, nil, err
		}
		return map[string]any{"id": page["id"], "link": page["link"], "pageStatus": statusCommands[action], "statusName": statusName(statusCommands[action])}, []string{"blog-cli page get " + stringValue(page["id"]) + " --json"}, nil
	case "delete":
		args, err := parseArgs(rest, nil, []string{"--yes"})
		if err != nil {
			return nil, nil, err
		}
		if err := requirePositionals(args, 1, "page delete ID_OR_LINK --yes"); err != nil {
			return nil, nil, err
		}
		page, err := app.resolvePage(args.positionals[0])
		if err != nil {
			return nil, nil, err
		}
		id := stringValue(page["id"])
		if err := app.requireYes(args.has("--yes"), "blog-cli page delete "+id); err != nil {
			return nil, nil, err
		}
		payload, requestErr := app.client.request(http.MethodDelete, "/api/page/"+pathEscape(id), nil, true)
		return payload, []string{"blog-cli page list --json"}, requestErr
	case "export":
		args, err := parseArgs(rest, []string{"--output"}, nil)
		if err != nil {
			return nil, nil, err
		}
		if err := requirePositionals(args, 1, "page export ID_OR_LINK [--output FILE]"); err != nil {
			return nil, nil, err
		}
		page, err := app.resolvePage(args.positionals[0])
		if err != nil {
			return nil, nil, err
		}
		content, _, err := app.client.raw(http.MethodGet, "/api/page/export/"+pathEscape(stringValue(page["id"])))
		if err != nil {
			return nil, nil, err
		}
		if args.has("--output") {
			path := args.value("--output")
			if writeErr := os.WriteFile(path, content, 0o644); writeErr != nil {
				return nil, nil, asCLIError(writeErr, "local_error")
			}
			absolute, _ := filepath.Abs(path)
			return map[string]any{"id": page["id"], "output": absolute, "bytes": len(content)}, []string{"blog-cli page update " + stringValue(page["id"]) + " --content-file " + path}, nil
		}
		if app.machine {
			return map[string]any{"id": page["id"], "link": page["link"], "content": string(content)}, []string{"Use --output FILE to write raw Markdown"}, nil
		}
		_, _ = app.out.Write(content)
		return nil, nil, nil
	default:
		return nil, nil, argumentError("unknown page subcommand: "+action, "blog-cli help --json")
	}
}

func parsePageArgs(arguments []string) (commandArgs, *cliError) {
	return parseArgs(arguments, []string{"--title", "--link", "--content", "--content-file", "--type", "--status", "--tags", "--description", "--password"}, []string{"--comments", "--no-comments"})
}

func (app *application) pageInput(args commandArgs, creating bool) (map[string]any, *cliError) {
	result := map[string]any{}
	for option, field := range map[string]string{"--title": "title", "--link": "link", "--description": "description", "--password": "password"} {
		if args.has(option) {
			result[field] = args.value(option)
		}
	}
	if args.has("--content") && args.has("--content-file") {
		return nil, argumentError("--content and --content-file are mutually exclusive")
	}
	if args.has("--content-file") {
		value, err := app.readValue(args.value("--content-file"))
		if err != nil {
			return nil, err
		}
		result["content"] = value
	} else if args.has("--content") {
		result["content"] = args.value("--content")
	}
	if value, set, err := namedValue(args, "--type", pageTypes); err != nil {
		return nil, err
	} else if set {
		result["type"] = value
	}
	if value, set, err := namedValue(args, "--status", pageStatuses); err != nil {
		return nil, err
	} else if set {
		result["pageStatus"] = value
	}
	if args.has("--tags") {
		parts := strings.FieldsFunc(args.value("--tags"), func(r rune) bool { return r == ',' || r == ';' })
		for index := range parts {
			parts[index] = strings.TrimSpace(parts[index])
		}
		result["tag"] = strings.Join(parts, ";")
	}
	if args.has("--comments") && args.has("--no-comments") {
		return nil, argumentError("--comments and --no-comments are mutually exclusive")
	}
	if args.has("--comments") {
		result["commentStatus"] = 1
	}
	if args.has("--no-comments") {
		result["commentStatus"] = 0
	}
	if creating {
		if strings.TrimSpace(stringValue(result["title"])) == "" || strings.TrimSpace(stringValue(result["link"])) == "" {
			return nil, argumentError("page create requires --title and --link", "blog-cli page create --title TITLE --link SLUG --content-file post.md")
		}
		defaults := map[string]any{"type": 0, "pageStatus": 1, "commentStatus": 1, "content": "", "tag": ""}
		for key, value := range defaults {
			if _, exists := result[key]; !exists {
				result[key] = value
			}
		}
	}
	return result, nil
}

func (app *application) resolvePage(target string) (map[string]any, *cliError) {
	payload, err := app.client.request(http.MethodGet, "/api/page/"+pathEscape(target), nil, true)
	if err == nil {
		return objectValue(payload["page"]), nil
	}
	if err.HTTPStatus != http.StatusNotFound {
		return nil, err
	}
	payload, err = app.client.request(http.MethodGet, "/api/page", nil, true)
	if err != nil {
		return nil, err
	}
	for _, page := range objectSlice(payload["pages"]) {
		if stringValue(page["link"]) == target {
			full, fullErr := app.client.request(http.MethodGet, "/api/page/"+pathEscape(stringValue(page["id"])), nil, true)
			if fullErr != nil {
				return nil, fullErr
			}
			return objectValue(full["page"]), nil
		}
	}
	return nil, &cliError{Code: "not_found", Message: "page ID or permalink not found: " + target, HTTPStatus: 404, Hints: []string{"blog-cli page list --search " + target + " --json"}, ExitCode: 1}
}

func (app *application) settingsCommand(arguments []string) (any, []string, *cliError) {
	if len(arguments) == 0 {
		return nil, nil, argumentError("missing settings subcommand", "blog-cli help --json")
	}
	action, rest := arguments[0], arguments[1:]
	switch action {
	case "list":
		args, err := parseArgs(rest, nil, nil)
		if err != nil || len(args.positionals) != 0 {
			if err != nil {
				return nil, nil, err
			}
			return nil, nil, argumentError("settings list accepts no arguments")
		}
		payload, requestErr := app.client.request(http.MethodGet, "/api/option", nil, true)
		if requestErr != nil {
			return nil, nil, requestErr
		}
		options := map[string]any{}
		for _, option := range objectSlice(payload["options"]) {
			options[stringValue(option["key"])] = option["value"]
		}
		return map[string]any{"options": options}, []string{"blog-cli settings get site_name --json", "blog-cli settings set KEY VALUE --json"}, nil
	case "get":
		args, err := parseArgs(rest, nil, nil)
		if err != nil {
			return nil, nil, err
		}
		if err := requirePositionals(args, 1, "settings get KEY"); err != nil {
			return nil, nil, err
		}
		payload, requestErr := app.client.request(http.MethodGet, "/api/option/"+pathEscape(args.positionals[0]), nil, true)
		return payload, []string{"blog-cli settings set " + args.positionals[0] + " VALUE --json"}, requestErr
	case "set":
		args, err := parseArgs(rest, []string{"--value-file"}, nil)
		if err != nil {
			return nil, nil, err
		}
		if len(args.positionals) < 1 || len(args.positionals) > 2 {
			return nil, nil, argumentError("expected settings set KEY [VALUE] [--value-file FILE]")
		}
		if len(args.positionals) == 2 && args.has("--value-file") {
			return nil, nil, argumentError("VALUE and --value-file are mutually exclusive")
		}
		var value string
		if args.has("--value-file") {
			value, err = app.readValue(args.value("--value-file"))
			if err != nil {
				return nil, nil, err
			}
		} else if len(args.positionals) == 2 {
			value = args.positionals[1]
		} else {
			return nil, nil, argumentError("settings set requires VALUE or --value-file")
		}
		key := args.positionals[0]
		payload, requestErr := app.client.request(http.MethodPut, "/api/option", map[string]any{key: value}, true)
		return map[string]any{"result": payload, "option": map[string]any{"key": key, "value": value}}, []string{"blog-cli settings get " + key + " --json"}, requestErr
	default:
		return nil, nil, argumentError("unknown settings subcommand: "+action, "blog-cli help --json")
	}
}

func (app *application) siteCommand(arguments []string) (any, []string, *cliError) {
	if len(arguments) == 0 {
		return nil, nil, argumentError("missing site subcommand", "blog-cli help --json")
	}
	switch arguments[0] {
	case "show":
		if len(arguments) != 1 {
			return nil, nil, argumentError("site show accepts no arguments")
		}
		payload, err := app.client.request(http.MethodGet, "/api/option", nil, true)
		if err != nil {
			return nil, nil, err
		}
		all := map[string]any{}
		for _, option := range objectSlice(payload["options"]) {
			all[stringValue(option["key"])] = option["value"]
		}
		site := map[string]any{}
		for _, key := range []string{"site_name", "motto", "description", "author", "domain", "language", "nav_links"} {
			site[key] = all[key]
		}
		return map[string]any{"site": site}, []string{"blog-cli site title NEW_TITLE", "blog-cli site sidebar get --json"}, nil
	case "title":
		if len(arguments) == 1 {
			payload, err := app.client.request(http.MethodGet, "/api/option/site_name", nil, true)
			return payload, []string{"blog-cli site title NEW_TITLE"}, err
		}
		if len(arguments) != 2 {
			return nil, nil, argumentError("expected site title [VALUE]")
		}
		payload, err := app.client.request(http.MethodPut, "/api/option", map[string]any{"site_name": arguments[1]}, true)
		return map[string]any{"result": payload, "title": arguments[1]}, []string{"blog-cli site show --json"}, err
	case "sidebar":
		if len(arguments) < 2 {
			return nil, nil, argumentError("expected site sidebar get|set")
		}
		if arguments[1] == "get" && len(arguments) == 2 {
			payload, err := app.client.request(http.MethodGet, "/api/option/nav_links", nil, true)
			if err != nil {
				return nil, nil, err
			}
			raw := stringValue(objectValue(payload["option"])["value"])
			var parsed any
			if json.Unmarshal([]byte(raw), &parsed) != nil {
				parsed = raw
			}
			return map[string]any{"sidebar": parsed, "raw": raw}, []string{"blog-cli site sidebar set sidebar.json"}, nil
		}
		if arguments[1] == "set" && len(arguments) == 3 {
			raw, err := app.readValue(arguments[2])
			if err != nil {
				return nil, nil, err
			}
			var parsed any
			if decodeErr := json.Unmarshal([]byte(raw), &parsed); decodeErr != nil {
				return nil, nil, &cliError{Code: "invalid_json", Message: "invalid sidebar JSON: " + decodeErr.Error(), ExitCode: 2}
			}
			if _, ok := parsed.([]any); !ok {
				return nil, nil, &cliError{Code: "invalid_sidebar", Message: "sidebar JSON must be an array", ExitCode: 2}
			}
			compact, _ := json.Marshal(parsed)
			payload, requestErr := app.client.request(http.MethodPut, "/api/option", map[string]any{"nav_links": string(compact)}, true)
			return map[string]any{"result": payload, "sidebar": parsed}, []string{"blog-cli site sidebar get --json"}, requestErr
		}
		return nil, nil, argumentError("expected site sidebar get or site sidebar set FILE")
	default:
		return nil, nil, argumentError("unknown site subcommand: "+arguments[0], "blog-cli help --json")
	}
}

func (app *application) fileCommand(arguments []string) (any, []string, *cliError) {
	if len(arguments) == 0 {
		return nil, nil, argumentError("missing file subcommand", "blog-cli help --json")
	}
	action, rest := arguments[0], arguments[1:]
	switch action {
	case "list":
		args, err := parseArgs(rest, []string{"--search"}, nil)
		if err != nil {
			return nil, nil, err
		}
		if len(args.positionals) != 0 {
			return nil, nil, argumentError("file list accepts only --search")
		}
		var payload map[string]any
		if args.has("--search") {
			payload, err = app.client.request(http.MethodPost, "/api/file/search", map[string]any{"keyword": args.value("--search")}, true)
		} else {
			payload, err = app.client.request(http.MethodGet, "/api/file", nil, true)
		}
		if err != nil {
			return nil, nil, err
		}
		files := objectSlice(payload["files"])
		return map[string]any{"files": files, "count": len(files)}, []string{"blog-cli file upload FILE --description TEXT", "blog-cli file get ID --json"}, nil
	case "get":
		args, err := parseArgs(rest, nil, nil)
		if err != nil {
			return nil, nil, err
		}
		if err := requirePositionals(args, 1, "file get ID"); err != nil {
			return nil, nil, err
		}
		payload, requestErr := app.client.request(http.MethodGet, "/api/file/"+pathEscape(args.positionals[0]), nil, true)
		return payload, []string{"blog-cli file delete " + args.positionals[0] + " --yes --json"}, requestErr
	case "upload":
		args, err := parseArgs(rest, []string{"--description"}, nil)
		if err != nil {
			return nil, nil, err
		}
		if err := requirePositionals(args, 1, "file upload FILE [--description TEXT]"); err != nil {
			return nil, nil, err
		}
		if info, statErr := os.Stat(args.positionals[0]); statErr != nil || !info.Mode().IsRegular() {
			return nil, nil, &cliError{Code: "file_not_found", Message: "file not found: " + args.positionals[0], ExitCode: 2}
		}
		payload, requestErr := app.client.upload(args.positionals[0], args.value("--description"))
		return payload, []string{"在文章中使用返回的 file.path", "blog-cli file list --json"}, requestErr
	case "delete":
		args, err := parseArgs(rest, nil, []string{"--yes"})
		if err != nil {
			return nil, nil, err
		}
		if err := requirePositionals(args, 1, "file delete ID --yes"); err != nil {
			return nil, nil, err
		}
		if err := app.requireYes(args.has("--yes"), "blog-cli file delete "+args.positionals[0]); err != nil {
			return nil, nil, err
		}
		payload, requestErr := app.client.request(http.MethodDelete, "/api/file/"+pathEscape(args.positionals[0]), nil, true)
		return payload, []string{"blog-cli file list --json"}, requestErr
	default:
		return nil, nil, argumentError("unknown file subcommand: "+action, "blog-cli help --json")
	}
}

func (app *application) serverCommand(arguments []string) (any, []string, *cliError) {
	if len(arguments) == 0 || arguments[0] != "shutdown" {
		return nil, nil, argumentError("expected server shutdown --yes")
	}
	args, err := parseArgs(arguments[1:], nil, []string{"--yes"})
	if err != nil {
		return nil, nil, err
	}
	if len(args.positionals) != 0 {
		return nil, nil, argumentError("server shutdown accepts only --yes")
	}
	if err := app.requireYes(args.has("--yes"), "blog-cli server shutdown"); err != nil {
		return nil, nil, err
	}
	payload, requestErr := app.client.request(http.MethodPost, "/api/option/shutdown", map[string]any{}, true)
	return payload, nil, requestErr
}

func (app *application) readValue(name string) (string, *cliError) {
	if name == "-" {
		content, err := io.ReadAll(app.in)
		if err != nil {
			return "", asCLIError(err, "local_error")
		}
		return string(content), nil
	}
	content, err := os.ReadFile(name)
	if err != nil {
		return "", &cliError{Code: "file_not_found", Message: err.Error(), ExitCode: 2}
	}
	return string(content), nil
}

func (app *application) requireYes(confirmed bool, command string) *cliError {
	if confirmed {
		return nil
	}
	if input, ok := app.in.(*os.File); ok && isTerminal(input) {
		fmt.Fprint(app.errOut, "此操作不可撤销。输入 yes 继续: ")
		answer, _ := bufio.NewReader(input).ReadString('\n')
		if strings.EqualFold(strings.TrimSpace(answer), "yes") {
			return nil
		}
	}
	return &cliError{Code: "confirmation_required", Message: "destructive operation was not run: explicit confirmation required", Hints: []string{command + " --yes"}, ExitCode: 2}
}

func namedValue(args commandArgs, option string, allowed map[string]int) (int, bool, *cliError) {
	if !args.has(option) {
		return 0, false, nil
	}
	value, ok := allowed[args.value(option)]
	if !ok {
		names := make([]string, 0, len(allowed))
		for name := range allowed {
			names = append(names, name)
		}
		sort.Strings(names)
		return 0, false, argumentError(option + " must be one of: " + strings.Join(names, ", "))
	}
	return value, true, nil
}

func objectSlice(value any) []map[string]any {
	items, _ := value.([]any)
	result := make([]map[string]any, 0, len(items))
	for _, item := range items {
		if object, ok := item.(map[string]any); ok {
			result = append(result, object)
		}
	}
	return result
}

func objectValue(value any) map[string]any { object, _ := value.(map[string]any); return object }
func stringValue(value any) string {
	if value == nil {
		return ""
	}
	return fmt.Sprint(value)
}
func intValue(value any) int {
	if number, ok := value.(float64); ok {
		return int(number)
	}
	if number, ok := value.(int); ok {
		return number
	}
	return 0
}
func statusName(value int) string {
	for name, candidate := range pageStatuses {
		if candidate == value {
			return name
		}
	}
	return "unknown"
}
