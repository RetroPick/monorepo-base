# ADR-003: Wallet and Signing Model

**Status:** accepted
**Date:** 2026-07-24
**Last reviewed:** 2026-07-25
**Deciders:** platform-orchestrator, security, markets-engineering
**Wave:** 1

## Description

This ADR records the accepted non-custodial, user-signed model for Markets V1: RetroPick never stores, transmits, or uses user private keys or seeds; every asset-moving action needs an explicit wallet signature; the BFF prepares unsigned payloads; preview digest must match submit; session tokens are API auth only. Builder/relayer keys may sign infrastructure relay—not user order intent without user signature.

It sits with ADR-009 (no auto copy) as the custody/signing invariant for deposits, proxy wallets, orders, and redemptions. The binding flow is preview → human-readable preview → wallet approve → signed payload + contentHash → BFF submits to Polymarket. JWT alone never authorizes on-chain movement.

Read this for any deposit, order, redemption, or proposal for session keys, server-side trading, or skipping preview. It does not invent a new custodial model; conflicts require formal ADR change—not “one-click” silent BFF submit or batch-signing many copied orders under one approval in V1.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before **Context / Decision / Consequences** below.

**5W+1H → ADR mapping:** Context = custody/regulatory threats; Decision = non-custodial preview-before-sign; Consequences = UX friction, no silent server signing, session ≠ chain authority.

**Do not invent decisions.** If a product request conflicts with Decision, refuse or open an ADR change process—do not “interpret around” accepted text.

| Lens | Answer |
|------|--------|
| **Who** | Deciders: platform-orchestrator, security, markets-engineering. Audience: web/Android wallet integrators; BFF preview/submit authors; agents designing one-click or delegated trading. |
| **What** | **Decision:** Non-custodial, user-signed model. RetroPick never stores/transmits/uses user private keys or seeds. Every asset-moving action needs an explicit wallet signature. BFF prepares unsigned payloads; preview digest must match submit; session tokens are API auth only. Builder/relayer keys may sign infrastructure relay—not user order intent without user signature. |
| **When** | Any deposit, proxy-wallet, order, or redemption; any proposal for session keys, server-side trading, or skipping preview. Reinforced by [ADR-009](ADR-009-NO-AUTO-COPY-TRADING-V1.md). |
| **Where** | Client wallets (extension, WalletConnect, Android SDK); BFF preview/submit APIs; `security/SIGNING_AND_TRANSACTION_INTEGRITY.md`; shared web+Android contract ([ADR-004](ADR-004-SHARED-WEB-ANDROID-API.md)). |
| **Why** | Context: key custody is a SEV1 target; custodial models expand legal burden; Polymarket CLOB expects client-signed orders; RetroPick must not move user funds unilaterally. |
| **How** | `POST` preview → human-readable preview → user approves in wallet → `POST` signed payload + contentHash → BFF submits to Polymarket. Verify hash, chain ID, allowlisted contracts on client and server. |

### Worked example

**What a developer must do differently because of this ADR**

Product asks: “After a whale alert, the server places a matching order.”

1. Refuse silent BFF submit and refuse 24h session-key trading while backgrounded.
2. Deep-link to a pre-filled ticket; user must still preview and sign.
3. JWT alone never authorizes on-chain movement.
4. Align notification actions with [ADR-009](ADR-009-NO-AUTO-COPY-TRADING-V1.md) (`VIEW_MARKET` only).

**Failure / Never-V1 (still bound by Decision)**

- Persisting seeds/private keys in Postgres or misusing Keystore as a hot trading wallet.
- Batch-signing many copied orders under one approval in V1.
- Treating builder/relayer keys as user trading keys.
- Skipping preview because “mobile friction.”

**Agent checklist**

- [ ] Preview before every asset-moving submit?
- [ ] contentHash verified end-to-end?
- [ ] No raw key material server-side?
- [ ] Session token not used as signing authority?
- [ ] Chain ID / contract allowlists enforced?

**ADR section map**

| Lens | Read in this ADR |
|------|------------------|
| Who / Why | Context, Forces, Deciders metadata |
| What / How | Decision (+ Implementation Notes if present) |
| When / Where | Status/Date, Links, repo/API constraints |
| Day-2 behavior | Consequences, Review Checklist |


## Context

RetroPick Markets involves on-chain asset movements: USDC deposits, proxy wallet deployment, outcome token trades, and redemptions on Polygon. Signing authority must be assigned clearly to meet:

- **User trust** — users expect self-custody or explicit wallet provider custody
- **Regulatory** — custodial models trigger money transmitter / broker-dealer analysis
- **Security** — server-side key storage is high-value attack target
- **Incident response** — no RetroPick ability to move user funds without user action

Historical epoch v1 used various signing patterns. Markets V1 starts greenfield with Polymarket's proxy wallet and CLOB signed order model.

### Threats if RetroPick custodies keys

- Database breach → total user fund loss
- Insider threat → unauthorized trading
- Legal obligation → safeguarding requirements, audits, insurance
- User perception → "not your keys" violation

## Decision

Adopt a **non-custodial, user-signed model** for Markets V1:

