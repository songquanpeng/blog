package blog

import (
	"reflect"
	"testing"
)

func TestProfileSocialLinksPreserveLegacyOptionsAndFilterUnsafeURLs(t *testing.T) {
	options := map[string]string{
		"social_x_url":           " https://x.com/writer ",
		"social_github_url":      "https://github.com/writer",
		"social_zhihu_url":       "javascript:alert(1)",
		"social_xiaohongshu_url": "//untrusted.example/profile",
		"social_custom_links":    "B 站 ｜ https://space.bilibili.com/123\nAbout | /page/about\nInvalid | data:text/html,bad\nNo URL\n | https://example.com",
	}
	want := []ProfileSocialLink{
		{Name: "X", URL: "https://x.com/writer", Icon: "x"},
		{Name: "GitHub", URL: "https://github.com/writer", Icon: "github"},
		{Name: "B 站", URL: "https://space.bilibili.com/123", Icon: "custom"},
		{Name: "About", URL: "/page/about", Icon: "custom"},
	}
	if got := configuredProfileSocialLinks(options); !reflect.DeepEqual(got, want) {
		t.Fatalf("profile links = %#v, want %#v", got, want)
	}
	if got := configuredProfileSocialLinks(map[string]string{}); len(got) != 0 {
		t.Fatalf("empty options expose social links: %#v", got)
	}
}

func TestBilibiliProfileSocialLink(t *testing.T) {
	for _, tt := range []struct {
		name, value string
		want        []ProfileSocialLink
	}{
		{"configured", " https://space.bilibili.com/123 ", []ProfileSocialLink{{Name: "B 站", URL: "https://space.bilibili.com/123", Icon: "bilibili"}}},
		{"empty", "", []ProfileSocialLink{}},
		{"blank", "  ", []ProfileSocialLink{}},
		{"script", "javascript:alert(1)", []ProfileSocialLink{}},
		{"data", "data:text/html,bad", []ProfileSocialLink{}},
		{"protocol relative", "//untrusted.example/profile", []ProfileSocialLink{}},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got := configuredProfileSocialLinks(map[string]string{"social_bilibili_url": tt.value})
			if !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("Bilibili profile links = %#v, want %#v", got, tt.want)
			}
		})
	}
}
