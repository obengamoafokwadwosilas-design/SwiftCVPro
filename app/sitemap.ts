import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { GUIDES, GUIDES_UPDATED, guidePublished } from '@/content/guides'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/build`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/refund-policy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/support`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/guides`, lastModified: GUIDES_UPDATED, changeFrequency: 'monthly', priority: 0.7 },
    ...GUIDES.map(g => ({ url: `${SITE_URL}/guides/${g.slug}`, lastModified: guidePublished(g), changeFrequency: 'monthly' as const, priority: 0.7 })),
  ]
}
