package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const binance = "https://fapi.binance.com"

type Ticker24h struct {
	Symbol              string `json:"symbol"`
	PriceChange        string `json:"priceChange"`
	PriceChangePercent string `json:"priceChangePercent"`
	LastPrice          string `json:"lastPrice"`
	HighPrice          string `json:"highPrice"`
	LowPrice           string `json:"lowPrice"`
	Volume             string `json:"volume"`
	QuoteVolume        string `json:"quoteVolume"`
	CloseTime          int64  `json:"closeTime"`
}

type PremiumIndex struct {
	Symbol               string `json:"symbol"`
	MarkPrice            string `json:"markPrice"`
	IndexPrice           string `json:"indexPrice"`
	EstimatedSettlePrice string `json:"estimatedSettlePrice"`
	LastFundingRate      string `json:"lastFundingRate"`
	NextFundingTime      int64  `json:"nextFundingTime"`
	Time                 int64  `json:"time"`
}

type HeaderResponse struct {
	Symbol              string `json:"symbol"`
	LastPrice          string `json:"lastPrice"`
	PriceChange        string `json:"priceChange"`
	PriceChangePercent string `json:"priceChangePercent"`
	High24h            string `json:"high24h"`
	Low24h             string `json:"low24h"`
	Volume24h          string `json:"volume24h"`
	QuoteVolume24h     string `json:"quoteVolume24h"`
	MarkPrice          string `json:"markPrice"`
	IndexPrice         string `json:"indexPrice"`
	EstimatedSettle    string `json:"estimatedSettlePrice"`
	LastFundingRate     string `json:"lastFundingRate"`
	Time                int64  `json:"time"`
}

type Tick struct {
	Type        string                  `json:"type"`
	ObservedAt  int64                   `json:"observedAt"`
	Prices      map[string]PremiumIndex `json:"prices"`
	PayloadHash string                  `json:"payloadHash"`
}

var client = &http.Client{Timeout: 8 * time.Second}
var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

func cors(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
}

func getJSON(url string, out any) error {
	res, err := client.Get(url)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		b, _ := io.ReadAll(res.Body)
		return fmt.Errorf("binance %d %s", res.StatusCode, string(b))
	}
	return json.NewDecoder(res.Body).Decode(out)
}

func hashPayload(v any) string {
	b, _ := json.Marshal(v)
	sum := sha256.Sum256(b)
	return "0x" + hex.EncodeToString(sum[:])
}

func health(w http.ResponseWriter, r *http.Request) {
	cors(w)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"ok": true, "service": "retropick-v10-backend"})
}

func headerHandler(w http.ResponseWriter, r *http.Request) {
	cors(w)
	if r.Method == "OPTIONS" {
		return
	}
	symbol := strings.ToUpper(r.URL.Query().Get("symbol"))
	if symbol == "" {
		symbol = "BTCUSDT"
	}

	var ticker Ticker24h
	var mark PremiumIndex
	if err := getJSON(binance+"/fapi/v1/ticker/24hr?symbol="+symbol, &ticker); err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	if err := getJSON(binance+"/fapi/v1/premiumIndex?symbol="+symbol, &mark); err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}

	resp := HeaderResponse{
		Symbol:              symbol,
		LastPrice:           ticker.LastPrice,
		PriceChange:         ticker.PriceChange,
		PriceChangePercent:  ticker.PriceChangePercent,
		High24h:             ticker.HighPrice,
		Low24h:              ticker.LowPrice,
		Volume24h:           ticker.Volume,
		QuoteVolume24h:      ticker.QuoteVolume,
		MarkPrice:           mark.MarkPrice,
		IndexPrice:          mark.IndexPrice,
		EstimatedSettle:     mark.EstimatedSettlePrice,
		LastFundingRate:     mark.LastFundingRate,
		Time:                mark.Time,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func mapInterval(interval string) string {
	switch strings.ToLower(interval) {
	case "1s":
		return "1s"
	case "1m", "5m", "15m", "30m", "1h", "4h", "1d":
		return strings.ToLower(interval)
	case "tick", "5s", "15s", "30s":
		return "1m"
	default:
		return "1m"
	}
}

func klinesHandler(w http.ResponseWriter, r *http.Request) {
	cors(w)
	if r.Method == "OPTIONS" {
		return
	}
	symbol := strings.ToUpper(r.URL.Query().Get("symbol"))
	if symbol == "" {
		symbol = "BTCUSDT"
	}
	interval := mapInterval(r.URL.Query().Get("interval"))
	limit := r.URL.Query().Get("limit")
	if limit == "" {
		limit = "500"
	}
	url := fmt.Sprintf("%s/fapi/v1/markPriceKlines?symbol=%s&interval=%s&limit=%s", binance, symbol, interval, limit)
	res, err := client.Get(url)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer res.Body.Close()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(res.StatusCode)
	io.Copy(w, res.Body)
}

func marketTypesHandler(w http.ResponseWriter, r *http.Request) {
	cors(w)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode([]map[string]any{
		{"id": "direction", "name": "Direction", "formula": "resolvePrice > lockPrice"},
		{"id": "threshold", "name": "Threshold", "formula": "resolvePrice >= threshold"},
		{"id": "range", "name": "RangeClose", "formula": "bucket(resolvePrice)"},
		{"id": "velocity", "name": "Velocity", "formula": "abs(resolve-lock)/lock"},
		{"id": "ladder", "name": "Ladder", "formula": "weightedTier(resolvePrice)"},
		{"id": "convergence", "name": "Convergence", "formula": "endSpread < startSpread"},
		{"id": "composite", "name": "Composite", "formula": "AND/OR/MAJORITY checks"},
		{"id": "corridor", "name": "Corridor", "formula": "pathHigh < upper && pathLow > lower"},
		{"id": "cascade", "name": "Cascade", "formula": "countBrokenLevels(path)"},
	})
}

func fetchPremium(symbol string) (PremiumIndex, error) {
	var p PremiumIndex
	err := getJSON(binance+"/fapi/v1/premiumIndex?symbol="+symbol, &p)
	return p, err
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	cors(w)
	raw := r.URL.Query().Get("symbols")
	if raw == "" {
		raw = "BTCUSDT,ETHUSDT"
	}
	symbols := []string{}
	for _, s := range strings.Split(raw, ",") {
		s = strings.ToUpper(strings.TrimSpace(s))
		if s != "" {
			symbols = append(symbols, s)
		}
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	ticker := time.NewTicker(750 * time.Millisecond)
	defer ticker.Stop()

	for range ticker.C {
		prices := map[string]PremiumIndex{}
		var mu sync.Mutex
		var wg sync.WaitGroup
		for _, sym := range symbols {
			wg.Add(1)
			go func(symbol string) {
				defer wg.Done()
				if p, err := fetchPremium(symbol); err == nil {
					mu.Lock()
					prices[symbol] = p
					mu.Unlock()
				}
			}(sym)
		}
		wg.Wait()
		if len(prices) == 0 {
			continue
		}
		msg := Tick{Type: "PRICE_TICK", ObservedAt: time.Now().UnixMilli(), Prices: prices}
		msg.PayloadHash = hashPayload(msg)
		if err := conn.WriteJSON(msg); err != nil {
			return
		}
	}
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	http.HandleFunc("/health", health)
	http.HandleFunc("/api/v1/market/header", headerHandler)
	http.HandleFunc("/api/v1/market/klines", klinesHandler)
	http.HandleFunc("/api/v1/market/types", marketTypesHandler)
	http.HandleFunc("/ws/market", wsHandler)

	log.Println("RetroPick V10 backend listening on :" + port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
