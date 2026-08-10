// Package reconcile repairs unknown and cancel_pending order projections against
// Polymarket CLOB venue truth. Submit timeouts must never trigger auto-resubmit;
// the worker polls GET /data/orders and GET /data/trades only.
package reconcile
