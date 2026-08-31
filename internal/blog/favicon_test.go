package blog

import (
	"crypto/sha256"
	"fmt"
	"os"
	"path/filepath"
	"testing"
)

func TestBundledFaviconMatchesHistoricalSite(t *testing.T) {
	// Taken from cnvps /home/ubuntu/data/blog/index/favicon.ico (iamazing.cn).
	// A path-selection test alone previously passed with a GitHub icon bundled.
	data, err := os.ReadFile(filepath.Join("..", "..", "data", "index", "favicon.ico"))
	if err != nil {
		t.Fatal(err)
	}
	const want = "7c91e6082fce0b2c679c340f4e65f08000b9e4f03bebf90657330292d418b1ed"
	if got := fmt.Sprintf("%x", sha256.Sum256(data)); got != want {
		t.Fatalf("bundled favicon hash = %s, want historical avatar %s", got, want)
	}
}
