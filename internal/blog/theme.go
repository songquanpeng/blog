package blog

import "strings"

const (
	publicThemeBulma  = "bulma"
	publicThemeStudio = "studio"
)

func publicTheme(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case publicThemeStudio:
		return publicThemeStudio
	default:
		return publicThemeBulma
	}
}

func validPublicTheme(value string) bool {
	value = strings.ToLower(strings.TrimSpace(value))
	return value == publicThemeBulma || value == publicThemeStudio
}
