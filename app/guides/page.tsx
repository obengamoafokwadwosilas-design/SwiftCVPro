import type { Metadata } from 'next'
import Link from 'next/link'
import { GUIDES } from '@/content/guides'
import { SITE_URL } from '@/lib/site'
import GuideShell from './GuideShell'

export const metadata: Metadata = {
  title: 'CV and Cover Letter Guides for Ghana | Remarkable CV',
  description: 'Plain, practical guides on writing a CV and cover letter in Ghana: format, national service CVs, ATS-friendly layouts, tailoring to a job advert and academic CVs.',
  alternates: { canonical: `${SITE_URL}/guides` },
}

export default function GuidesIndex() {
  return (
    <GuideShell>
      <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(2rem, 6vw, 2.8rem)', fontWeight: 600, lineHeight: 1.12, margin: '0 0 12px', color: '#07182c' }}>CV and cover letter guides</h1>
      <p style={{ fontSize: '1.05rem', lineHeight: 1.75, color: '#334155', margin: '0 0 28px' }}>Short, practical guides for people applying for jobs in Ghana and beyond.</p>
      <div style={{ display: 'grid', gap: '14px' }}>
        {GUIDES.map(g => (
          <Link key={g.slug} href={`/guides/${g.slug}`} style={{ display: 'block', background: '#fff', border: '1px solid #e5e0d6', borderRadius: '14px', padding: '18px 20px', textDecoration: 'none' }}>
            <span style={{ display: 'block', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.4rem', fontWeight: 600, color: '#07182c', marginBottom: '4px' }}>{g.h1}</span>
            <span style={{ display: 'block', color: '#475569', lineHeight: 1.6, fontSize: '0.95rem' }}>{g.description}</span>
          </Link>
        ))}
      </div>
    </GuideShell>
  )
}
