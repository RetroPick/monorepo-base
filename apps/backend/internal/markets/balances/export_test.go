package balances

import "time"

// SetNowForTest overrides the client's clock in unit tests.
func (c *ClobBalanceClient) SetNowForTest(fn func() time.Time) {
	c.now = fn
}
