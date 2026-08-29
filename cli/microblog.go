package main

import (
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

var microblogStatuses = map[string]int{"private": 0, "public": 1}

func (app *application) searchPages(query string, args commandArgs) ([]map[string]any, *cliError) {
	kind, kindSet, err := namedValue(args, "--type", pageTypes)
	if err != nil {
		return nil, err
	}
	status, statusSet, err := namedValue(args, "--status", pageStatuses)
	if err != nil {
		return nil, err
	}
	searchType := -1
	if kindSet {
		searchType = kind
	}
	payload, requestErr := app.client.request(http.MethodPost, "/api/page/search", map[string]any{"keyword": query, "type": searchType}, true)
	if requestErr != nil {
		return nil, requestErr
	}
	pages := objectSlice(payload["pages"])
	filtered := make([]map[string]any, 0, len(pages))
	for _, page := range pages {
		if statusSet && intValue(page["pageStatus"]) != status {
			continue
		}
		delete(page, "password")
		filtered = append(filtered, page)
	}
	return filtered, nil
}

func (app *application) searchCommand(arguments []string) (any, []string, *cliError) {
	args, err := parseArgs(arguments, []string{"--scope", "--type", "--page-status", "--micro-status", "--limit", "--offset"}, nil)
	if err != nil {
		return nil, nil, err
	}
	if err := requirePositionals(args, 1, "search QUERY [--scope all|page|microblog]"); err != nil {
		return nil, nil, err
	}
	scope := args.value("--scope")
	if scope == "" {
		scope = "all"
	}
	if scope != "all" && scope != "page" && scope != "microblog" {
		return nil, nil, argumentError("--scope must be one of: all, microblog, page")
	}
	limit, offset, parseErr := resultWindow(args)
	if parseErr != nil {
		return nil, nil, parseErr
	}
	query := args.positionals[0]
	pages, posts := []map[string]any{}, []map[string]any{}
	if scope == "all" || scope == "page" {
		pageArgs := commandArgs{values: map[string]string{}, present: map[string]bool{}}
		if args.has("--type") {
			pageArgs.values["--type"], pageArgs.present["--type"] = args.value("--type"), true
		}
		if args.has("--page-status") {
			pageArgs.values["--status"], pageArgs.present["--status"] = args.value("--page-status"), true
		}
		pages, err = app.searchPages(query, pageArgs)
		if err != nil {
			return nil, nil, err
		}
		pages = sliceWindow(pages, offset, limit)
	}
	if scope == "all" || scope == "microblog" {
		status := -1
		if args.has("--micro-status") {
			value, _, namedErr := namedValue(args, "--micro-status", microblogStatuses)
			if namedErr != nil {
				return nil, nil, namedErr
			}
			status = value
		}
		payload, requestErr := app.client.request(http.MethodPost, "/api/microblog/search", map[string]any{
			"keyword": query, "status": status, "offset": offset, "limit": limit,
		}, true)
		if requestErr != nil {
			return nil, nil, requestErr
		}
		posts = objectSlice(payload["posts"])
	}
	return map[string]any{"query": query, "scope": scope, "pages": pages, "microPosts": posts,
		"count": len(pages) + len(posts)}, []string{"查看文章全文: blog-cli page get ID_OR_LINK --json", "查看微博: blog-cli microblog get ID --json"}, nil
}

func (app *application) microblogCommand(arguments []string) (any, []string, *cliError) {
	if len(arguments) == 0 {
		return nil, nil, argumentError("missing microblog subcommand", "blog-cli help --json")
	}
	action, rest := arguments[0], arguments[1:]
	switch action {
	case "list":
		args, err := parseArgs(rest, []string{"--search", "--status", "--limit", "--offset"}, nil)
		if err != nil {
			return nil, nil, err
		}
		if err := requirePositionals(args, 0, "microblog list [--search TEXT] [--status public|private]"); err != nil {
			return nil, nil, err
		}
		limit, offset, parseErr := resultWindow(args)
		if parseErr != nil {
			return nil, nil, parseErr
		}
		status, statusSet, parseErr := namedValue(args, "--status", microblogStatuses)
		if parseErr != nil {
			return nil, nil, parseErr
		}
		var payload map[string]any
		if args.has("--search") || statusSet {
			if !statusSet {
				status = -1
			}
			payload, err = app.client.request(http.MethodPost, "/api/microblog/search", map[string]any{
				"keyword": args.value("--search"), "status": status, "offset": offset, "limit": limit,
			}, true)
		} else {
			query := url.Values{"offset": {strconv.Itoa(offset)}, "limit": {strconv.Itoa(limit)}}
			payload, err = app.client.request(http.MethodGet, "/api/microblog?"+query.Encode(), nil, true)
		}
		if err != nil {
			return nil, nil, err
		}
		posts := objectSlice(payload["posts"])
		return map[string]any{"posts": posts, "count": len(posts), "total": payload["total"], "offset": offset, "limit": limit},
			[]string{"查看: blog-cli microblog get ID --json", "发布: blog-cli microblog create TEXT --json"}, nil
	case "get":
		args, err := parseArgs(rest, nil, nil)
		if err != nil {
			return nil, nil, err
		}
		if err := requirePositionals(args, 1, "microblog get ID"); err != nil {
			return nil, nil, err
		}
		payload, requestErr := app.client.request(http.MethodGet, "/api/microblog/"+pathEscape(args.positionals[0]), nil, true)
		return payload, []string{"blog-cli microblog update " + args.positionals[0] + " TEXT --json"}, requestErr
	case "create":
		args, err := parseArgs(rest, []string{"--content", "--content-file", "--status"}, nil)
		if err != nil {
			return nil, nil, err
		}
		content, contentSet, contentErr := app.microblogContent(args, 0)
		if contentErr != nil {
			return nil, nil, contentErr
		}
		if !contentSet {
			return nil, nil, argumentError("microblog create requires content", "blog-cli microblog create TEXT", "blog-cli microblog create --content-file -")
		}
		status, statusSet, statusErr := namedValue(args, "--status", microblogStatuses)
		if statusErr != nil {
			return nil, nil, statusErr
		}
		if !statusSet {
			status = 1
		}
		payload, requestErr := app.client.request(http.MethodPost, "/api/microblog", map[string]any{"content": content, "status": status}, true)
		if requestErr != nil {
			return nil, nil, requestErr
		}
		post := objectValue(payload["post"])
		return payload, []string{"blog-cli microblog get " + stringValue(post["id"]) + " --json"}, nil
	case "update":
		args, err := parseArgs(rest, []string{"--content", "--content-file", "--status"}, nil)
		if err != nil {
			return nil, nil, err
		}
		if len(args.positionals) < 1 {
			return nil, nil, argumentError("expected microblog update ID [TEXT] [options]")
		}
		content, contentSet, contentErr := app.microblogContent(args, 1)
		if contentErr != nil {
			return nil, nil, contentErr
		}
		status, statusSet, statusErr := namedValue(args, "--status", microblogStatuses)
		if statusErr != nil {
			return nil, nil, statusErr
		}
		if !contentSet && !statusSet {
			return nil, nil, argumentError("microblog update requires replacement content or --status")
		}
		id := args.positionals[0]
		payload, requestErr := app.client.request(http.MethodGet, "/api/microblog/"+pathEscape(id), nil, true)
		if requestErr != nil {
			return nil, nil, requestErr
		}
		post := objectValue(payload["post"])
		if contentSet {
			post["content"] = content
		}
		if statusSet {
			post["status"] = status
		}
		result, requestErr := app.client.request(http.MethodPut, "/api/microblog/"+pathEscape(id), post, true)
		return map[string]any{"result": result, "post": post}, []string{"blog-cli microblog get " + id + " --json"}, requestErr
	case "publish", "private":
		args, err := parseArgs(rest, nil, nil)
		if err != nil {
			return nil, nil, err
		}
		if err := requirePositionals(args, 1, "microblog "+action+" ID"); err != nil {
			return nil, nil, err
		}
		status := microblogStatuses[action]
		id := args.positionals[0]
		payload, requestErr := app.client.request(http.MethodGet, "/api/microblog/"+pathEscape(id), nil, true)
		if requestErr != nil {
			return nil, nil, requestErr
		}
		post := objectValue(payload["post"])
		post["status"] = status
		if _, requestErr = app.client.request(http.MethodPut, "/api/microblog/"+pathEscape(id), post, true); requestErr != nil {
			return nil, nil, requestErr
		}
		return map[string]any{"post": post, "statusName": action}, []string{"blog-cli microblog get " + id + " --json"}, nil
	case "delete":
		args, err := parseArgs(rest, nil, []string{"--yes"})
		if err != nil {
			return nil, nil, err
		}
		if err := requirePositionals(args, 1, "microblog delete ID --yes"); err != nil {
			return nil, nil, err
		}
		id := args.positionals[0]
		if err := app.requireYes(args.has("--yes"), "blog-cli microblog delete "+id); err != nil {
			return nil, nil, err
		}
		payload, requestErr := app.client.request(http.MethodDelete, "/api/microblog/"+pathEscape(id), nil, true)
		return payload, []string{"blog-cli microblog list --json"}, requestErr
	default:
		return nil, nil, argumentError("unknown microblog subcommand: "+action, "blog-cli help --json")
	}
}

func (app *application) microblogContent(args commandArgs, skipPositionals int) (string, bool, *cliError) {
	if args.has("--content") && args.has("--content-file") {
		return "", false, argumentError("--content and --content-file are mutually exclusive")
	}
	if len(args.positionals) > skipPositionals && (args.has("--content") || args.has("--content-file")) {
		return "", false, argumentError("positional content, --content, and --content-file are mutually exclusive")
	}
	if args.has("--content-file") {
		value, err := app.readValue(args.value("--content-file"))
		return value, err == nil, err
	}
	if args.has("--content") {
		return args.value("--content"), true, nil
	}
	if len(args.positionals) > skipPositionals {
		values := args.positionals[skipPositionals:]
		if len(values) == 1 && values[0] == "-" {
			value, err := app.readValue("-")
			return value, err == nil, err
		}
		return strings.Join(values, " "), true, nil
	}
	return "", false, nil
}

func resultWindow(args commandArgs) (int, int, *cliError) {
	limit, offset := 50, 0
	for option, target := range map[string]*int{"--limit": &limit, "--offset": &offset} {
		if !args.has(option) {
			continue
		}
		value, err := strconv.Atoi(args.value(option))
		if err != nil {
			return 0, 0, argumentError(option + " must be an integer")
		}
		*target = value
	}
	if limit < 1 || limit > 500 {
		return 0, 0, argumentError("--limit must be between 1 and 500")
	}
	if offset < 0 {
		return 0, 0, argumentError("--offset cannot be negative")
	}
	return limit, offset, nil
}

func sliceWindow(items []map[string]any, offset, limit int) []map[string]any {
	if offset >= len(items) {
		return []map[string]any{}
	}
	end := offset + limit
	if end > len(items) {
		end = len(items)
	}
	return items[offset:end]
}
