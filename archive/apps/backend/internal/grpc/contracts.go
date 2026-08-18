package grpc

// Package grpc keeps internal service boundaries for future gRPC transport.
// Transport binding should remain private/internal-only.

type EventEnvelope struct {
	Seq         uint64
	Type        string
	Channel     string
	Scope       string
	TemplateID  string
	EpochID     uint64
	UserAddress string
	BlockNumber uint64
	TxHash      string
	CreatedAt   string
	PayloadJSON []byte
}
