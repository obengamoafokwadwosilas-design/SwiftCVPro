import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GUIDES, GUIDES_UPDATED, guideBySlug } from '@/content/guides'
import { SITE_URL } from '@/lib/site'
import GuideShell from '../GuideShell'

export const dynamicParams = false

export function generateStaticParams() {
  return GUIDES.map(g => ({ slug: g.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const g = guideBySlug(params.slug)
  if (!g) return {}
  const url = `${SITE_URL}/guides/${g.slug}`
  return {
    title: `${g.title} | Remarkable CV`,
    description: g.description,
    alternates: { canonical: url },
    openGraph: { type: 'article', url, title: g.title, description: g.description, siteName: 'Remarkable CV', locale: 'en_GH', images: [`${SITE_URL}/og-cover.jpg`] },
    twitter: { card: 'summary_large_image', title: g.title, description: g.description, images: [`${SITE_URL}/og-cover.jpg`] },
  }
}

export default function GuidePage({ params }: { params: { slug: string } }) {
  const g = guideBySlug(params.slug)
  if (!g) notFound()
  const url = `${SITE_URL}/guides/${g.slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: g.h1,
        description: g.description,
        inLanguage: 'en-GH',
        mainEntityOfPage: url,
        datePublished: GUIDES_UPDATED,
        dateModified: GUIDES_UPDATED,
        author: { '@type': 'Organization', name: 'Remarkable CV', url: SITE_URL },
        publisher: { '@type': 'Organization', name: 'Remarkable CV', logo: { '@type': 'ImageObject', url: `${SITE_URL}/remarkable-cv-mark.png` } },
        image: `${SITE_URL}/og-cover.jpg`,
      },
      {
        '@type': 'FAQPage',
        mainEntity: g.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/guides` },
          { '@type': 'ListItem', position: 3, name: g.h1, item: url },
        ],
      },
    ],
  }
  const related = g.related.map(slug => guideBySlug(slug)).filter(Boolean)

  return (
    <GuideShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
        <Link href="/" style={{ color: '#64748b' }}>Home</Link> / <Link href="/guides" style={{ color: '#64748b' }}>Guides</Link>
      </nav>
      <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(2rem, 6vw, 2.8rem)', fontWeight: 600, lineHeight: 1.12, margin: '0 0 12px', color: '#07182c' }}>{g.h1}</h1>
      <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 22px' }}>Updated 1 November 2026</p>
      <p style={{ fontSize: '1.05rem', lineHeight: 1.75, color: '#334155', margin: '0 0 8px' }}>{g.intro}</p>

      {g.sections.map(s => (
        <section key={s.h2}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.6rem', fontWeight: 600, margin: '34px 0 10px', color: '#07182c' }}>{s.h2}</h2>
          {s.paragraphs?.map((p, i) => <p key={i} style={{ lineHeight: 1.75, color: '#334155', margin: '0 0 12px' }}>{p}</p>)}
          {s.bullets && (
            <ul style={{ paddingLeft: '22px', margin: '6px 0 12px', listStyleType: 'disc', color: '#334155', lineHeight: 1.75 }}>
              {s.bullets.map(b => <li key={b} style={{ marginBottom: '6px' }}>{b}</li>)}
            </ul>
          )}
        </section>
      ))}

      <div style={{ margin: '40px 0', padding: '24px', background: '#f4faf6', border: '1px solid #cfe9d8', borderRadius: '16px', textAlign: 'center' }}>
        <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.5rem', fontWeight: 600, margin: '0 0 6px', color: '#07182c' }}>Want it done for you?</p>
        <p style={{ margin: '0 0 16px', color: '#475569', lineHeight: 1.6 }}>Tell us about your experience and Remarkable CV writes it up. See the full CV free before you pay.</p>
        <Link href={g.cta.href} style={{ display: 'inline-block', background: '#0a8a3f', color: '#fff', padding: '14px 28px', borderRadius: '10px', fontWeight: 600, textDecoration: 'none' }}>{g.cta.label}</Link>
      </div>

      <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.6rem', fontWeight: 600, margin: '0 0 10px', color: '#07182c' }}>Common questions</h2>
      {g.faq.map(f => (
        <div key={f.q} style={{ margin: '0 0 16px' }}>
          <h3 style={{ fontSize: '1.02rem', fontWeight: 700, margin: '0 0 4px', color: '#0f172a' }}>{f.q}</h3>
          <p style={{ margin: 0, lineHeight: 1.7, color: '#334155' }}>{f.a}</p>
        </div>
      ))}

      {related.length > 0 && (
        <>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.6rem', fontWeight: 600, margin: '34px 0 10px', color: '#07182c' }}>Keep reading</h2>
          <ul style={{ paddingLeft: '22px', margin: 0, listStyleType: 'disc', lineHeight: 1.9 }}>
            {related.map(r => r && <li key={r.slug}><Link href={`/guides/${r.slug}`} style={{ color: '#0a8a3f', fontWeight: 600 }}>{r.h1}</Link></li>)}
          </ul>
        </>
      )}
    </GuideShell>
  )
}
