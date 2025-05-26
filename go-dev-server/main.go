package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
)

func main() {
	executablePath, err := os.Executable()
	if err != nil {
		log.Fatalf("Failed to get executable path: %v", err)
	}
	executableDir := filepath.Dir(executablePath)

	staticDir := "./go-dev-server/static"

	if _, err := os.Stat(staticDir); os.IsNotExist(err) {
		// If binary is located at root of go-dev-server
		staticDir = filepath.Join(executableDir, "static")
		// If binary is not present at root, assume cwd is go-dev-server
		if _, err := os.Stat(staticDir); os.IsNotExist(err) {
			staticDir = "./static"
		}
	}

	fs := http.FileServer(http.Dir(staticDir))
	http.Handle("/", fs)

	port := "8080"
	log.Printf("Starting server on http://localhost:%s", port)
	log.Printf("Serving files from directory: %s", staticDir)

	if err = http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
