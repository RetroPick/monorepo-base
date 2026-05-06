package api

import (
	"encoding/hex"
	"encoding/json"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"golang.org/x/time/rate"

	"retropick/apps/backend/internal/config"
	"retropick/apps/backend/internal/ethops"
	"retropick/apps/backend/internal/registry"
)

const baseSepoliaChainID int64 = 84532

// faucetRelayIPLimiters holds per-IP rate limiters for POST /faucet-relay (best-effort abuse throttle).
var faucetRelayIPLimiters sync.Map // string -> *rate.Limiter

func faucetRelayLimiterForIP(ip string) *rate.Limiter {
	// ~10 claims per minute per IP with small burst.
	const burst = 4
	lim, _ := faucetRelayIPLimiters.LoadOrStore(ip, rate.NewLimiter(rate.Every(6*time.Second), burst))
	return lim.(*rate.Limiter)
}

type faucetRelayRequest struct {
	Recipient string `json:"recipient"`
	Amount    string `json:"amount"`
	Deadline  uint64 `json:"deadline"`
	Signature string `json:"signature"`
}

// UserFaucetRelayHandler relays TokenFaucet.requestWithSig when relay is enabled (Base Sepolia only).
func UserFaucetRelayHandler(cfg *config.Config, relayer *ethops.FaucetRelayer, reg *registry.Registry) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}
		if cfg == nil || !cfg.FaucetRelayEnabled || relayer == nil {
			if cfg == nil || !cfg.FaucetRelayEnabled {
				writeJSON(w, http.StatusNotImplemented, map[string]any{
					"error":               "faucet relay not enabled",
					"faucetRelayEnabled": false,
				})
				return
			}
		}
		if reg == nil || reg.ChainID != baseSepoliaChainID {
			writeJSON(w, http.StatusBadRequest, map[string]any{
				"error": "faucet relay only supported on Base Sepolia",
			})
			return
		}

		// chi middleware.RealIP sets RemoteAddr from X-Forwarded-For when present.
		ip := strings.TrimSpace(r.RemoteAddr)
		if !faucetRelayLimiterForIP(ip).Allow() {
			writeJSON(w, http.StatusTooManyRequests, map[string]any{"error": "rate limited"})
			return
		}

		var body faucetRelayRequest
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid json"})
			return
		}
		if relayer == nil {
			writeJSON(w, http.StatusNotImplemented, map[string]any{
				"error":               "faucet relay not enabled",
				"faucetRelayEnabled": false,
			})
			return
		}

		recipient := strings.TrimSpace(body.Recipient)
		if !strings.HasPrefix(recipient, "0x") || len(recipient) != 42 {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid recipient"})
			return
		}
		amount, ok := new(big.Int).SetString(strings.TrimSpace(body.Amount), 10)
		if !ok || amount.Sign() <= 0 {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid amount"})
			return
		}

		sigHex := strings.TrimPrefix(strings.TrimSpace(body.Signature), "0x")
		sig, err := hex.DecodeString(sigHex)
		if err != nil || len(sig) != 65 {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid signature"})
			return
		}

		rpcCtx, cancel := liveRPCContext(r)
		defer cancel()

		faucet := common.HexToAddress(reg.Contracts.TokenFaucet)
		txHash, err := relayer.RelayRequestWithSig(
			rpcCtx,
			faucet,
			common.HexToAddress(recipient),
			amount,
			body.Deadline,
			sig,
			cfg.FaucetRelayDeadlineMax,
		)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"txHash": txHash.Hex(),
		})
	}
}
