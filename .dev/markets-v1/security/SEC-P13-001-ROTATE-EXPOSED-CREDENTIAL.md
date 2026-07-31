# SEC-P13-001 — ROTATE_OR_REVOKE_EXPOSED_POLYMARKET_CREDENTIAL

**Priority:** P0 — Owner action required  
**Status:** ROTATION_PENDING_OWNER  
**Phase:** 1.3  
**Created:** 2026-07-31

## Summary

PR #8 merged while a previously exposed Polymarket credential remained marked `ROTATION_PENDING_OWNER`. Phase 1.3 development may continue locally, but **production deployment and final release approval are blocked** until rotation or revocation is confirmed by the credential owner.

## Required owner actions

1. Rotate or revoke the exposed Polymarket API credential in the Polymarket developer console.
2. Update production secret stores (not in repository) with the new credential if still needed for future authenticated phases.
3. Confirm rotation completion to the engineering lead.
4. Update this document status to `ROTATION_CONFIRMED` with date and owner initials.

## Constraints

- Do not print, recover, test, or reuse the old credential.
- Do not rewrite Git history.
- Do not place API keys, signing material, or Polymarket credentials in `apps/fe-v1`.
- The public Polymarket Market Channel does not require a private user-channel credential.

## Release gate

| Gate | Blocked until rotation confirmed |
|------|----------------------------------|
| Production deployment | Yes |
| Final Phase 1.3 release approval | Yes |
| Local development / draft PR review | No |
| CI / test execution | No |
