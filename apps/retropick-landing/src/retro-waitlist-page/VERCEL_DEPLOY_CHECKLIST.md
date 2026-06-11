# Vercel Deployment Checklist

## 1) Environment Variables

Set these in Vercel for **Production**, **Preview**, and **Development**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (use your verified domain sender)

Reference template: `.env.example`.

## 2) Supabase Security Baseline

Apply the SQL in `scripts/init-waitlist.sql` to your production database.

Expected security posture:

- `waitlist_signups` allows public inserts only.
- public/anon read access to waitlist emails is not granted.

## 3) Resend Setup

- Verify your sending domain in Resend.
- Set `RESEND_FROM_EMAIL` to that domain address (for example `noreply@your-domain.com`).

## 4) CI and Branch Protection

- Ensure GitHub Actions `CI` workflow passes:
  - lint
  - typecheck
  - unit/API tests
  - production build
  - e2e smoke test
- Require passing checks before merging to `main`.

## 5) Pre-Release Verification

Run locally before shipping:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
npm run build
```

## 6) Post-Deploy Smoke Test

- Open the deployed site.
- Submit a new waitlist email.
- Confirm:
  - API returns success.
  - row appears in Supabase `waitlist_signups`.
  - confirmation email is delivered.
