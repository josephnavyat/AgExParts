# AgEx Parts — React (Vite) Landing Page

This project includes the **full styling** from your HTML mockup (darker hero overlay, bright hero text, larger logo with drop shadow).

## Setup
1. Unzip and open in VS Code.
2. Run:
   npm install
   npm run dev
3. Open the URL shown by Vite (usually http://localhost:5173).

## Assets
- Replace `public/hero-16x9.png` with your tractor hero image (16:9 recommended).
- Replace `public/logo.png` with your AgEx logo.

## Where the styling lives
- `src/styles/site.css` — full CSS (nav, hero, cards, features, footer).

## Stripe automatic tax in test mode

Stripe requires a valid origin address to enable automatic tax calculation in test mode. If you see errors mentioning "valid origin address" when creating a Checkout session, either:

- Add an origin address in the Stripe Dashboard (https://dashboard.stripe.com/test/settings/tax) under Tax settings.
- Or set the `DISABLE_STRIPE_AUTOMATIC_TAX` environment variable to `1` (or `true`) to force the app to create Checkout sessions without `automatic_tax` enabled during testing.

The Netlify function `netlify/functions/create-checkout-session.js` will automatically retry without automatic tax when it detects the test-mode origin address error.

## Environment variables for uploads and auth

The tax exemption upload and profile endpoints require these environment variables when deployed:

- `DATABASE_URL` - Postgres connection string used by Netlify functions.
- `JWT_SECRET` - Secret used to sign and verify JWTs.
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` - AWS credentials for S3 access.
- `AWS_S3_BUCKET` - S3 bucket name where tax exemption documents will be stored.

### CAPTCHA (Cloudflare Turnstile)

If you enable Turnstile on checkout, set these env vars in Netlify (or your local env):

- `TURNSTILE_SECRET` - Your Turnstile secret key (server-side verification).
- `TURNSTILE_SITE_KEY` - Your Turnstile site key (used in client-side code).

Example (local):

```bash
export TURNSTILE_SECRET="<your-secret>"
export TURNSTILE_SITE_KEY="<your-site-key>"
```

Note: For security don't hardcode the secret in source — use Netlify environment settings or a secrets manager.

Set these in your Netlify site settings (or local env) before using the upload/profile endpoints.

## Admin endpoints and notifications

New serverless endpoints for admins:

- `/.netlify/functions/admin-list-tax-uploads` (GET) — returns pending uploads. Requires admin JWT.
- `/.netlify/functions/admin-approve-tax-exempt` (POST) — approve or deny an upload; approving sets `tax_exempt_status=true` and `tax_exempt_exp_date` on the user and sends notification. Requires admin JWT.

Mailgun and admin notification env vars:

- `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM` — used to send emails.
- `TAX_ADMIN_EMAILS` — comma-separated admin emails to notify when a new tax upload arrives.

