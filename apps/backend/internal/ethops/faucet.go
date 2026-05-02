package ethops

import (
	"context"
	"math/big"
	"reflect"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"

	"retropick/apps/backend/internal/abis"
)

// FaucetState holds on-chain read results for the Base Sepolia faucet + stake token.
type FaucetState struct {
	Source string `json:"source"` // "rpc"
	ChainID int64 `json:"chainId"`

	StakeToken  string `json:"stakeToken"`
	TokenFaucet string `json:"tokenFaucet"`

	CooldownSeconds   *uint64 `json:"cooldownSeconds,omitempty"`
	MaxMintAmount     string  `json:"maxMintAmount,omitempty"`
	LastMintAt        *uint64 `json:"lastMintAt,omitempty"`
	// Nonce is TokenFaucet.nonces(user) for EIP-712 MintRequest signing.
	Nonce             string  `json:"nonce,omitempty"`
	StakeTokenBalance string  `json:"stakeTokenBalance,omitempty"`
	StakeTokenDecimals *uint8 `json:"stakeTokenDecimals,omitempty"`
}

func applyFaucetConfig(out *FaucetState, values []interface{}) {
	if len(values) >= 2 {
		if cd, ok := values[0].(uint64); ok {
			out.CooldownSeconds = &cd
		}
		if m, ok := values[1].(*big.Int); ok {
			out.MaxMintAmount = m.String()
		}
		return
	}
	if len(values) != 1 {
		return
	}
	cfg := reflect.ValueOf(values[0])
	if cfg.Kind() == reflect.Pointer {
		cfg = cfg.Elem()
	}
	if cfg.Kind() != reflect.Struct {
		return
	}
	if f := cfg.FieldByName("CooldownSeconds"); f.IsValid() && f.CanUint() {
		cd := uint64(f.Uint())
		out.CooldownSeconds = &cd
	}
	if f := cfg.FieldByName("MaxMintAmount"); f.IsValid() && f.Kind() == reflect.Pointer && !f.IsNil() {
		if m, ok := f.Interface().(*big.Int); ok {
			out.MaxMintAmount = m.String()
		}
	}
}

// GetFaucetState reads TokenFaucet + stake token for a wallet (Base Sepolia testing).
func (c *Caller) GetFaucetState(ctx context.Context, chainID int64, faucet, stakeToken, user common.Address) (FaucetState, error) {
	out := FaucetState{
		Source:      "rpc",
		ChainID:     chainID,
		StakeToken:  stakeToken.Hex(),
		TokenFaucet: faucet.Hex(),
	}
	fa, err := abi.JSON(strings.NewReader(string(abis.TokenFaucetJSON)))
	if err != nil {
		return out, err
	}
	ea, err := abi.JSON(strings.NewReader(string(abis.MockERC20JSON)))
	if err != nil {
		return out, err
	}

	// config() -> cooldownSeconds, maxMintAmount
	if data, err := fa.Pack("config"); err == nil {
		if raw, _, err := c.callContract(ctx, faucet, data); err == nil {
			u, err := fa.Unpack("config", raw)
			if err == nil {
				applyFaucetConfig(&out, u)
			}
		}
	}

	// lastMintAt(user)
	if data, err := fa.Pack("lastMintAt", user); err == nil {
		if raw, _, err := c.callContract(ctx, faucet, data); err == nil {
			u, err := fa.Unpack("lastMintAt", raw)
			if err == nil && len(u) >= 1 {
				if t, ok := u[0].(uint64); ok {
					out.LastMintAt = &t
				}
			}
		}
	}

	// nonces(user) -> uint256
	if data, err := fa.Pack("nonces", user); err == nil {
		if raw, _, err := c.callContract(ctx, faucet, data); err == nil {
			u, err := fa.Unpack("nonces", raw)
			if err == nil && len(u) >= 1 {
				if n, ok := u[0].(*big.Int); ok {
					out.Nonce = n.String()
				}
			}
		}
	}

	// balanceOf(user)
	if data, err := ea.Pack("balanceOf", user); err == nil {
		if raw, _, err := c.callContract(ctx, stakeToken, data); err == nil {
			u, err := ea.Unpack("balanceOf", raw)
			if err == nil && len(u) >= 1 {
				if b, ok := u[0].(*big.Int); ok {
					out.StakeTokenBalance = b.String()
				}
			}
		}
	}

	// decimals()
	if data, err := ea.Pack("decimals"); err == nil {
		if raw, _, err := c.callContract(ctx, stakeToken, data); err == nil {
			u, err := ea.Unpack("decimals", raw)
			if err == nil && len(u) >= 1 {
				switch v := u[0].(type) {
				case uint8:
					out.StakeTokenDecimals = &v
				case *big.Int:
					d := uint8(v.Uint64())
					out.StakeTokenDecimals = &d
				}
			}
		}
	}

	return out, nil
}
