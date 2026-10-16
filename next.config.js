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
}

module.exports = nextConfig
