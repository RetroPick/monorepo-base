package main

import (
	"fmt"
	"net/http"
	"os"
	"time"
)

func main() {
	path := "/api/v1/livez"
	if len(os.Args) > 1 && os.Args[1] != "" {
		path = os.Args[1]
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	client := http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get("http://127.0.0.1:" + port + path)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		fmt.Fprintf(os.Stderr, "healthcheck failed: %s\n", resp.Status)
		os.Exit(1)
	}
}