1. **RetroPick never stores, transmits, or uses user private keys or seed phrases.**
2. **Every asset-moving action** requires explicit user signature in their wallet (browser extension, WalletConnect, or Android wallet SDK).
3. **BFF prepares unsigned payloads** (order templates, transaction calldata); clients present **preview** then request signature.
4. **Backend never silent-signs orders** on behalf of users. Builder/relayer API keys sign **infrastructure transactions** only (e.g., meta-transaction relay), not user order intent without user signature.
5. **Preview-before-sign is mandatory** — preview digest must match signed payload ([security/SIGNING_AND_TRANSACTION_INTEGRITY.md](../../security/SIGNING_AND_TRANSACTION_INTEGRITY.md)).
6. **Session tokens** authenticate API access; they do not confer on-chain signing authority.

### Signing flows

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant B as BFF
    participant W as Wallet
    participant P as Polymarket

    Note over U,P: Order placement
    C->>B: POST /orders/preview
    B-->>C: PreviewResponse + contentHash
    C->>U: Show human-readable preview
    U->>W: Approve
    W-->>C: Signature
    C->>B: POST /orders { signed, contentHash }
    B->>P: Submit signed order
```

## Consequences

### Positive

- **Reduced custody risk** — no hot wallet of user keys
- **Clear liability boundary** — user confirms each action
- **Simpler compliance path** — interface vs custodian (legal review still required)
- **Aligns with Polymarket model** — CLOB expects client-signed orders
- **Consistent web + Android** — same preview/submit API ([ADR-004](ADR-004-SHARED-WEB-ANDROID-API.md))

### Negative

- **UX friction** — every action needs wallet prompt
- **Mobile complexity** — WalletConnect sessions, app switching
- **No "one-click" trading** — intentional for V1
- **Recovery** — RetroPick cannot recover lost user keys

### Security controls required

- CSP and XSS prevention on web
- Android Keystore for session tokens only
- Calldata hash verification client-side and server-side
- Chain ID and contract address allowlists in preview builder

## Alternatives Considered

### Alternative A: Full custodial wallets

RetroPick generates and stores keys; users deposit to RetroPick-controlled addresses.

| Issue | Verdict |
|-------|---------|
| Regulatory | High burden |
| Security | High target |
| **Outcome** | **Rejected** |

### Alternative B: MPC custodial (Turnkey, Fireblocks)

Third-party MPC holds key shares; RetroPick orchestrates.

| Issue | Verdict |
|-------|---------|
| Cost | Significant |
| Vendor lock-in | Yes |
| V1 timeline | Too slow |
| **Outcome** | **Deferred** post-V1 evaluation |

### Alternative C: Session-key scoped delegation

User signs a session key with limited permissions.

| Issue | Verdict |
|-------|---------|
| Complexity | Smart contract or CLOB support needed |
| Revocation | UX challenge |
| **Outcome** | **Rejected** for V1 |

### Alternative D: User-signed preview model (chosen)

| Issue | Verdict |
|-------|---------|
| UX friction | Acceptable with good preview |
| **Outcome** | **Accepted** |

## Implementation Notes

### OpenAPI operations

Separate endpoints:
- `POST /markets/orders/preview` — no signature required
- `POST /markets/orders` — requires signature + `contentHash`
- `POST /markets/transactions/preview` — funding/redemption
- `POST /markets/transactions/submit` — signed tx broadcast via relayer

### Web wallet integration

- Browser extension (MetaMask, Rabby) via wagmi/viem
- WalletConnect for mobile browser
- SIWE for address linking to account

### Android wallet integration

- WalletConnect v2 primary
- In-app browser fallback for unsupported wallets
- Biometric gate before opening wallet app

See [android/WALLET_SIGNING_AND_SECURITY.md](../../android/WALLET_SIGNING_AND_SECURITY.md).

### Server credentials (not user keys)

| Credential | Purpose | Storage |
|------------|---------|---------|
| `BUILDER_API_KEY` | Polymarket builder program | Secret manager |
| `SESSION_SECRET` | HTTP session signing | Secret manager |
| Relayer auth | Infrastructure relay | Secret manager |

## Links

- [SYSTEM_CONTEXT_AND_TRUST_BOUNDARIES.md](../SYSTEM_CONTEXT_AND_TRUST_BOUNDARIES.md)
- [security/THREAT_MODEL.md](../../security/THREAT_MODEL.md)
- [security/SIGNING_AND_TRANSACTION_INTEGRITY.md](../../security/SIGNING_AND_TRANSACTION_INTEGRITY.md)
- [polymarket/AUTHENTICATION_AND_ACCOUNT_WALLETS.md](../../polymarket/AUTHENTICATION_AND_ACCOUNT_WALLETS.md)
- [web/WALLET_AND_TRANSACTION_UX.md](../../web/WALLET_AND_TRANSACTION_UX.md)

## Review Checklist

- [x] No `privateKey` in client or server env examples
- [x] Preview hash in OpenAPI schema
- [x] Pen-test scope includes signing integrity
- [x] ADR-009 auto-trading prohibited
