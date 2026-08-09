package balances

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"retropick/apps/backend/internal/markets/wallet"
)

const defaultBalanceTimeout = 10 * time.Second

const maxBalanceResponseBytes = 1 << 20

// ClobBalanceClient reads collateral balance-allowance from the Polymarket CLOB.
type ClobBalanceClient struct {
	baseURL    string
	httpClient *http.Client
	now        func() time.Time
}

// NewClobBalanceClient builds a CLOB balance-allowance client.
func NewClobBalanceClient(baseURL string, timeout time.Duration) *ClobBalanceClient {
	baseURL = strings.TrimSpace(baseURL)
	if baseURL == "" {
		baseURL = "https://clob.polymarket.com"
	}
	if timeout <= 0 {
		timeout = defaultBalanceTimeout
	}
	return &ClobBalanceClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{
			Timeout: timeout,
		},
		now: time.Now,
	}
}

type balanceAllowanceResponse struct {
	Balance   string `json:"balance"`
	Allowance string `json:"allowance"`
}

// GetCollateralBalanceAllowance fetches pUSD collateral balance in wei base units.
func (c *ClobBalanceClient) GetCollateralBalanceAllowance(
	ctx context.Context,
	creds L2Credentials,
	signatureType int,
) (balanceWei string, observedAt time.Time, err error) {
	query := url.Values{}
	query.Set("asset_type", "COLLATERAL")
	query.Set("signature_type", strconv.Itoa(signatureType))

	u, err := url.Parse(c.baseURL + balanceAllowancePath)
	if err != nil {
		return "", time.Time{}, ErrUpstreamUnavailable
	}
	u.RawQuery = query.Encode()

	ts := strconv.FormatInt(c.now().UTC().Unix(), 10)
	headers, err := l2AuthHeaders(creds, ts, http.MethodGet, balanceAllowancePath, "")
	if err != nil {
		return "", time.Time{}, ErrUpstreamUnavailable
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return "", time.Time{}, ErrUpstreamUnavailable
	}
	req.Header.Set("Accept", "application/json")
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	res, err := c.httpClient.Do(req)
	if err != nil {
		return "", time.Time{}, ErrUpstreamUnavailable
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return "", time.Time{}, ErrUpstreamUnavailable
	}

	body, err := io.ReadAll(io.LimitReader(res.Body, maxBalanceResponseBytes+1))
	if err != nil {
		return "", time.Time{}, ErrUpstreamUnavailable
	}
	if len(body) > maxBalanceResponseBytes {
		return "", time.Time{}, ErrUpstreamUnavailable
	}

	var payload balanceAllowanceResponse
	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.UseNumber()
	if err := decoder.Decode(&payload); err != nil {
		return "", time.Time{}, ErrUpstreamUnavailable
	}
	if strings.TrimSpace(payload.Balance) == "" {
		return "", time.Time{}, ErrUpstreamUnavailable
	}
	if _, err := ParseBaseUnits(payload.Balance, CollateralCurrency, CollateralDecimals); err != nil {
		return "", time.Time{}, ErrUpstreamUnavailable
	}

	return payload.Balance, c.now().UTC(), nil
}

// signatureTypeForWallet maps RetroPick wallet types to CLOB signature_type values.
func signatureTypeForWallet(walletType wallet.WalletType) (int, error) {
	switch walletType {
	case wallet.WalletTypeEOA, "":
		return 0, nil
	case wallet.WalletTypePolyProxy:
		return 1, nil
	case wallet.WalletTypeGnosisSafe:
		return 2, nil
	case wallet.WalletTypeDepositWallet:
		return 3, nil
	default:
		return 0, fmt.Errorf("unknown wallet type %q", walletType)
	}
}
