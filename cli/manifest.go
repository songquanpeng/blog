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
			"blog-cli page list --json",
			"blog-cli page create --title TITLE --link SLUG --content-file post.md --status published --json",
			"blog-cli file upload cover.webp --description COVER --json",
		},
		"commands": map[string]any{
			"info":                   map[string]any{"purpose": "Show server and CLI metadata"},
			"auth login":             map[string]any{"purpose": "Start/resume device-flow login", "options": []string{"--resume", "--wait", "--no-wait", "--no-browser", "--client-name NAME"}},
			"auth status|logout":     map[string]any{"purpose": "Validate or revoke the current token"},
			"page list":              map[string]any{"purpose": "List/search pages", "options": []string{"--search TEXT", "--type TYPE", "--status STATUS"}},
			"page get ID_OR_LINK":    map[string]any{"purpose": "Get complete page content"},
			"page create":            map[string]any{"purpose": "Create an article/page", "required": []string{"--title", "--link"}, "options": pageInputOptions()},
			"page update ID_OR_LINK": map[string]any{"purpose": "Patch specified fields", "options": pageInputOptions()},
			"page publish|recall|hide|top ID_OR_LINK": map[string]any{"purpose": "Change publication state only"},
			"page delete ID_OR_LINK --yes":            map[string]any{"purpose": "Permanently delete a page"},
			"page export ID_OR_LINK [--output FILE]":  map[string]any{"purpose": "Export Markdown"},
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

func pageInputOptions() []string {
	return []string{"--title", "--link", "--content", "--content-file", "--type", "--status", "--tags", "--description", "--password", "--comments", "--no-comments"}
}
