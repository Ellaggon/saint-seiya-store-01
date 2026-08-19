# Product media on Cloudflare R2

Apply `product-media-cors.json` to the production media bucket and replace the Vercel hostname with the production storefront domain before enabling direct uploads.

Use a custom domain configured in `R2_MEDIA_PUBLIC_URL`, disable `r2.dev` for production, and set a lifecycle policy that expires abandoned `products/` objects that are not referenced by the database only after a reconciliation job has identified them. Do not add a broad expiry rule to published product media.

The application signs `PUT` uploads for five minutes and restricts each object to an immutable key under `products/{productId}/{imageId}/`. The Cloudflare API credentials remain server-only.
