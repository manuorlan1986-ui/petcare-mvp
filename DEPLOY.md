# Deploy PetCare MVP: Supabase + Netlify + Stripe Connect

## 1. Supabase
1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Authentication > Providers: enable Email/password. For a first demo, you can disable email confirmation; turn it back on before production.
4. Copy the Project URL and Publishable Key into Netlify as:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. Create your first user through the app. If you want admin access, run:
   `update public.profiles set role='admin' where id='YOUR_USER_UUID';`

## 2. Supabase Edge Functions
Deploy these functions:
- `create-connect-account`
- `create-account-link`
- `create-checkout-session`
- `admin-settings`
- `stripe-webhook`

Set function secrets (server-side only):
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL` (your Netlify URL)

Do not put any of these secrets in Vite environment variables.

## 3. Stripe Connect
1. Enable Stripe Connect for the platform.
2. The MVP creates Express connected accounts for caregivers.
3. The caregiver dashboard uses the secure Edge Functions to create the account and onboarding link.
4. The checkout function creates a destination charge with an `application_fee_amount` and routes the transfer to the caregiver's connected account.
5. Configure the Stripe webhook endpoint to the deployed `stripe-webhook` function and subscribe to the payment events used by the MVP.

## 4. Netlify
Push this folder to GitHub or upload the repository to Netlify.
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 20+
- Environment variables: the two `VITE_...` values above.

`netlify.toml` already contains the SPA redirect.

## 5. First demo flow
- Home -> Search -> caregiver profile -> Request booking.
- Create a Pet parent account.
- Create a Caregiver account.
- Complete caregiver profile and Stripe onboarding.
- Approve caregiver in admin workflow before making the profile public.
- Book and proceed to Stripe Checkout.
- Adjust platform commission in Admin > Marketplace settings.

## Security model
- Browser: Supabase publishable key only.
- Database: RLS policies.
- Payment secrets: Edge Functions only.
- Marketplace fee: calculated by a database trigger from platform settings, not trusted from the browser.
- Payment events: recorded by a verified Stripe webhook.
