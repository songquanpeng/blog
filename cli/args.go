package main

import (
	"fmt"
	"strings"
)

type commandArgs struct {
	positionals []string
	values      map[string]string
	present     map[string]bool
}

// parseArgs is deliberately small and predictable: every supported option is
// declared by the command, and options may appear before or after positionals.
func parseArgs(args []string, valueOptions, boolOptions []string) (commandArgs, *cliError) {
	values := make(map[string]bool, len(valueOptions))
	flags := make(map[string]bool, len(boolOptions))
	for _, name := range valueOptions {
		values[name] = true
	}
	for _, name := range boolOptions {
		flags[name] = true
	}
	result := commandArgs{values: map[string]string{}, present: map[string]bool{}}
	for index := 0; index < len(args); index++ {
		argument := args[index]
		if argument == "--" {
			result.positionals = append(result.positionals, args[index+1:]...)
			break
		}
		if !strings.HasPrefix(argument, "--") {
			result.positionals = append(result.positionals, argument)
			continue
		}
		name, inline, hasInline := strings.Cut(argument, "=")
		if flags[name] {
			if hasInline {
				return result, argumentError(fmt.Sprintf("%s does not accept a value", name))
			}
			result.present[name] = true
			continue
		}
		if !values[name] {
			return result, argumentError("unknown option: "+name, "blog-cli help --json")
		}
		if !hasInline {
			if index+1 >= len(args) {
				return result, argumentError(name + " requires a value")
			}
			index++
			inline = args[index]
		}
		result.values[name] = inline
		result.present[name] = true
	}
	return result, nil
}

func (args commandArgs) value(name string) string { return args.values[name] }
func (args commandArgs) has(name string) bool     { return args.present[name] }

func requirePositionals(args commandArgs, count int, usage string) *cliError {
	if len(args.positionals) != count {
		return argumentError("expected "+usage, "blog-cli help --json")
	}
	return nil
}
