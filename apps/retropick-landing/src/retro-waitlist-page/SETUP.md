# Waitlist Setup Guide

This guide will help you set up your production-grade waitlist with Supabase and Resend.

## Prerequisites

- Supabase project (already connected ✓)
- Resend account and API key

## Step 1: Set Up Database

1. **Go to your Supabase Dashboard**
   - Navigate to SQL Editor
   - Click "New Query"
   - Copy and paste the contents of `scripts/init-waitlist.sql`
   - Click "Run"

This creates:
- `waitlist_signups` table with email uniqueness constraint
- Indexes for optimal query performance
- Row Level Security policies
- Auto-updating timestamp triggers

## Step 2: Add Environment Variables

**Local:** copy `.env.example` to `.env` and fill in real values.

**Vercel:** Settings → Environment Variables (Production, Preview, and Development).

Required variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM_EMAIL=noreply@your-domain.com
```

### Resend API key

1. Go to https://resend.com/dashboard
2. Navigate to API Keys
3. Create a new API key with Email permissions
4. Copy the key into `RESEND_API_KEY`

### Sender address

Set `RESEND_FROM_EMAIL` to an address on a domain you verified in Resend (or use Resend’s test sender while developing; delivery rules still apply per Resend).

## Step 3: Email template

Waitlist confirmation is sent with **React Email** (`emails/WaitlistWelcome.tsx`) via Resend’s `react` field. No code change is needed for the sender beyond `RESEND_FROM_EMAIL`.

## Step 4: Test the Waitlist

1. Start your dev server: `pnpm dev`
2. Go to http://localhost:3000
3. Enter a test email and submit
4. Verify:
   - You receive a confirmation email
   - The email appears in Supabase (check the `waitlist_signups` table)
   - Duplicate emails are rejected

## Features Implemented

✅ **Email Validation** - Prevents invalid email formats
✅ **Duplicate Prevention** - Graceful handling of existing emails
✅ **Supabase Integration** - Secure database storage
✅ **Resend Emails** - Transactional confirmation emails
✅ **Error Handling** - Production-grade error responses
✅ **RLS Policies** - Row-level security for data protection
✅ **Timestamps** - Automatic created_at and updated_at fields

## Troubleshooting

### "Invalid email" error
- Check your email format
- Try another email address

### "Already on the waitlist" error
- This email has already been added
- Try a different email

### No confirmation email received
- Check RESEND_API_KEY is set correctly
- Verify your Resend account is active
- Check spam/junk folder

### Database connection error
- Verify NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
- Check Supabase project is active

## Production Deployment

When deploying to Vercel:

1. Add environment variables in Vercel dashboard
2. Run the SQL migration in your production Supabase instance
3. Update the email `from` address to your verified domain
4. Test the waitlist form before going live

## Next Steps

- Add a success page after signup
- Create an admin dashboard to view signups
- Implement email notifications for new signups
- Add waitlist position/tracking features
