package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

var defaultBaseURL string

type pendingLogin struct {
	DeviceCode              string `json:"deviceCode"`
	UserCode                string `json:"userCode"`
	VerificationURI         string `json:"verificationUri"`
	VerificationURIComplete string `json:"verificationUriComplete"`
	ExpiresIn               int64  `json:"expiresIn"`
	Interval                int64  `json:"interval"`
	CreatedAt               int64  `json:"createdAt"`
}

type configuration struct {
	BaseURL string        `json:"baseUrl,omitempty"`
	Token   string        `json:"token,omitempty"`
	Pending *pendingLogin `json:"pending,omitempty"`
	path    string
}

func configurationPath(override string) (string, error) {
	if override != "" {
		return override, nil
	}
	if configured := os.Getenv("BLOG_CLI_CONFIG"); configured != "" {
		return configured, nil
	}
	root := os.Getenv("XDG_CONFIG_HOME")
	if root == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		root = filepath.Join(home, ".config")
	}
	return filepath.Join(root, "blog-cli", "config.json"), nil
}

func loadConfiguration(override string) (configuration, *cliError) {
	path, err := configurationPath(override)
	if err != nil {
		return configuration{}, asCLIError(err, "config_error")
	}
	config := configuration{path: path}
	content, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return config, nil
	}
	if err != nil {
		return config, asCLIError(err, "config_error")
	}
	if err := json.Unmarshal(content, &config); err != nil {
		return config, &cliError{Code: "config_error", Message: fmt.Sprintf("invalid config file %s: %v", path, err), ExitCode: 1}
	}
	config.path = path
	return config, nil
}

func (config configuration) save() *cliError {
	if err := os.MkdirAll(filepath.Dir(config.path), 0o700); err != nil {
		return asCLIError(err, "config_error")
	}
	encoded, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return asCLIError(err, "config_error")
	}
	temporary, err := os.CreateTemp(filepath.Dir(config.path), ".config-*")
	if err != nil {
		return asCLIError(err, "config_error")
	}
	temporaryPath := temporary.Name()
	defer os.Remove(temporaryPath)
	if err := temporary.Chmod(0o600); err == nil {
		_, err = temporary.Write(append(encoded, '\n'))
	}
	closeErr := temporary.Close()
	if err != nil {
		return asCLIError(err, "config_error")
	}
	if closeErr != nil {
		return asCLIError(closeErr, "config_error")
	}
	if err := os.Rename(temporaryPath, config.path); err != nil {
		return asCLIError(err, "config_error")
	}
	return nil
}
