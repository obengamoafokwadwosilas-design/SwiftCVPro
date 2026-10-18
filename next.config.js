/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core']
  },
  async rewrites() {
    return {
      // beforeFiles so this wins over any app/page.tsx at "/" — the landing
      // page is a static file, and a rewrite (unlike redirect()) keeps the
      // address bar at the bare domain instead of showing /landing.html.
      beforeFiles: [{ source: '/', destination: '/landing.html' }],
    }
  },
  async headers() {
    return [
      {
        // Vercel serves public/ with max-age=0, so a returning visitor re-asks
        // the server about every image, and from Ghana each round trip to the
        // nearest edge (Cape Town) costs 0.5s+. One day fresh, then served
        // from cache while it re-checks in the background. Not `immutable`:
        // these filenames are not content-hashed, so a replaced image must
        // still reach visitors — give a changed image a new filename to show it
        // immediately. HTML is untouched, so page updates are seen at once.
        source: '/:all*(png|jpg|jpeg|webp|svg|ico|mp4)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ]
  },
}

module.exports = nextConfig
