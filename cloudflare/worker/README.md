Cloudflare Worker for serving images from R2 (agexpartsimages)

Overview
- The Worker proxies requests to an R2 bucket binding named `AGEX_IMAGES` and returns object bytes with proper CORS and cache headers.

Setup
1. Install Wrangler (npm i -g wrangler) and authenticate:
   wrangler login
2. Update `wrangler.toml` with your `account_id` and desired route (`images.agexparts.com/*`).
3. In the Cloudflare Dashboard > R2, ensure your bucket `agexpartsimages` exists.
4. In the Worker settings (via Dashboard or wrangler), add an R2 binding:
   - Variable name: AGEX_IMAGES
   - Bucket: agexpartsimages
5. Deploy the worker for testing (workers_dev):
   wrangler dev ./cloudflare/worker/index.js
   or publish:
   wrangler publish --env production

DNS
- Point `images.agexparts.com` CNAME to Workers if using a custom domain (see Cloudflare docs for binding a custom domain to Workers).

Usage
- With the worker deployed at https://images.agexparts.com, set `VITE_IMAGE_BASE_URL=https://images.agexparts.com` in your Netlify environment and rebuild.
- The frontend will request images like `https://images.agexparts.com/0511042335.png` which the Worker will fetch from the R2 bucket and return with CORS and cache headers.

DB normalization
- If `products.image` contains full URLs or different prefixes, normalize to the object key (e.g., `0511042335.png` or `gallery/0511042335.png`).
- Example SQL preview:
  SELECT id, image, regexp_replace(image, '^.*/', '') AS basename FROM products LIMIT 50;

Security
- If you want private images, replace public cache headers and implement signed URLs validated by the Worker.

Questions
- I can create a migration script to preview and update DB image keys, or implement an admin upload form that writes to R2 via your Netlify function. Which would you prefer next?
