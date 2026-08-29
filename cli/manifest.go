package main

func commandManifest() map[string]any {
	return map[string]any{
		"name": "blog-cli", "version": version,
		"contract": map[string]any{
			"structuredOutput":   "Use --json anywhere; non-TTY stdout is JSON automatically.",
			"success":            "Exit 0: {ok:true,data:...,hints:[...]}",
			"errors":             "Non-zero: {ok:false,error:{code,message,httpStatus?,details?},hints:[...]}",
			"contentInput":       "Use --content-file FILE, or --content-file - for stdin.",
			"destructiveActions": "Pass --yes. Non-interactive calls fail safely without it.",
			"resourceIDs":        "Pages accept an exact ID or permalink; files use file ID.",
		},
		"recommendedWorkflow": []string{
			"blog-cli auth status --json",
			"blog-cli search TOPIC --json",
			"blog-cli page create --title TITLE --link SLUG --content-file post.md --status published --json",
			"blog-cli microblog create TEXT --status public --json",
			"blog-cli file upload cover.webp --description COVER --json",
		},
		"commands": map[string]any{
			"info":                   map[string]any{"purpose": "Show server and CLI metadata"},
			"auth login":             map[string]any{"purpose": "Start/resume device-flow login", "options": []string{"--resume", "--wait", "--no-wait", "--no-browser", "--client-name NAME"}},
			"auth status|logout":     map[string]any{"purpose": "Validate or revoke the current token"},
			"search QUERY":           map[string]any{"purpose": "Search full page and microblog content with metadata", "options": []string{"--scope all|page|microblog", "--type TYPE", "--page-status STATUS", "--micro-status public|private", "--limit N", "--offset N"}},
			"page list":              map[string]any{"purpose": "List/search pages", "options": []string{"--search TEXT", "--type TYPE", "--status STATUS"}},
			"page search QUERY":      map[string]any{"purpose": "Search full page content and return views/votes/dates", "options": []string{"--type TYPE", "--status STATUS"}},
			"page get ID_OR_LINK":    map[string]any{"purpose": "Get complete page content"},
			"page create":            map[string]any{"purpose": "Create an article/page", "required": []string{"--title", "--link"}, "options": pageInputOptions()},
			"page update ID_OR_LINK": map[string]any{"purpose": "Patch specified fields", "options": pageInputOptions()},
			"page publish|recall|hide|top ID_OR_LINK": map[string]any{"purpose": "Change publication state only"},
			"page delete ID_OR_LINK --yes":            map[string]any{"purpose": "Permanently delete a page"},
			"page export ID_OR_LINK [--output FILE]":  map[string]any{"purpose": "Export Markdown"},
			"microblog list|get":                      map[string]any{"purpose": "List/search or get microblog posts", "options": []string{"--search TEXT", "--status public|private", "--limit N", "--offset N"}},
			"microblog create [TEXT]":                 map[string]any{"purpose": "Create a microblog post", "options": microblogInputOptions()},
			"microblog update ID [TEXT]":              map[string]any{"purpose": "Update microblog content or visibility", "options": microblogInputOptions()},
			"microblog publish|private ID":            map[string]any{"purpose": "Change microblog visibility only"},
			"microblog delete ID --yes":               map[string]any{"purpose": "Permanently delete a microblog post"},
			"settings list|get|set":                   map[string]any{"purpose": "Manage every site option"},
			"site show|title":                         map[string]any{"purpose": "Show site settings or get/set title"},
			"site sidebar get|set FILE":               map[string]any{"purpose": "Get/set validated sidebar JSON"},
			"file list|get|upload|delete":             map[string]any{"purpose": "Manage uploaded files", "note": "delete requires --yes"},
			"server shutdown --yes":                   map[string]any{"purpose": "Stop server when enabled"},
		},
		"pageTypes": pageTypes, "pageStatuses": pageStatuses,
		"discovery": []string{"blog-cli help --json", "blog-cli COMMAND --help"},
	}
}

func microblogInputOptions() []string {
	return []string{"--content", "--content-file", "--status public|private"}
}

func pageInputOptions() []string {
	return []string{"--title", "--link", "--content", "--content-file", "--type", "--status", "--tags", "--description", "--password", "--comments", "--no-comments"}
}
