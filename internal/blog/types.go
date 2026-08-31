package blog

import "html/template"

const (
	PageArticle  = 0
	PageCode     = 1
	PageBulletin = 2
	PageDiscuss  = 3
	PageLinks    = 4
	PageRaw      = 5
	PageMedia    = 6
	PageTimeline = 7
	PageRedirect = 8
	PageText     = 9

	StatusRecalled  = 0
	StatusPublished = 1
	StatusTopped    = 2
	StatusHidden    = 3
)

type Page struct {
	ID            string        `json:"id"`
	Type          int           `json:"type"`
	Link          string        `json:"link"`
	PageStatus    int           `json:"pageStatus"`
	CommentStatus int           `json:"commentStatus"`
	Title         string        `json:"title"`
	Content       string        `json:"content,omitempty"`
	Tag           string        `json:"tag"`
	Password      string        `json:"password,omitempty"`
	View          int           `json:"view"`
	UpVote        int           `json:"upVote"`
	DownVote      int           `json:"downVote"`
	Description   string        `json:"description"`
	CreatedAt     string        `json:"createdAt"`
	UpdatedAt     string        `json:"updatedAt"`
	UserID        string        `json:"UserId"`
	Author        string        `json:"author,omitempty"`
	Tags          []string      `json:"-"`
	Category      string        `json:"-"`
	Rendered      template.HTML `json:"-"`
}

type GitHubUser struct {
	ID        int64  `json:"id"`
	Login     string `json:"login"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
	HTMLURL   string `json:"html_url"`
	IsAdmin   bool   `json:"isAdmin"`
}

type StoredFile struct {
	ID          string `json:"id"`
	Description string `json:"description"`
	Path        string `json:"path"`
	Filename    string `json:"filename"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

const (
	MicroPostPrivate = 0
	MicroPostPublic  = 1
)

// MicroPost is intentionally separate from Page: short notes have no title or
// permalink and can therefore evolve without coupling them to the article
// schema inherited from the original blog.
type MicroPost struct {
	ID        uint64        `json:"id"`
	Content   string        `json:"content"`
	Status    int           `json:"status"`
	CreatedAt string        `json:"createdAt"`
	UpdatedAt string        `json:"updatedAt"`
	Rendered  template.HTML `json:"-"`
	Accent    int           `json:"-"`
}

type Option struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type Link struct {
	Title       string `json:"title"`
	URL         string `json:"link"`
	Image       string `json:"image"`
	Description string `json:"description"`
}

type NavItem struct {
	Text string `json:"text"`
	Link string `json:"link"`
}

type NavGroup struct {
	Key   string    `json:"key"`
	Value []NavItem `json:"value"`
}

type ProfileSocialLink struct {
	Name string
	URL  string
	Icon string
}

type ViewData struct {
	Kind               string
	Lang               string
	OGLocale           string
	Title              string
	Description        string
	Robots             string
	Canonical          string
	SiteURL            string
	SiteName           string
	SiteInitial        string
	Motto              string
	Author             string
	Year               int
	Favicon            string
	BrandImage         string
	ProfileName        string
	ProfileInitial     string
	ProfileBio         string
	ProfileAvatar      string
	ProfileSocialLinks []ProfileSocialLink
	WeChatName         string
	WeChatQR           string
	SocialImage        string
	CodeTheme          string
	Theme              string
	Copyright          template.HTML
	ExtraFooter        template.HTML
	PrimaryNav         []NavItem
	Nav                []NavGroup
	Pages              []Page
	Related            []Page
	MicroPosts         []MicroPost
	MicroOffset        int
	Page               *Page
	Links              []Link
	Prev               *Page
	Next               *Page
	PrevURL            string
	NextURL            string
	ListTitle          string
	Message            string
	JSONLD             template.JS
	Nonce              string
	AllowUnsafe        bool
}
