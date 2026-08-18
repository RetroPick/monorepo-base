package api

import (
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/go-chi/chi/v5"

	"retropick/apps/backend/internal/ethops"
	"retropick/apps/backend/internal/registry"
)

func registerOpsLiveRoutes(r chi.Router, eth *ethops.Caller, reg *registry.Registry) {
	if eth == nil {
		return
	}
	proxy := common.HexToAddress(reg.Contracts.MarketEngineProxy)

	r.Get("/live/global", func(w http.ResponseWriter, req *http.Request) {
		ctx, cancel := liveRPCContext(req)
		defer cancel()
		data, blockNum, err := eth.GetOperatorGlobalView(ctx, proxy)
		if err != nil {
			writeOpsLiveError(w, err)
			return
		}
		writeLiveJSON(w, reg, blockNum, data)
	})

	r.Get("/live/templates/{templateId}", func(w http.ResponseWriter, req *http.Request) {
		b, ok := parseTemplateIDParam(chi.URLParam(req, "templateId"))
		if !ok {
			http.Error(w, `{"error":"invalid templateId"}`, http.StatusBadRequest)
			return
		}
		tid := common.BytesToHash(b)
		ctx, cancel := liveRPCContext(req)
		defer cancel()
		data, blockNum, err := eth.GetOperatorTemplateView(ctx, proxy, tid)
		if err != nil {
			writeOpsLiveError(w, err)
			return
		}
		writeLiveJSON(w, reg, blockNum, data)
	})

	r.Get("/live/templates/{templateId}/epochs/{epochId}", func(w http.ResponseWriter, req *http.Request) {
		b, ok := parseTemplateIDParam(chi.URLParam(req, "templateId"))
		if !ok {
			http.Error(w, `{"error":"invalid templateId"}`, http.StatusBadRequest)
			return
		}
		tid := common.BytesToHash(b)
		eid, err := parseUint64Param(chi.URLParam(req, "epochId"))
		if err != nil {
			http.Error(w, `{"error":"invalid epochId"}`, http.StatusBadRequest)
			return
		}
		ctx, cancel := liveRPCContext(req)
		defer cancel()
		data, blockNum, err := eth.GetEpochView(ctx, proxy, tid, eid)
		if err != nil {
			writeOpsLiveError(w, err)
			return
		}
		writeLiveJSON(w, reg, blockNum, data)
	})

	r.Get("/live/dispatcher/selector/{selector}", func(w http.ResponseWriter, req *http.Request) {
		raw := strings.TrimPrefix(strings.TrimSpace(chi.URLParam(req, "selector")), "0x")
		selBytes, err := hex.DecodeString(raw)
		if err != nil || len(selBytes) != 4 {
			http.Error(w, `{"error":"invalid selector: want 4 bytes hex"}`, http.StatusBadRequest)
			return
		}
		var sel [4]byte
		copy(sel[:], selBytes)
		ctx, cancel := liveRPCContext(req)
		defer cancel()
		mod, immut, blockNum, err := eth.GetSelectorModule(ctx, proxy, sel)
		if err != nil {
			writeOpsLiveError(w, err)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"source":            "live",
			"chainId":           reg.ChainID,
			"blockNumber":       blockNum,
			"marketEngineProxy": reg.Contracts.MarketEngineProxy,
			"selector":          "0x" + hex.EncodeToString(sel[:]),
			"module":            mod.Hex(),
			"immutableSelector": immut,
		})
	})
}

func writeLiveJSON(w http.ResponseWriter, reg *registry.Registry, blockNum uint64, data map[string]any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"source":            "live",
		"chainId":           reg.ChainID,
		"blockNumber":       blockNum,
		"marketEngineProxy": reg.Contracts.MarketEngineProxy,
		"data":              data,
	})
}

func writeOpsLiveError(w http.ResponseWriter, err error) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadGateway)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"error":   "live_rpc_call_failed",
		"message": err.Error(),
	})
}

func parseUint64Param(s string) (uint64, error) {
	return strconv.ParseUint(strings.TrimSpace(s), 10, 64)
}
