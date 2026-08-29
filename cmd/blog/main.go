package main

import (
	"log"

	"github.com/songquanpeng/blog/internal/blog"
)

func main() {
	app, err := blog.New()
	if err != nil {
		log.Fatal(err)
	}
	defer app.Close()

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
