package ethops

import (
	"context"
	"crypto/ecdsa"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"

	"retropick/apps/backend/internal/abis"
)

// FaucetRelayer submits TokenFaucet.requestWithSig using a funded hot key.
type FaucetRelayer struct {
	rpcURL      string
	client      *ethclient.Client
	key         *ecdsa.PrivateKey
	relayerAddr common.Address
	chainID     *big.Int
	mu          sync.Mutex
}

// NewFaucetRelayer parses a hex-encoded secp256k1 private key (with or without 0x).
func NewFaucetRelayer(rpcURL string, privateKeyHex string, chainID int64) (*FaucetRelayer, error) {
	keyHex := strings.TrimPrefix(strings.TrimSpace(privateKeyHex), "0x")
	if len(keyHex) != 64 {
		return nil, fmt.Errorf("FAUCET_RELAYER_PRIVATE_KEY must be 32-byte hex")
	}
	key, err := crypto.HexToECDSA(keyHex)
	if err != nil {
		return nil, fmt.Errorf("FAUCET_RELAYER_PRIVATE_KEY: %w", err)
	}
	if rpcURL == "" {
		return nil, fmt.Errorf("rpc url required")
	}
	return &FaucetRelayer{
		rpcURL:      rpcURL,
		key:         key,
		relayerAddr: crypto.PubkeyToAddress(key.PublicKey),
		chainID:     big.NewInt(chainID),
	}, nil
}

func (r *FaucetRelayer) Close() {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.client != nil {
		r.client.Close()
		r.client = nil
	}
}

func (r *FaucetRelayer) RelayerAddress() common.Address { return r.relayerAddr }

func (r *FaucetRelayer) ensureClient(ctx context.Context) (*ethclient.Client, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.client != nil {
		return r.client, nil
	}
	cl, err := ethclient.DialContext(ctx, r.rpcURL)
	if err != nil {
		return nil, err
	}
	r.client = cl
	return r.client, nil
}

// RelayRequestWithSig verifies the EIP-712 MintRequest and sends requestWithSig.
// amount must equal the on-chain maxMintAmount; deadline is validated against wall clock.
func (r *FaucetRelayer) RelayRequestWithSig(
	ctx context.Context,
	faucet common.Address,
	recipient common.Address,
	amount *big.Int,
	deadline uint64,
	signature []byte,
	deadlineMaxSkew time.Duration,
) (common.Hash, error) {
	if recipient == (common.Address{}) {
		return common.Hash{}, errors.New("zero recipient")
	}
	if amount == nil || amount.Sign() <= 0 {
		return common.Hash{}, errors.New("invalid amount")
	}
	now := time.Now().Unix()
	if int64(deadline) < now {
		return common.Hash{}, fmt.Errorf("deadline expired")
	}
	if int64(deadline) > now+int64(deadlineMaxSkew.Seconds()) {
		return common.Hash{}, fmt.Errorf("deadline too far in future")
	}

	cl, err := r.ensureClient(ctx)
	if err != nil {
		return common.Hash{}, err
	}

	fa, err := abi.JSON(strings.NewReader(string(abis.TokenFaucetJSON)))
	if err != nil {
		return common.Hash{}, err
	}

	// On-chain max mint must match signed amount policy.
	cfgData, err := fa.Pack("config")
	if err != nil {
		return common.Hash{}, err
	}
	rawCfg, err := callContract(ctx, cl, faucet, cfgData)
	if err != nil {
		return common.Hash{}, fmt.Errorf("read config: %w", err)
	}
	u, err := fa.Unpack("config", rawCfg)
	if err != nil || len(u) < 2 {
		return common.Hash{}, errors.New("unpack config")
	}
	maxAmt, ok := u[1].(*big.Int)
	if !ok {
		return common.Hash{}, errors.New("maxMintAmount type")
	}
	if amount.Cmp(maxAmt) != 0 {
		return common.Hash{}, fmt.Errorf("amount must equal maxMintAmount %s", maxAmt.String())
	}

	// Current per-recipient nonce for EIP-712.
	nonceData, err := fa.Pack("nonces", recipient)
	if err != nil {
		return common.Hash{}, err
	}
	rawNonce, err := callContract(ctx, cl, faucet, nonceData)
	if err != nil {
		return common.Hash{}, fmt.Errorf("read nonces: %w", err)
	}
	nu, err := fa.Unpack("nonces", rawNonce)
	if err != nil || len(nu) < 1 {
		return common.Hash{}, errors.New("unpack nonces")
	}
	chainNonce, ok := nu[0].(*big.Int)
	if !ok {
		return common.Hash{}, errors.New("nonce type")
	}

	digest := faucetMintDigest(faucet, r.chainID, recipient, amount, chainNonce, deadline)
	if !verifyEOASignature(recipient, digest.Bytes(), signature) {
		return common.Hash{}, errors.New("invalid signature")
	}

	callData, err := fa.Pack("requestWithSig", recipient, amount, deadline, signature)
	if err != nil {
		return common.Hash{}, err
	}

	msg := ethereum.CallMsg{From: r.relayerAddr, To: &faucet, Data: callData}
	if _, err := cl.CallContract(ctx, msg, nil); err != nil {
		return common.Hash{}, fmt.Errorf("simulation failed: %w", err)
	}

	gasLimit, err := cl.EstimateGas(ctx, msg)
	if err != nil {
		return common.Hash{}, fmt.Errorf("estimate gas: %w", err)
	}

	pendingNonce, err := cl.PendingNonceAt(ctx, r.relayerAddr)
	if err != nil {
		return common.Hash{}, err
	}
	gasPrice, err := cl.SuggestGasPrice(ctx)
	if err != nil {
		return common.Hash{}, err
	}

	tx := types.NewTx(&types.LegacyTx{
		Nonce:    pendingNonce,
		To:       &faucet,
		Value:    big.NewInt(0),
		Gas:      gasLimit * 12 / 10,
		GasPrice: gasPrice,
		Data:     callData,
	})
	signed, err := types.SignTx(tx, types.NewEIP155Signer(r.chainID), r.key)
	if err != nil {
		return common.Hash{}, err
	}
	if err := cl.SendTransaction(ctx, signed); err != nil {
		return common.Hash{}, err
	}
	return signed.Hash(), nil
}

