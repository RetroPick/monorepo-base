package launchboard

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
	"sync"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

//go:embed base_sepolia_9_markets.json
var catalogJSON []byte

//go:embed base_sepolia_7_chainlink_types.json
var chainlinkTypesCatalogJSON []byte

type Catalog struct {
	BoardID            string             `json:"boardId"`
	ChainID            int64              `json:"chainId"`
	Network            string             `json:"network"`
	Contracts          Contracts          `json:"contracts"`
	ManualEpochOffsets ManualEpochOffsets `json:"manualEpochOffsetsSeconds"`
	RollingDefaults    RollingDefaults    `json:"rollingDefaults"`
	Markets            []Market           `json:"markets"`
	byTemplateID       map[string]*Market
	bySlug             map[string]*Market
}

type Contracts struct {
	MarketEngineProxy string `json:"marketEngineProxy"`
	StakeToken        string `json:"stakeToken"`
	ChainlinkAdapter  string `json:"chainlinkAdapter"`
}

type ManualEpochOffsets struct {
	OpenAt    uint64 `json:"openAt"`
	LockAt    uint64 `json:"lockAt"`
	ResolveAt uint64 `json:"resolveAt"`
}

type RollingDefaults struct {
	IntervalSeconds uint64 `json:"intervalSeconds"`
	BufferSeconds   uint64 `json:"bufferSeconds"`
}

type Feed struct {
	Address         string `json:"address"`
	Decimals        uint8  `json:"decimals"`
	MaxDelaySeconds uint64 `json:"maxDelaySeconds"`
}

type Market struct {
	Slug           string   `json:"slug"`
	Title          string   `json:"title"`
	Subtitle       string   `json:"subtitle"`
	ResolutionRule string   `json:"resolutionRule"`
	FeedLabel      string   `json:"feedLabel"`
	Vertical       string   `json:"vertical"`
	DisplayOrder   int      `json:"displayOrder"`
	OutcomeLabels  []string `json:"outcomeLabels"`
	Feed           Feed     `json:"feed"`
	LaunchMode     string   `json:"launchMode"`
	TemplateID     string   `json:"-"`
}

var (
	catalogOnce  sync.Once
	catalogInst  *Catalog
	catalogErr   error
	metadataOnce sync.Once
	metadataInst *Catalog
	metadataErr  error
)

func Default() (*Catalog, error) {
	catalogOnce.Do(func() {
		catalogInst, catalogErr = parseCatalog(catalogJSON)
	})
	return catalogInst, catalogErr
}

// Metadata returns the combined board catalog used to decorate indexed markets.
func Metadata() (*Catalog, error) {
	metadataOnce.Do(func() {
		base, err := parseCatalog(catalogJSON)
		if err != nil {
			metadataErr = err
			return
		}
		chainlink, err := parseCatalog(chainlinkTypesCatalogJSON)
		if err != nil {
			metadataErr = err
			return
		}
		base.Markets = append(base.Markets, chainlink.Markets...)
		metadataErr = base.buildIndexes()
		if metadataErr == nil {
			metadataInst = base
		}
	})
	return metadataInst, metadataErr
}

// LoadFile loads a launch catalog selected by the operator.
func LoadFile(path string) (*Catalog, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read launchboard catalog: %w", err)
	}
	return parseCatalog(raw)
}

func parseCatalog(raw []byte) (*Catalog, error) {
	var c Catalog
	if err := json.Unmarshal(raw, &c); err != nil {
		return nil, fmt.Errorf("launchboard json: %w", err)
	}
	if err := c.buildIndexes(); err != nil {
		return nil, err
	}
	return &c, nil
}

func (c *Catalog) buildIndexes() error {
	c.byTemplateID = make(map[string]*Market, len(c.Markets))
	c.bySlug = make(map[string]*Market, len(c.Markets))
	for i := range c.Markets {
		m := &c.Markets[i]
		if strings.TrimSpace(m.Slug) == "" {
			return fmt.Errorf("launchboard market %d missing slug", i)
		}
		if len(m.OutcomeLabels) == 0 {
			return fmt.Errorf("launchboard market %q missing outcome labels", m.Slug)
		}
		tid := crypto.Keccak256Hash([]byte(m.Slug)).Hex()
		m.TemplateID = strings.ToLower(tid)
		if _, exists := c.byTemplateID[m.TemplateID]; exists {
			return fmt.Errorf("duplicate templateId for slug %q", m.Slug)
		}
		if _, exists := c.bySlug[m.Slug]; exists {
			return fmt.Errorf("duplicate slug %q", m.Slug)
		}
		c.byTemplateID[m.TemplateID] = m
		c.bySlug[m.Slug] = m
	}
	return nil
}

func (c *Catalog) LookupTemplateID(templateID string) (*Market, bool) {
	if c == nil {
		return nil, false
	}
	id := normalizeHex32(templateID)
	m, ok := c.byTemplateID[id]
	return m, ok
}

func (c *Catalog) LookupSlug(slug string) (*Market, bool) {
	if c == nil {
		return nil, false
	}
	m, ok := c.bySlug[strings.TrimSpace(slug)]
	return m, ok
}

func (c *Catalog) LookupTemplateBytes(templateID []byte) (*Market, bool) {
	if len(templateID) != 32 {
		return nil, false
	}
	return c.LookupTemplateID(common.BytesToHash(templateID).Hex())
}

func (m *Market) Decorate(dst map[string]any) {
	if m == nil || dst == nil {
		return
	}
	dst["title"] = m.Title
	dst["subtitle"] = m.Subtitle
	dst["resolutionRule"] = m.ResolutionRule
	dst["feedLabel"] = m.FeedLabel
	dst["vertical"] = m.Vertical
	dst["displayOrder"] = m.DisplayOrder
	dst["outcomeLabels"] = append([]string(nil), m.OutcomeLabels...)
	dst["primaryFeedId"] = strings.ToLower(m.Feed.Address)
}

func (m *Market) LabelForOutcomeIndex(index int) string {
	if m == nil || index < 0 || index >= len(m.OutcomeLabels) {
		return ""
	}
	return m.OutcomeLabels[index]
}

func DecorateOutcomeRows(meta *Market, rows []map[string]any) []map[string]any {
	if meta == nil || len(rows) == 0 {
		return rows
	}
	for _, row := range rows {
		if row == nil {
			continue
		}
		index, ok := outcomeIndexFromAny(row["outcomeIndex"])
		if !ok {
			continue
		}
		if label := meta.LabelForOutcomeIndex(index); label != "" {
			row["label"] = label
		}
	}
	return rows
}

func normalizeHex32(raw string) string {
	s := strings.TrimSpace(strings.ToLower(raw))
	if s == "" {
		return s
	}
	if !strings.HasPrefix(s, "0x") {
		s = "0x" + s
	}
	return s
}

func outcomeIndexFromAny(v any) (int, bool) {
	switch t := v.(type) {
	case int:
		return t, true
	case int32:
		return int(t), true
	case int64:
		return int(t), true
	case float64:
		return int(t), true
	case string:
		n, err := strconv.Atoi(strings.TrimSpace(t))
		if err != nil {
			return 0, false
		}
		return n, true
	default:
		return 0, false
	}
}
