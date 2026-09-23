# PetCare Marketplace MVP

A clean React/Vite marketplace prototype for a Rover-style pet-care platform, designed for Netlify + Supabase.

## Included
- Public landing page and service search
- Basic services: Dog Walking and Day Care
- Caregiver cards and profiles
- Caregiver registration flow
- Email/password Supabase Auth when configured
- Demo mode when Supabase env vars are not configured
- Booking request UI and booking records
- Caregiver dashboard
- Admin settings UI for platform commission
- Supabase/Postgres schema with Row Level Security
- Stripe Connect architecture via Supabase Edge Functions
- Secure payment split model: destination charge + application fee
- Stripe connected-account onboarding skeleton

## Run locally
1. Copy `.env.example` to `.env` and add your Supabase URL + publishable key, or leave it empty to use demo mode.
2. `npm install`
3. `npm run dev`

## Netlify
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Site configuration > Environment variables, then deploy.

## Supabase
Run `supabase/schema.sql` in the SQL Editor. Then deploy the Edge Functions in `supabase/functions` and set Stripe secrets there.

IMPORTANT: the browser must never receive a Stripe secret key or Supabase service-role/secret key. The frontend uses only the Supabase publishable key. Stripe secret operations belong in Edge Functions.

## Payments
The MVP models the marketplace split using Stripe Connect. The default flow is a destination charge where the customer pays the platform checkout, the connected caregiver account is the destination, and the platform fee is an `application_fee_amount`. Confirm the final Connect charge pattern, merchant-of-record, refund, dispute, tax and fee responsibilities with Stripe and qualified legal/accounting counsel before production.
