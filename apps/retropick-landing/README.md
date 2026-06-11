# RetroPick Landing Waitlist

Next.js App Router landing page with a Supabase-first waitlist flow for RetroPick and Namecheap Private Email SMTP notifications.

## What Changed

- Canonical waitlist storage is `public.retropick_waitlist`
- Waitlist email notifications now use Namecheap Private Email SMTP via `nodemailer`
- SMTP is notification-only; Supabase insert remains the main success path
- Emergency email-only capture exists only when explicitly enabled with `WAITLIST_ALLOW_EMAIL_ONLY_FALLBACK=true`

## Environment

Create `.env.local` from `.env.example`.

```env
NEXT_PUBLIC_SUPABASE_URL=https://telxousjouyrlctwxhgo.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_R6q3YcQNwAqpWyNr0yQoiQ__7lyoO33
WAITLIST_STORAGE_MODE=retropick_waitlist
WAITLIST_IP_HASH_SALT=replace-with-a-random-string
WAITLIST_ALLOW_EMAIL_ONLY_FALLBACK=false
SMTP_HOST=mail.privateemail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=rudeus33@retropick.xyz
SMTP_PASS=replace-with-your-private-email-mailbox-password
WAITLIST_FROM_EMAIL=RetroPick <rudeus33@retropick.xyz>
WAITLIST_NOTIFY_EMAIL=rudeus33@retropick.xyz
WAITLIST_REPLY_TO_EMAIL=rudeus33@retropick.xyz
WAITLIST_SEND_CONFIRMATION=false
```

Notes:

- `SMTP_PASS` is the mailbox password for `rudeus33@retropick.xyz`, not the Namecheap account password.
- The mailbox password should be rotated if it was pasted into chat or any shared channel.
- Do not expose `SMTP_PASS` or any SMTP variables to the client.
- This waitlist flow does not require `SUPABASE_SERVICE_ROLE_KEY`.

## Database Setup

Apply the SQL migration first in Supabase Dashboard → SQL Editor:

- `supabase/migrations/20260610234500_create_retropick_waitlist.sql`

The migration:

- Creates `public.retropick_waitlist`
- Uses generated `email_normalized` for case-insensitive uniqueness
- Creates a unique `referral_code` index
- Enables RLS
- Allows anonymous insert only
- Ends with `notify pgrst, 'reload schema';`

Do not rely on `public."RetroPick waitlist"` as the real waitlist table.

## Local Run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Verification

Local verification:

```bash
npm test && npm run build
```

Supabase SQL verification:

```sql
select * from public.retropick_waitlist order by created_at desc limit 10;
```

REST insert test:

```bash
curl -i 'https://telxousjouyrlctwxhgo.supabase.co/rest/v1/retropick_waitlist' \
  -H "apikey: sb_publishable_R6q3YcQNwAqpWyNr0yQoiQ__7lyoO33" \
  -H "Authorization: Bearer sb_publishable_R6q3YcQNwAqpWyNr0yQoiQ__7lyoO33" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "email": "test-waitlist@retropick.xyz",
    "name": "RetroPick Test",
    "role": "builder",
    "primary_use_case": "prediction_markets",
    "source": "manual_test"
  }'
```

Duplicate test:

```bash
curl -i 'https://telxousjouyrlctwxhgo.supabase.co/rest/v1/retropick_waitlist' \
  -H "apikey: sb_publishable_R6q3YcQNwAqpWyNr0yQoiQ__7lyoO33" \
  -H "Authorization: Bearer sb_publishable_R6q3YcQNwAqpWyNr0yQoiQ__7lyoO33" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-waitlist@retropick.xyz",
    "name": "Duplicate Test"
  }'
```

RLS read-protection test:

```bash
curl -i 'https://telxousjouyrlctwxhgo.supabase.co/rest/v1/retropick_waitlist?select=*' \
  -H "apikey: sb_publishable_R6q3YcQNwAqpWyNr0yQoiQ__7lyoO33" \
  -H "Authorization: Bearer sb_publishable_R6q3YcQNwAqpWyNr0yQoiQ__7lyoO33"
```

Expected:

- Fresh insert succeeds
- Duplicate insert fails with unique constraint
- Public `select=*` is denied

## Waitlist Behavior

Flow:

1. User submits the form.
2. Server validates and normalizes the payload.
3. Server inserts into `public.retropick_waitlist`.
4. Server attempts SMTP notification to `rudeus33@retropick.xyz`.
5. If SMTP fails, the user still gets success if the database insert succeeded.

If `WAITLIST_SEND_CONFIRMATION=true`, the app also attempts a user confirmation email after the internal notification.

If `WAITLIST_ALLOW_EMAIL_ONLY_FALLBACK=true`, schema/storage failures may degrade to SMTP-only capture. Leave this `false` by default.

## Vercel Environment Variables

Add these in Vercel Project → Settings → Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `WAITLIST_STORAGE_MODE=retropick_waitlist`
- `WAITLIST_IP_HASH_SALT`
- `WAITLIST_ALLOW_EMAIL_ONLY_FALLBACK=false`
- `SMTP_HOST=mail.privateemail.com`
- `SMTP_PORT=465`
- `SMTP_SECURE=true`
- `SMTP_USER=rudeus33@retropick.xyz`
- `SMTP_PASS=<mailbox password>`
- `WAITLIST_FROM_EMAIL=RetroPick <rudeus33@retropick.xyz>`
- `WAITLIST_NOTIFY_EMAIL=rudeus33@retropick.xyz`
- `WAITLIST_REPLY_TO_EMAIL=rudeus33@retropick.xyz`
- `WAITLIST_SEND_CONFIRMATION=false`