func callContract(ctx context.Context, cl *ethclient.Client, to common.Address, data []byte) ([]byte, error) {
	msg := ethereum.CallMsg{To: &to, Data: data}
	return cl.CallContract(ctx, msg, nil)
}

func domainSeparatorTokenFaucet(faucet common.Address, chainID *big.Int) []byte {
	domainTypeHash := crypto.Keccak256([]byte("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"))
	nameHash := crypto.Keccak256([]byte("TokenFaucet"))
	versionHash := crypto.Keccak256([]byte("1"))
	var buf []byte
	buf = append(buf, domainTypeHash...)
	buf = append(buf, nameHash...)
	buf = append(buf, versionHash...)
	buf = append(buf, common.LeftPadBytes(chainID.Bytes(), 32)...)
	buf = append(buf, common.LeftPadBytes(faucet.Bytes(), 32)...)
	return crypto.Keccak256(buf)
}

func faucetMintDigest(faucet common.Address, chainID *big.Int, recipient common.Address, amount, nonce *big.Int, deadline uint64) common.Hash {
	domainSep := domainSeparatorTokenFaucet(faucet, chainID)
	typeHash := crypto.Keccak256([]byte("MintRequest(address recipient,uint256 amount,uint256 nonce,uint64 deadline)"))
	var structBuf []byte
	structBuf = append(structBuf, typeHash...)
	structBuf = append(structBuf, common.LeftPadBytes(recipient.Bytes(), 32)...)
	structBuf = append(structBuf, common.LeftPadBytes(amount.Bytes(), 32)...)
	structBuf = append(structBuf, common.LeftPadBytes(nonce.Bytes(), 32)...)
	dl := new(big.Int).SetUint64(deadline)
	structBuf = append(structBuf, common.LeftPadBytes(dl.Bytes(), 32)...)
	structHash := crypto.Keccak256(structBuf)

	var full []byte
	full = append(full, 0x19, 0x01)
	full = append(full, domainSep...)
	full = append(full, structHash...)
	return crypto.Keccak256Hash(full)
}

func verifyEOASignature(signer common.Address, digest []byte, sig []byte) bool {
	if len(sig) != 65 {
		return false
	}
	sigCopy := make([]byte, len(sig))
	copy(sigCopy, sig)
	if sigCopy[64] == 27 || sigCopy[64] == 28 {
		sigCopy[64] -= 27
	}
	pub, err := crypto.Ecrecover(digest, sigCopy)
	if err != nil {
		return false
	}
	if len(pub) == 0 {
		return false
	}
	ecdsaPub, err := crypto.UnmarshalPubkey(pub)
	if err != nil {
		return false
	}
	return crypto.PubkeyToAddress(*ecdsaPub) == signer
}
