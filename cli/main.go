package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"runtime"
	"strings"
)

var version = "dev"

type cliError struct {
	Code       string
	Message    string
	HTTPStatus int
	Hints      []string
	Details    any
	ExitCode   int
}

func (e *cliError) Error() string { return e.Message }

type globalOptions struct {
	JSON      bool
	NoHints   bool
	BaseURL   string
	Token     string
	Config    string
	Remaining []string
}

type application struct {
	in      io.Reader
	out     io.Writer
	errOut  io.Writer
	machine bool
	noHints bool
	config  configuration
	client  *apiClient
}

func main() {
	os.Exit(run(os.Args[1:], os.Stdin, os.Stdout, os.Stderr))
}

func run(args []string, in io.Reader, out, errOut io.Writer) int {
	options, err := extractGlobals(args)
	if err != nil {
		return writeFailure(errOut, true, false, err)
	}
	machine := options.JSON || !isTerminal(out)
	if options.JSON && contains(options.Remaining, "--help") {
		options.Remaining = []string{"help"}
	}
	config, loadErr := loadConfiguration(options.Config)
	if loadErr != nil {
		return writeFailure(errOut, machine, options.NoHints, loadErr)
	}
	if options.BaseURL != "" {
		config.BaseURL = strings.TrimRight(options.BaseURL, "/")
		if saveErr := config.save(); saveErr != nil {
			return writeFailure(errOut, machine, options.NoHints, saveErr)
		}
	}
	baseURL := firstNonEmpty(options.BaseURL, os.Getenv("BLOG_CLI_BASE_URL"), config.BaseURL, defaultBaseURL)
	token := firstNonEmpty(options.Token, os.Getenv("BLOG_CLI_TOKEN"), config.Token)
	app := &application{in: in, out: out, errOut: errOut, machine: machine, noHints: options.NoHints,
		config: config, client: newAPIClient(baseURL, token)}
	data, hints, commandErr := app.execute(options.Remaining)
	if commandErr != nil {
		return writeFailure(errOut, machine, options.NoHints, commandErr)
	}
	if data != nil {
		writeSuccess(out, machine, options.NoHints, data, hints)
	}
	return 0
}

func extractGlobals(args []string) (globalOptions, *cliError) {
	var result globalOptions
	for index := 0; index < len(args); index++ {
		value := args[index]
		switch {
		case value == "--json":
			result.JSON = true
		case value == "--no-hints":
			result.NoHints = true
		case strings.HasPrefix(value, "--base-url="):
			result.BaseURL = strings.TrimPrefix(value, "--base-url=")
		case strings.HasPrefix(value, "--token="):
			result.Token = strings.TrimPrefix(value, "--token=")
		case strings.HasPrefix(value, "--config="):
			result.Config = strings.TrimPrefix(value, "--config=")
		case value == "--base-url" || value == "--token" || value == "--config":
			if index+1 >= len(args) {
				return result, argumentError(value+" requires a value", "blog-cli help --json")
			}
			index++
			switch value {
			case "--base-url":
				result.BaseURL = args[index]
			case "--token":
				result.Token = args[index]
			case "--config":
				result.Config = args[index]
			}
		default:
			result.Remaining = append(result.Remaining, value)
		}
	}
	return result, nil
}

func writeSuccess(writer io.Writer, machine, noHints bool, data any, hints []string) {
	if machine {
		payload := map[string]any{"ok": true, "data": data}
		if len(hints) > 0 && !noHints {
			payload["hints"] = hints
		}
		encoded, _ := json.Marshal(payload)
		fmt.Fprintln(writer, string(encoded))
		return
	}
	encoded, _ := json.MarshalIndent(data, "", "  ")
	fmt.Fprintln(writer, string(encoded))
	if len(hints) > 0 && !noHints {
		fmt.Fprintln(writer, "\nNext steps:")
		for _, hint := range hints {
			fmt.Fprintln(writer, "  - "+hint)
		}
	}
}

func writeFailure(writer io.Writer, machine, noHints bool, err *cliError) int {
	if err.ExitCode == 0 {
		err.ExitCode = 1
	}
	if machine {
		details := map[string]any{"code": err.Code, "message": err.Message}
		if err.HTTPStatus != 0 {
			details["httpStatus"] = err.HTTPStatus
		}
		if err.Details != nil {
			details["details"] = err.Details
		}
		payload := map[string]any{"ok": false, "error": details}
		if len(err.Hints) > 0 && !noHints {
			payload["hints"] = err.Hints
		}
		encoded, _ := json.Marshal(payload)
		fmt.Fprintln(writer, string(encoded))
		return err.ExitCode
	}
	fmt.Fprintf(writer, "Error [%s]: %s\n", err.Code, err.Message)
	if len(err.Hints) > 0 && !noHints {
		fmt.Fprintln(writer, "Next steps:")
		for _, hint := range err.Hints {
			fmt.Fprintln(writer, "  - "+hint)
		}
	}
	return err.ExitCode
}

func argumentError(message string, hints ...string) *cliError {
	return &cliError{Code: "invalid_arguments", Message: message, Hints: hints, ExitCode: 2}
}

func isTerminal(writer io.Writer) bool {
	file, ok := writer.(*os.File)
	if !ok {
		return false
	}
	info, err := file.Stat()
	return err == nil && info.Mode()&os.ModeCharDevice != 0
}

func contains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func hostClientName() string {
	host, _ := os.Hostname()
	if host == "" {
		host = "unknown-host"
	}
	return fmt.Sprintf("blog-cli on %s (%s/%s)", host, runtime.GOOS, runtime.GOARCH)
}

func asCLIError(err error, code string) *cliError {
	var target *cliError
	if errors.As(err, &target) {
		return target
	}
	return &cliError{Code: code, Message: err.Error(), ExitCode: 1}
}
