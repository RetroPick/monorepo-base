package gamma

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const defaultTimeout = 15 * time.Second

// Event is a minimal Polymarket Gamma event row used by the Markets BFF catalog.
type Event struct {
	ID    string
	Slug  string
	Title string
}

// Client reads the public Polymarket Gamma HTTP API.
type Client struct {
	baseURL    string
	httpClient *http.Client
}

func NewClient(baseURL string) *Client {
	baseURL = strings.TrimSpace(baseURL)
	if baseURL == "" {
		baseURL = "https://gamma-api.polymarket.com"
	}
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{
			Timeout: defaultTimeout,
		},
	}
}

func (c *Client) ListEvents(ctx context.Context, limit, offset int) ([]Event, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	u, err := url.Parse(c.baseURL + "/events")
	if err != nil {
		return nil, fmt.Errorf("gamma events url: %w", err)
	}
	q := u.Query()
	q.Set("limit", strconv.Itoa(limit))
	q.Set("active", "true")
	q.Set("closed", "false")
	if offset > 0 {
		q.Set("offset", strconv.Itoa(offset))
	}
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")

	res, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	body, err := io.ReadAll(io.LimitReader(res.Body, 8<<20))
	if err != nil {
		return nil, err
	}
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("gamma events: status %d", res.StatusCode)
	}

	var raw []struct {
		ID    json.RawMessage `json:"id"`
		Slug  string          `json:"slug"`
		Title string          `json:"title"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, fmt.Errorf("gamma events decode: %w", err)
	}

	out := make([]Event, 0, len(raw))
	for _, row := range raw {
		id := strings.TrimSpace(string(row.ID))
		if len(id) >= 2 && id[0] == '"' && id[len(id)-1] == '"' {
			id = strings.Trim(id, `"`)
		}
		if id == "" || row.Title == "" {
			continue
		}
		out = append(out, Event{
			ID:    id,
			Slug:  row.Slug,
			Title: row.Title,
		})
	}
	return out, nil
}
