'use client'

import { GeneratedCV, TemplateId } from '@/types'
import React, { useRef, useState, useLayoutEffect } from 'react'

// Render Additional Information as separate titled sections. Each "Label: value"
// line (Certifications, References, Memberships, …) becomes its own heading —
// using the template's own heading function so it matches Education/Skills — with
// its values beneath. Only labels that exist render, so there are never empty
// headings. A stray line with no label falls back under "Additional Information".
function addlSections(text: string | undefined, headFn: (t: string) => React.ReactNode): React.ReactNode {
  if (!text) return null
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const sections: { title: string; body: string }[] = []
  lines.forEach(line => {
    const ci = line.indexOf(':')
    if (ci > 0 && ci <= 32) {
      sections.push({ title: line.slice(0, ci).trim(), body: line.slice(ci + 1).trim() })
    } else if (sections.length) {
      const last = sections[sections.length - 1]
      last.body += (last.body ? '\n' : '') + line
    } else {
      sections.push({ title: 'Additional Information', body: line })
    }
  })
  if (!sections.length) return null
  return <>{sections.map((s, i) => (
    <div key={i} style={{ marginBottom: i < sections.length - 1 ? 12 : 0 }}>
      {headFn(s.title)}
      <p style={{ fontSize: 12, lineHeight: 1.7, color: '#444', margin: 0, whiteSpace: 'pre-line' }}>{s.body}</p>
    </div>
  ))}</>
}

// ════════════════════════════════════════════════════════════════
// CV PREVIEW — TRUE MULTI-PAGE PAGINATION ENGINE
// Measures content, packs into discrete A4 pages, each page gets its
// own full-height sidebar. Eliminates the white-gap problem entirely.
// Same paged DOM feeds both screen preview and PDF export.
// ════════════════════════════════════════════════════════════════

const TEMPLATE_MAP: Record<string, 'vertex' | 'sovereign' | 'meridian' | 'ascend' | 'harbour' | 'classic' | 'onyx' | 'sterling' | 'slate' | 'verde' | 'crimson' | 'atlas'> = {
  vertex: 'vertex', atelier: 'vertex', editorial: 'vertex',
  sovereign: 'sovereign', newyork: 'sovereign', executive: 'sovereign',
  meridian: 'meridian', modern: 'meridian', europass: 'meridian', graduate: 'meridian',
  ascend: 'ascend',
  harbour: 'harbour', nordic: 'harbour',
  classic: 'classic', academic: 'classic', london: 'classic',
  // PDF-only premium designs
  onyx: 'onyx', noir: 'onyx', pulse: 'onyx',
  sterling: 'sterling',
  slate: 'slate',
  verde: 'verde',
  crimson: 'crimson',
  atlas: 'atlas',
}
const DEFAULT_ACCENT: Record<string, string> = {
  vertex: '#e0533d', sovereign: '#b08d3f', meridian: '#0d9488', ascend: '#1d4ed8', harbour: '#0f766e', classic: '#1a1a1a',
  onyx: '#c9a86a', sterling: '#c9a86a', slate: '#1a1a1a', verde: '#3f9142', crimson: '#a01e1e', atlas: '#3b82f6',
}
const BODY_SERIF = "'Cambria', Georgia, serif"
const BODY_SANS = "'Calibri', 'Segoe UI', sans-serif"

// A4 at 96dpi
const PAGE_W = 794
const PAGE_H = 1123

const contact = (cv: GeneratedCV) => [cv.location, cv.phone, cv.email, cv.linkedin].filter(Boolean).join('  •  ')
const isCL = (cv: GeneratedCV) => !!cv.coverLetterBody
const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

// Produce a deep, rich version of the accent for 'brand' bands/sidebars.
// Adapts to the colour's lightness so already-dark accents (navy, plum, forest)
// stay distinct instead of collapsing into the same near-black.
function darken(hex: string, _factor?: number): string {
  const h = hex.replace('#', '')
  const n = h.length === 3 ? h.split('').map(x => x + x).join('') : h
  let r = parseInt(n.slice(0, 2), 16)
  let g = parseInt(n.slice(2, 4), 16)
  let b = parseInt(n.slice(4, 6), 16)
  // perceived lightness 0-255
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  // darken more when the colour is light, less when it's already dark
  // light (lum~200) → mult ~0.42 ; dark (lum~40) → mult ~0.85
  const mult = Math.min(0.9, Math.max(0.4, 0.4 + (255 - lum) / 255 * 0.5))
  r = Math.round(r * mult); g = Math.round(g * mult); b = Math.round(b * mult)
  // ensure a minimum depth floor so text stays readable on it
  return `rgb(${r}, ${g}, ${b})`
}

// ── A "block" is a measurable chunk of CV content ──
type Block = { key: string; node: React.ReactNode }

export default function CVPreview({ cv, templateId = 'meridian', accentColor }: { cv: GeneratedCV; templateId?: TemplateId; accentColor?: string | null }) {
  if (!cv) return null
  const design = TEMPLATE_MAP[templateId] || 'meridian'
  const A = accentColor ? `#${accentColor.replace('#', '')}` : DEFAULT_ACCENT[design]

  // Cover letters never paginate into columns — single flowing page(s)
  if (isCL(cv)) return <CoverLetter cv={cv} A={A} font={design === 'meridian' || design === 'ascend' ? BODY_SANS : BODY_SERIF} />

  const config = TEMPLATES_CONFIG[design]
  return <Paginated cv={cv} A={A} config={config} />
}

// ════════════════════════════════════════════════════════════════
// TEMPLATE CONFIG — each template defines its frame + how to render blocks
// ════════════════════════════════════════════════════════════════
type TemplateConfig = {
  design: string
  font: string
  // content area top/bottom padding inside a page (px) — used to compute usable height
  contentPadV: number
  // main content left/right padding
  mainPad: string
  // sidebar width (0 = single column)
  sidebarW: number
  // exact inner width of main content column (for accurate height measurement)
  measureW: number
  sidebarSide: 'left' | 'right' | 'none'
  // render the page frame: sidebar (only filled on page 1), header (page 1 only), and children = packed blocks
  Frame: (p: { cv: GeneratedCV; A: string; pageIndex: number; children: React.ReactNode }) => React.ReactElement
  // build the ordered list of content blocks (main column)
  buildBlocks: (cv: GeneratedCV, A: string) => Block[]
  // page-1 header (name/title block) — used in Frame AND measured for accurate pagination
  Header: (p: { cv: GeneratedCV; A: string }) => React.ReactElement
}

// shared block builders for single-column-ish bodies
function sectionHeading(text: string, A: string, style: 'rule' | 'bar' | 'tick' | 'dash' | 'plain' = 'rule') {
  if (style === 'bar') return <div style={{ background: A, color: '#fff', fontSize: 12.5, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', padding: '7px 16px', marginBottom: 12 }}>{text}</div>
  if (style === 'tick') return <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#1a2a2a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ display: 'inline-block', width: 4, height: 16, background: A }} />{text}</div>
  if (style === 'dash') return <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#1c1c1c', marginBottom: 12 }}>— {text}</div>
  if (style === 'plain') return <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: A, marginBottom: 12 }}>{text}</div>
  return <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: A, borderBottom: `2px solid ${A}`, paddingBottom: 4, marginBottom: 10 }}>{text}</div>
}

// Generic experience/education/skills block builders (used by most templates)
function commonBlocks(cv: GeneratedCV, A: string, headStyle: any, opts?: { skillsInline?: boolean }): Block[] {
  const blocks: Block[] = []
  if (cv.summary) blocks.push({ key: 'summary', node: <div style={{ marginBottom: 18 }}>{sectionHeading('Profile', A, headStyle)}<p style={{ fontSize: 12.5, lineHeight: 1.8, color: '#333', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div> })
  if (cv.experience?.length) {
    // heading is its own block, each experience its own block (so they can split across pages)
    blocks.push({ key: 'exp-h', node: <div style={{ marginBottom: 4 }}>{sectionHeading('Professional Experience', A, headStyle)}</div> })
    cv.experience.forEach((e, i) => blocks.push({
      key: `exp-${i}`, node: (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{e.role}</div><div style={{ fontSize: 11, color: '#888', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</div></div>
          <div style={{ fontSize: 12, color: A, fontWeight: 600, fontStyle: 'italic', marginBottom: 6 }}>{e.company}</div>
          <ul style={{ margin: 0, paddingLeft: 18, listStyleType: 'disc', listStylePosition: 'outside' }}>{e.bullets.map((b, j) => <li key={j} style={{ fontSize: 12, lineHeight: 1.7, color: '#333', marginBottom: 4 }}>{b}</li>)}</ul>
        </div>
      )
    }))
  }
  if (cv.education?.length) {
    blocks.push({ key: 'edu-h', node: <div style={{ marginBottom: 4 }}>{sectionHeading('Education', A, headStyle)}</div> })
    cv.education.forEach((e, i) => blocks.push({
      key: `edu-${i}`, node: (
        <div style={{ marginBottom: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <div><div style={{ fontSize: 12.5, fontWeight: 700 }}>{e.qualification} in {e.field}</div><div style={{ fontSize: 11.5, color: '#666', fontStyle: 'italic' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div></div>
          <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startYear} – {e.endYear}</div>
        </div>
      )
    }))
  }
  // academic extras
  const extra = (title: string, items?: string[]) => { if (items?.length) { blocks.push({ key: `${title}-h`, node: <div style={{ marginBottom: 4 }}>{sectionHeading(title, A, headStyle)}</div> }); items.forEach((x, i) => blocks.push({ key: `${title}-${i}`, node: <ul style={{ margin: 0, paddingLeft: 18, marginBottom: 4, listStyleType: 'disc', listStylePosition: 'outside' }}><li style={{ fontSize: 11.5, lineHeight: 1.7, color: '#444' }}>{x}</li></ul> })) } }
  extra('Publications', cv.publications); extra('Research', cv.research); extra('Teaching Experience', cv.teaching)
  // skills + languages (single-column templates show inline here; sidebar templates put them in sidebar)
  if (opts?.skillsInline) {
    if (cv.skills?.length) blocks.push({ key: 'skills', node: <div style={{ marginBottom: 14 }}>{sectionHeading('Core Skills', A, headStyle)}<div style={{ fontSize: 12, color: '#333', lineHeight: 2 }}>{cv.skills.join('  •  ')}</div></div> })
    if (cv.languages?.length) blocks.push({ key: 'langs', node: <div style={{ marginBottom: 14 }}>{sectionHeading('Languages', A, headStyle)}<div style={{ fontSize: 12, color: '#333' }}>{cv.languages.join('  •  ')}</div></div> })
  }
  if (cv.additionalInfo) blocks.push({ key: 'addl', node: <div style={{ marginBottom: 14 }}>{addlSections(cv.additionalInfo, (t) => sectionHeading(t, A, headStyle))}</div> })
  return blocks
}

// ── Sidebar content (page 1 only) for sidebar templates ──
function SidebarContent({ cv, light }: { cv: GeneratedCV; light?: boolean }) {
  const head = (t: string) => <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.3)' }}>{t}</div>
  return (
    <>
      <div style={{ marginBottom: 26 }}>{head('Contact')}{[cv.phone, cv.email, cv.location, cv.linkedin].filter(Boolean).map((c, i) => <div key={i} style={{ fontSize: 11.5, marginBottom: 7, opacity: 0.95, wordBreak: 'break-word', lineHeight: 1.5 }}>{c}</div>)}</div>
      {!!cv.education?.length && <div style={{ marginBottom: 26 }}>{head('Education')}{cv.education.map((e, i) => <div key={i} style={{ marginBottom: 11, fontSize: 11.5, opacity: 0.95, lineHeight: 1.45 }}><div style={{ fontWeight: 700 }}>{e.qualification}{e.field ? ` in ${e.field}` : ''}</div><div style={{ opacity: 0.85 }}>{e.institution}</div><div style={{ opacity: 0.7, fontSize: 10.5 }}>{e.startYear} – {e.endYear}{e.grade ? ` · ${e.grade}` : ''}</div></div>)}</div>}
      {!!cv.skills?.length && <div style={{ marginBottom: 26 }}>{head('Skills')}{cv.skills.map((s, i) => <div key={i} style={{ fontSize: 11.5, marginBottom: 7, opacity: 0.95, display: 'flex', gap: 7 }}><span style={{ opacity: 0.7 }}>›</span><span>{s}</span></div>)}</div>}
      {!!cv.languages?.length && <div style={{ marginBottom: 26 }}>{head('Languages')}{cv.languages.map((l, i) => <div key={i} style={{ fontSize: 11.5, marginBottom: 7, opacity: 0.95 }}>{l}</div>)}</div>}
    </>
  )
}

// ════════════════════════════════════════════════════════════════
// THE PAGINATION ENGINE
// ════════════════════════════════════════════════════════════════
function Paginated({ cv, A, config }: { cv: GeneratedCV; A: string; config: TemplateConfig }) {
  const blocks = config.buildBlocks(cv, A)
  const measureRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<number[][] | null>(null)

  useLayoutEffect(() => {
    let cancelled = false
    let raf = 0

    function paginate() {
      try {
        const el = measureRef.current
        if (!el) return
        const children = Array.from(el.children) as HTMLElement[]
        if (children.length !== blocks.length || blocks.length === 0) return

        const heights = children.map(c => {
          const r = c.getBoundingClientRect()
          let m = 0
          try {
            const cs = window.getComputedStyle(c)
            m = (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0)
          } catch { m = 0 }
          return r.height + m
        })

        const headerH = headerRef.current ? headerRef.current.getBoundingClientRect().height : 0
        const usable = PAGE_H - config.contentPadV * 2
        const page1Usable = Math.max(160, usable - headerH)

        const result: number[][] = []
        let current: number[] = []
        let used = 0
        let limit = page1Usable
        const isHeading = (i: number) => blocks[i].key.endsWith('-h')

        for (let i = 0; i < blocks.length; i++) {
          const h = heights[i] || 0
          if (current.length > 0 && used + h > limit) {
            result.push(current); current = []; used = 0; limit = usable
          }
          current.push(i)
          used += h
          if (isHeading(i) && i + 1 < blocks.length) {
            const nextH = heights[i + 1] || 0
            if (used + nextH > limit && current.length > 1) {
              current.pop()
              result.push(current)
              current = [i]
              used = h
              limit = usable
            }
          }
        }
        if (current.length) result.push(current)
        if (result.length === 0) result.push(blocks.map((_, i) => i))
        if (!cancelled) setPages(result)
      } catch {
        // on any measurement error, fall back to single page (never crash the app)
        if (!cancelled) setPages([blocks.map((_, i) => i)])
      }
    }

    const run = () => { raf = requestAnimationFrame(() => { if (!cancelled) paginate() }) }
    const fonts = (document as any).fonts
    if (fonts && fonts.ready && typeof fonts.ready.then === 'function') {
      fonts.ready.then(run).catch(run)
    } else {
      run()
    }
    return () => { cancelled = true; if (raf) cancelAnimationFrame(raf) }
  }, [cv, A, config.design]) // eslint-disable-line

  // Hidden measure pass — renders real header + all blocks at exact column width
  const measurePass = (
    <div data-measure-pass aria-hidden="true" style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', left: -99999, top: 0, width: config.measureW }}>
      <div ref={headerRef} style={{ width: '100%' }}><config.Header cv={cv} A={A} /></div>
      <div ref={measureRef}>
        {blocks.map(b => <div key={b.key}>{b.node}</div>)}
      </div>
    </div>
  )

  // Until pagination resolves, render everything on page 1 (correct for 1-page CVs, no flash)
  const pagePlan = (pages && pages.length > 0) ? pages : [blocks.map((_, i) => i)]

  return (
    <div>
      {/* On screen, hide the paged frames and show only the continuous doc.
          In print/PDF (buildPdfHtml uses print media) this rule does NOT apply,
          so the real pages render — the download is unchanged. */}
      <style>{`@media screen { #cv-print-area > div > div:not([data-screen-doc]):not([data-measure-pass]) { display: none !important; } }`}</style>
      {measurePass}
      {/* SCREEN: one continuous document — every block in a single frame, so there
          are no inter-page padding/margin seams and no trailing empty space. */}
      <div data-screen-doc>
        <config.Frame cv={cv} A={A} pageIndex={0}>
          {blocks.map(b => <div key={b.key}>{b.node}</div>)}
        </config.Frame>
      </div>
      {/* PRINT/PDF: the real A4 pages. Captured by buildPdfHtml, hidden on screen. */}
      {pagePlan.map((blockIdxs, pageIndex) => (
        <config.Frame key={pageIndex} cv={cv} A={A} pageIndex={pageIndex}>
          {blockIdxs.map(i => blocks[i] ? <div key={blocks[i].key}>{blocks[i].node}</div> : null)}
        </config.Frame>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// TEMPLATE CONFIGS
// ════════════════════════════════════════════════════════════════
// NOTE: no minHeight here on purpose. On screen, pages collapse to their real
// content height so an under-filled page leaves no empty gap. The PDF page height
// is set separately in buildPdfHtml (#cv-print-area > div > div { height: 296mm })
// inside app/preview/page.tsx, so the download stays full-A4 and unaffected.
const pageBase: React.CSSProperties = { width: PAGE_W, background: '#fff', margin: '0 auto 24px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden', pageBreakAfter: 'always' }

const TEMPLATES_CONFIG: Record<string, TemplateConfig> = {
  // ── MERIDIAN: teal sidebar left ──
  meridian: {
    design: 'meridian', font: BODY_SERIF, contentPadV: 40, mainPad: '40px 32px', sidebarW: 262, sidebarSide: 'left', measureW: 468,
    buildBlocks: (cv, A) => {
      const head = (t: string) => <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: A, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>{t}<span style={{ flex: 1, height: 2, background: A, opacity: 0.25 }} /></div>
      const b: Block[] = []
      if (cv.summary) b.push({ key: 'summary', node: <div style={{ marginBottom: 22 }}>{head('Profile')}<p style={{ fontSize: 12.5, lineHeight: 1.8, color: '#333', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div> })
      if (cv.experience?.length) {
        b.push({ key: 'exp-h', node: <div style={{ marginBottom: 4 }}>{head('Experience')}</div> })
        cv.experience.forEach((e, i) => b.push({ key: `exp-${i}`, node: <div style={{ marginBottom: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{e.role}</div><div style={{ fontSize: 10.5, color: '#888', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</div></div><div style={{ fontSize: 12, color: A, fontWeight: 600, marginBottom: 6 }}>{e.company}</div><ul style={{ margin: 0, paddingLeft: 16, listStyleType: 'disc', listStylePosition: 'outside' }}>{e.bullets.map((x, j) => <li key={j} style={{ fontSize: 12, lineHeight: 1.7, color: '#333', marginBottom: 5 }}>{x}</li>)}</ul></div> }))
      }
      // Education is rendered in the sidebar for this two-column template.
      const ex = (t: string, items?: string[]) => { if (items?.length) { b.push({ key: `${t}-h`, node: <div style={{ marginBottom: 4 }}>{head(t)}</div> }); items.forEach((x, i) => b.push({ key: `${t}-${i}`, node: <ul style={{ margin: 0, paddingLeft: 16, marginBottom: 4, listStyleType: 'disc', listStylePosition: 'outside' }}><li style={{ fontSize: 11.5, lineHeight: 1.7, color: '#333' }}>{x}</li></ul> })) } }
      ex('Publications', cv.publications); ex('Research', cv.research); ex('Teaching Experience', cv.teaching)
      if (cv.additionalInfo) b.push({ key: 'addl', node: <div>{addlSections(cv.additionalInfo, (t) => head(t))}</div> })
      return b
    },
    Header: ({ cv, A }) => (<><div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1, color: '#1a1a1a', marginBottom: 4 }}>{cv.fullName}</div>{cv.jobTitle && <div style={{ fontSize: 14, color: A, fontWeight: 600, letterSpacing: 0.5, marginBottom: 22, textTransform: 'uppercase' }}>{cv.jobTitle}</div>}</>),
    Frame: ({ cv, A, pageIndex, children }) => (
      <div style={{ ...pageBase, display: 'grid', gridTemplateColumns: '262px 1fr', fontFamily: BODY_SERIF, color: '#1a1a1a', background: `linear-gradient(90deg, ${A} 0, ${A} 262px, #fff 262px, #fff 100%)`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        <div style={{ color: '#fff', padding: '40px 26px' }}>{pageIndex === 0 ? <SidebarContent cv={cv} /> : null}</div>
        <div style={{ padding: '40px 32px' }}>
          {pageIndex === 0 && <TEMPLATES_CONFIG.meridian.Header cv={cv} A={A} />}
          {children}
        </div>
      </div>
    ),
  },

  // ── PULSE: dark sidebar right ──
  // ══════════════════════════════════════════════════════════════
  // PDF-ONLY PREMIUM DESIGNS (Onyx, Sterling, Slate, Verde, Crimson)
  // ══════════════════════════════════════════════════════════════

  // ── ONYX: dark editorial header band, gold accents ──
  onyx: {
    design: 'onyx', font: BODY_SERIF, contentPadV: 30, mainPad: '30px 46px', sidebarW: 0, sidebarSide: 'none', measureW: 702,
    buildBlocks: (cv, A) => {
      const head = (t: string) => <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: A, marginBottom: 10 }}>{t}</div>
      const b: Block[] = []
      if (cv.summary) b.push({ key: 'summary', node: <div style={{ marginBottom: 22 }}>{head('Profile')}<p style={{ fontSize: 12.5, lineHeight: 1.8, color: '#444', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div> })
      if (cv.experience?.length) {
        b.push({ key: 'exp-h', node: <div style={{ marginBottom: 4 }}>{head('Experience')}</div> })
        cv.experience.forEach((e, i) => b.push({ key: `exp-${i}`, node: <div style={{ marginBottom: 15 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><span style={{ fontWeight: 700, fontSize: 13.5, color: darken(A, 0.72) }}>{e.role}</span><span style={{ fontSize: 10.5, color: '#999', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</span></div><div style={{ fontSize: 12, color: A, fontWeight: 600, marginBottom: 6 }}>{e.company}</div><ul style={{ margin: 0, paddingLeft: 16, listStyleType: 'disc', listStylePosition: 'outside' }}>{e.bullets.map((x, j) => <li key={j} style={{ fontSize: 11.5, lineHeight: 1.7, color: '#444', marginBottom: 4 }}>{x}</li>)}</ul></div> }))
      }
      if (cv.education?.length) {
        b.push({ key: 'edu-h', node: <div style={{ marginBottom: 4 }}>{head('Education')}</div> })
        cv.education.forEach((e, i) => b.push({ key: `edu-${i}`, node: <div style={{ marginBottom: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div><div style={{ fontSize: 12.5, fontWeight: 700, color: darken(A, 0.72) }}>{e.qualification} in {e.field}</div><div style={{ fontSize: 11.5, color: '#666', fontStyle: 'italic' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div></div><div style={{ fontSize: 10.5, color: A, fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startYear} – {e.endYear}</div></div> }))
      }
      if (cv.skills?.length) b.push({ key: 'skills', node: <div style={{ marginBottom: 14 }}>{head('Core Skills')}<div style={{ fontSize: 12, color: '#444', lineHeight: 2 }}>{cv.skills.join('  ·  ')}</div></div> })
      if (cv.languages?.length) b.push({ key: 'langs', node: <div style={{ marginBottom: 14 }}>{head('Languages')}<div style={{ fontSize: 12, color: '#444' }}>{cv.languages.join('  ·  ')}</div></div> })
      const ex = (t: string, items?: string[]) => { if (items?.length) { b.push({ key: `${t}-h`, node: <div style={{ marginBottom: 4 }}>{head(t)}</div> }); items.forEach((x, i) => b.push({ key: `${t}-${i}`, node: <ul style={{ margin: 0, paddingLeft: 16, marginBottom: 4, listStyleType: 'disc', listStylePosition: 'outside' }}><li style={{ fontSize: 11.5, lineHeight: 1.7, color: '#444' }}>{x}</li></ul> })) } }
      ex('Publications', cv.publications); ex('Research', cv.research); ex('Teaching Experience', cv.teaching)
      if (cv.additionalInfo) b.push({ key: 'addl', node: <div>{addlSections(cv.additionalInfo, (t) => head(t))}</div> })
      return b
    },
    Header: ({ cv, A }) => (<>
      <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1, color: '#fff' }}>{cv.fullName}</div>
      {cv.jobTitle && <div style={{ fontSize: 14, letterSpacing: 3, textTransform: 'uppercase', color: A, marginTop: 8 }}>{cv.jobTitle}</div>}
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 12 }}>{contact(cv)}</div>
    </>),
    Frame: ({ cv, A, pageIndex, children }) => (
      <div style={{ ...pageBase, fontFamily: BODY_SERIF, color: '#1a1a1a', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        {pageIndex === 0 && <div style={{ background: darken(A, 0.72), padding: '38px 46px 30px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}><TEMPLATES_CONFIG.onyx.Header cv={cv} A={A} /></div>}
        <div style={{ padding: pageIndex === 0 ? '30px 46px' : '46px 46px' }}>{children}</div>
      </div>
    ),
  },

  // ── STERLING: gold executive, navy sidebar right, monogram ──
  sterling: {
    design: 'sterling', font: BODY_SERIF, contentPadV: 42, mainPad: '42px 30px 42px 46px', sidebarW: 240, sidebarSide: 'right', measureW: 478,
    buildBlocks: (cv, A) => {
      const DARK = darken(A, 0.74)
      const head = (t: string) => <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: DARK, borderBottom: `2px solid ${A}`, paddingBottom: 4, marginBottom: 12, display: 'inline-block' }}>{t}</div>
      const b: Block[] = []
      if (cv.summary) b.push({ key: 'summary', node: <div style={{ marginBottom: 20 }}>{head('Profile')}<p style={{ fontSize: 12.5, lineHeight: 1.8, color: '#444', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div> })
      if (cv.experience?.length) {
        b.push({ key: 'exp-h', node: <div style={{ marginBottom: 4 }}>{head('Experience')}</div> })
        cv.experience.forEach((e, i) => b.push({ key: `exp-${i}`, node: <div style={{ marginBottom: 15 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><span style={{ fontWeight: 700, fontSize: 13.5, color: DARK }}>{e.role}</span><span style={{ fontSize: 10.5, color: A, fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</span></div><div style={{ fontSize: 12, color: A, fontWeight: 600, marginBottom: 6 }}>{e.company}</div><ul style={{ margin: 0, paddingLeft: 16, listStyleType: 'disc', listStylePosition: 'outside' }}>{e.bullets.map((x, j) => <li key={j} style={{ fontSize: 11.5, lineHeight: 1.7, color: '#444', marginBottom: 4 }}>{x}</li>)}</ul></div> }))
      }
      // Education is rendered in the sidebar for this two-column template.
      const ex = (t: string, items?: string[]) => { if (items?.length) { b.push({ key: `${t}-h`, node: <div style={{ marginBottom: 4 }}>{head(t)}</div> }); items.forEach((x, i) => b.push({ key: `${t}-${i}`, node: <ul style={{ margin: 0, paddingLeft: 16, marginBottom: 4, listStyleType: 'disc', listStylePosition: 'outside' }}><li style={{ fontSize: 11.5, lineHeight: 1.7, color: '#444' }}>{x}</li></ul> })) } }
      ex('Publications', cv.publications); ex('Research', cv.research); ex('Teaching Experience', cv.teaching)
      if (cv.additionalInfo) b.push({ key: 'addl', node: <div>{addlSections(cv.additionalInfo, (t) => head(t))}</div> })
      return b
    },
    Header: ({ cv, A }) => (<>
      <div style={{ fontSize: 34, fontWeight: 700, color: darken(A, 0.74), letterSpacing: 1 }}>{cv.fullName}</div>
      {cv.jobTitle && <div style={{ fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: A, margin: '6px 0 20px' }}>{cv.jobTitle}</div>}
    </>),
    Frame: ({ cv, A, pageIndex, children }) => {
      const DARK = darken(A, 0.74)
      return (
        <div style={{ ...pageBase, fontFamily: BODY_SERIF, color: '#22252b', background: `linear-gradient(90deg, #fff 0, #fff 554px, ${DARK} 554px, ${DARK} 100%)`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px' }}>
            <div style={{ padding: pageIndex === 0 ? '42px 30px 42px 46px' : '46px 30px 42px 46px' }}>
              {pageIndex === 0 && <TEMPLATES_CONFIG.sterling.Header cv={cv} A={A} />}
              {children}
            </div>
            <div style={{ color: '#fff', padding: '42px 26px' }}>
              {pageIndex === 0 && <SterlingSidebar cv={cv} A={A} />}
            </div>
          </div>
        </div>
      )
    },
  },

  // ── SLATE: minimalist mono, airy whitespace ──
  slate: {
    design: 'slate', font: BODY_SERIF, contentPadV: 54, mainPad: '54px 60px', sidebarW: 0, sidebarSide: 'none', measureW: 674,
    buildBlocks: (cv, A) => {
      const head = (t: string) => <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: '#1a1a1a', marginBottom: 14 }}>{t}</div>
      const b: Block[] = []
      if (cv.summary) b.push({ key: 'summary', node: <div style={{ marginBottom: 26 }}>{head('Profile')}<p style={{ fontSize: 12.5, lineHeight: 1.9, color: '#555', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div> })
      if (cv.experience?.length) {
        b.push({ key: 'exp-h', node: <div style={{ marginBottom: 4 }}>{head('Experience')}</div> })
        cv.experience.forEach((e, i) => b.push({ key: `exp-${i}`, node: <div style={{ marginBottom: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><span style={{ fontWeight: 700, fontSize: 13.5, color: '#1a1a1a' }}>{e.role}</span><span style={{ fontSize: 10.5, color: '#bbb', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</span></div><div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{e.company}</div><ul style={{ margin: 0, paddingLeft: 16, listStyleType: 'disc', listStylePosition: 'outside' }}>{e.bullets.map((x, j) => <li key={j} style={{ fontSize: 11.5, lineHeight: 1.75, color: '#555', marginBottom: 5 }}>{x}</li>)}</ul></div> }))
      }
      if (cv.education?.length) {
        b.push({ key: 'edu-h', node: <div style={{ marginBottom: 4 }}>{head('Education')}</div> })
        cv.education.forEach((e, i) => b.push({ key: `edu-${i}`, node: <div style={{ marginBottom: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div><div style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1a1a' }}>{e.qualification} in {e.field}</div><div style={{ fontSize: 11.5, color: '#888' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div></div><div style={{ fontSize: 10.5, color: '#bbb', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startYear} – {e.endYear}</div></div> }))
      }
      if (cv.skills?.length) b.push({ key: 'skills', node: <div style={{ marginBottom: 18 }}>{head('Skills')}<div style={{ fontSize: 12, color: '#555', lineHeight: 2 }}>{cv.skills.join('   ·   ')}</div></div> })
      if (cv.languages?.length) b.push({ key: 'langs', node: <div style={{ marginBottom: 18 }}>{head('Languages')}<div style={{ fontSize: 12, color: '#555' }}>{cv.languages.join('   ·   ')}</div></div> })
      const ex = (t: string, items?: string[]) => { if (items?.length) { b.push({ key: `${t}-h`, node: <div style={{ marginBottom: 4 }}>{head(t)}</div> }); items.forEach((x, i) => b.push({ key: `${t}-${i}`, node: <ul style={{ margin: 0, paddingLeft: 16, marginBottom: 4, listStyleType: 'disc', listStylePosition: 'outside' }}><li style={{ fontSize: 11.5, lineHeight: 1.75, color: '#555' }}>{x}</li></ul> })) } }
      ex('Publications', cv.publications); ex('Research', cv.research); ex('Teaching Experience', cv.teaching)
      if (cv.additionalInfo) b.push({ key: 'addl', node: <div>{addlSections(cv.additionalInfo, (t) => head(t))}</div> })
      return b
    },
    Header: ({ cv }) => (<>
      <div style={{ fontSize: 30, fontWeight: 300, letterSpacing: 6, textTransform: 'uppercase', color: '#1a1a1a' }}>{cv.fullName}</div>
      {cv.jobTitle && <div style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: '#888', margin: '10px 0 4px' }}>{cv.jobTitle}</div>}
      <div style={{ width: 36, height: 2, background: '#1a1a1a', margin: '16px 0 28px' }} />
      <div style={{ fontSize: 10.5, letterSpacing: 1, color: '#999', marginBottom: 30 }}>{contact(cv)}</div>
    </>),
    Frame: ({ cv, A, pageIndex, children }) => (
      <div style={{ ...pageBase, fontFamily: BODY_SERIF, color: '#1a1a1a', padding: '54px 60px' }}>
        {pageIndex === 0 && <TEMPLATES_CONFIG.slate.Header cv={cv} A={A} />}
        {children}
      </div>
    ),
  },

  // ── VERDE: green gradient header, timeline experience, cards ──
  verde: {
    design: 'verde', font: BODY_SERIF, contentPadV: 36, mainPad: '36px 50px', sidebarW: 0, sidebarSide: 'none', measureW: 694,
    buildBlocks: (cv, A) => {
      const head = (t: string) => <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: darken(A, 0.5), marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: A }} />{t}<span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${A}40, transparent)` }} /></div>
      const b: Block[] = []
      if (cv.summary) b.push({ key: 'summary', node: <div style={{ marginBottom: 22 }}>{head('About Me')}<p style={{ fontSize: 12.5, lineHeight: 1.8, color: '#444', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div> })
      if (cv.experience?.length) {
        b.push({ key: 'exp-h', node: <div style={{ marginBottom: 4 }}>{head('Experience')}</div> })
        cv.experience.forEach((e, i) => b.push({ key: `exp-${i}`, node: <div style={{ marginBottom: 12, background: '#f4f7f4', borderRadius: 10, padding: '16px 18px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><span style={{ fontWeight: 700, fontSize: 13.5, color: darken(A, 0.5) }}>{e.role}</span><span style={{ fontSize: 10.5, color: '#7a8a7a', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</span></div><div style={{ fontSize: 12, color: A, fontWeight: 600, marginBottom: 6 }}>{e.company}</div><ul style={{ margin: 0, paddingLeft: 16, listStyleType: 'disc', listStylePosition: 'outside' }}>{e.bullets.map((x, j) => <li key={j} style={{ fontSize: 11.5, lineHeight: 1.7, color: '#444', marginBottom: 4 }}>{x}</li>)}</ul></div> }))
      }
      if (cv.education?.length) {
        b.push({ key: 'edu-h', node: <div style={{ marginBottom: 4 }}>{head('Education')}</div> })
        cv.education.forEach((e, i) => b.push({ key: `edu-${i}`, node: <div style={{ marginBottom: 9, paddingLeft: 14, borderLeft: `3px solid ${A}` }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div style={{ fontSize: 12.5, fontWeight: 700, color: darken(A, 0.5) }}>{e.qualification} in {e.field}</div><div style={{ fontSize: 10.5, color: '#7a8a7a', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startYear} – {e.endYear}</div></div><div style={{ fontSize: 11.5, color: '#666' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div></div> }))
      }
      if (cv.skills?.length) b.push({ key: 'skills', node: <div style={{ marginBottom: 14 }}>{head('Skills')}<div style={{ fontSize: 12, color: '#444', lineHeight: 2 }}>{cv.skills.join('  ·  ')}</div></div> })
      if (cv.languages?.length) b.push({ key: 'langs', node: <div style={{ marginBottom: 14 }}>{head('Languages')}<div style={{ fontSize: 12, color: '#444' }}>{cv.languages.join('  ·  ')}</div></div> })
      const ex = (t: string, items?: string[]) => { if (items?.length) { b.push({ key: `${t}-h`, node: <div style={{ marginBottom: 4 }}>{head(t)}</div> }); items.forEach((x, i) => b.push({ key: `${t}-${i}`, node: <ul style={{ margin: 0, paddingLeft: 16, marginBottom: 4, listStyleType: 'disc', listStylePosition: 'outside' }}><li style={{ fontSize: 11.5, lineHeight: 1.7, color: '#444' }}>{x}</li></ul> })) } }
      ex('Publications', cv.publications); ex('Research', cv.research); ex('Teaching Experience', cv.teaching)
      if (cv.additionalInfo) b.push({ key: 'addl', node: <div>{addlSections(cv.additionalInfo, (t) => head(t))}</div> })
      return b
    },
    Header: ({ cv, A }) => (<>
      <div style={{ fontSize: 34, fontWeight: 700, color: '#fff' }}>{cv.fullName}</div>
      {cv.jobTitle && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 600, marginTop: 4 }}>{cv.jobTitle}</div>}
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 10 }}>{contact(cv)}</div>
    </>),
    Frame: ({ cv, A, pageIndex, children }) => (
      <div style={{ ...pageBase, fontFamily: BODY_SERIF, color: '#1a1a1a', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        {pageIndex === 0 && <div style={{ background: `linear-gradient(135deg, ${darken(A, 0.45)}, ${A})`, padding: '36px 50px 30px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}><TEMPLATES_CONFIG.verde.Header cv={cv} A={A} /></div>}
        <div style={{ padding: pageIndex === 0 ? '32px 50px 40px' : '46px 50px 40px' }}>{children}</div>
      </div>
    ),
  },

  // ── CRIMSON: magazine colour header band ──
  crimson: {
    design: 'crimson', font: BODY_SERIF, contentPadV: 40, mainPad: '40px 50px', sidebarW: 0, sidebarSide: 'none', measureW: 694,
    buildBlocks: (cv, A) => {
      const head = (t: string) => <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: A, borderBottom: `2px solid ${A}`, paddingBottom: 4, marginBottom: 12 }}>{t}</div>
      const b: Block[] = []
      if (cv.summary) b.push({ key: 'summary', node: <div style={{ marginBottom: 22 }}>{head('Profile')}<p style={{ fontSize: 12.5, lineHeight: 1.8, color: '#444', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div> })
      if (cv.experience?.length) {
        b.push({ key: 'exp-h', node: <div style={{ marginBottom: 4 }}>{head('Experience')}</div> })
        cv.experience.forEach((e, i) => b.push({ key: `exp-${i}`, node: <div style={{ marginBottom: 15 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><span style={{ fontWeight: 700, fontSize: 13.5, color: '#1a1a1a' }}>{e.role}</span><span style={{ fontSize: 10.5, color: A, fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</span></div><div style={{ fontSize: 12, color: A, fontWeight: 600, marginBottom: 6 }}>{e.company}</div><ul style={{ margin: 0, paddingLeft: 16, listStyleType: 'disc', listStylePosition: 'outside' }}>{e.bullets.map((x, j) => <li key={j} style={{ fontSize: 11.5, lineHeight: 1.7, color: '#444', marginBottom: 4 }}>{x}</li>)}</ul></div> }))
      }
      if (cv.education?.length) {
        b.push({ key: 'edu-h', node: <div style={{ marginBottom: 4 }}>{head('Education')}</div> })
        cv.education.forEach((e, i) => b.push({ key: `edu-${i}`, node: <div style={{ marginBottom: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div><div style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1a1a' }}>{e.qualification} in {e.field}</div><div style={{ fontSize: 11.5, color: '#666', fontStyle: 'italic' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div></div><div style={{ fontSize: 10.5, color: A, fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startYear} – {e.endYear}</div></div> }))
      }
      if (cv.skills?.length) b.push({ key: 'skills', node: <div style={{ marginBottom: 14 }}>{head('Core Skills')}<div style={{ fontSize: 12, color: '#444', lineHeight: 2 }}>{cv.skills.join('  ·  ')}</div></div> })
      if (cv.languages?.length) b.push({ key: 'langs', node: <div style={{ marginBottom: 14 }}>{head('Languages')}<div style={{ fontSize: 12, color: '#444' }}>{cv.languages.join('  ·  ')}</div></div> })
      const ex = (t: string, items?: string[]) => { if (items?.length) { b.push({ key: `${t}-h`, node: <div style={{ marginBottom: 4 }}>{head(t)}</div> }); items.forEach((x, i) => b.push({ key: `${t}-${i}`, node: <ul style={{ margin: 0, paddingLeft: 16, marginBottom: 4, listStyleType: 'disc', listStylePosition: 'outside' }}><li style={{ fontSize: 11.5, lineHeight: 1.7, color: '#444' }}>{x}</li></ul> })) } }
      ex('Publications', cv.publications); ex('Research', cv.research); ex('Teaching Experience', cv.teaching)
      if (cv.additionalInfo) b.push({ key: 'addl', node: <div>{addlSections(cv.additionalInfo, (t) => head(t))}</div> })
      return b
    },
    Header: ({ cv, A }) => (<>
      <div style={{ fontSize: 38, fontWeight: 800, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: 1 }}>{cv.fullName}</div>
      {cv.jobTitle && <div style={{ display: 'inline-block', background: A, color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', padding: '4px 14px', margin: '10px 0 6px' }}>{cv.jobTitle}</div>}
      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{contact(cv)}</div>
    </>),
    Frame: ({ cv, A, pageIndex, children }) => (
      <div style={{ ...pageBase, fontFamily: BODY_SERIF, color: '#1a1a1a', borderTop: `8px solid ${A}`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        {pageIndex === 0 && <div style={{ padding: '34px 50px 0' }}><TEMPLATES_CONFIG.crimson.Header cv={cv} A={A} /></div>}
        <div style={{ padding: pageIndex === 0 ? '22px 50px 40px' : '46px 50px 40px' }}>{children}</div>
      </div>
    ),
  },


  // ── ATLAS: numbered-free date rail timeline, architectural ──
  atlas: {
    design: 'atlas', font: BODY_SERIF, contentPadV: 46, mainPad: '46px 50px', sidebarW: 0, sidebarSide: 'none', measureW: 694,
    buildBlocks: (cv, A) => {
      const head = (t: string) => <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#0f172a', marginBottom: 16 }}>{t}</div>
      const b: Block[] = []
      if (cv.summary) b.push({ key: 'summary', node: <div style={{ marginBottom: 26 }}><p style={{ fontSize: 12.5, lineHeight: 1.8, color: '#475569', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div> })
      if (cv.experience?.length) {
        b.push({ key: 'exp-h', node: <div style={{ marginBottom: 4 }}>{head('Experience')}</div> })
        cv.experience.forEach((e, i) => b.push({ key: `exp-${i}`, node: (
          <div style={{ display: 'grid', gridTemplateColumns: '54px 1fr', gap: 16, marginBottom: 18 }}>
            <div style={{ textAlign: 'right', paddingTop: 2 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{e.endDate}</div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>{e.startDate}</div>
            </div>
            <div style={{ borderLeft: `2px solid #e2e8f0`, paddingLeft: 16, position: 'relative' }}>
              <div style={{ position: 'absolute', left: -5, top: 4, width: 8, height: 8, borderRadius: '50%', background: A }} />
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>{e.role}</div>
              <div style={{ fontSize: 11.5, color: A, fontWeight: 700, marginBottom: 6 }}>{e.company}</div>
              <ul style={{ margin: 0, paddingLeft: 16, listStyleType: 'disc', listStylePosition: 'outside' }}>{e.bullets.map((x, j) => <li key={j} style={{ fontSize: 11.5, lineHeight: 1.7, color: '#475569', marginBottom: 4 }}>{x}</li>)}</ul>
            </div>
          </div>
        ) }))
      }
      if (cv.education?.length) {
        b.push({ key: 'edu-h', node: <div style={{ marginBottom: 4 }}>{head('Education')}</div> })
        cv.education.forEach((e, i) => b.push({ key: `edu-${i}`, node: (
          <div style={{ display: 'grid', gridTemplateColumns: '54px 1fr', gap: 16, marginBottom: 12 }}>
            <div style={{ textAlign: 'right', paddingTop: 2 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{e.endYear}</div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>{e.startYear}</div>
            </div>
            <div style={{ borderLeft: `2px solid #e2e8f0`, paddingLeft: 16, position: 'relative' }}>
              <div style={{ position: 'absolute', left: -5, top: 4, width: 8, height: 8, borderRadius: '50%', background: A }} />
              <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a' }}>{e.qualification} in {e.field}</div>
              <div style={{ fontSize: 11.5, color: '#64748b' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div>
            </div>
          </div>
        ) }))
      }
      if (cv.skills?.length) b.push({ key: 'skills', node: <div style={{ marginBottom: 16 }}>{head('Skills')}<div style={{ fontSize: 12, color: '#475569', lineHeight: 2, paddingLeft: 70 }}>{cv.skills.join('   ·   ')}</div></div> })
      if (cv.languages?.length) b.push({ key: 'langs', node: <div style={{ marginBottom: 16 }}>{head('Languages')}<div style={{ fontSize: 12, color: '#475569', paddingLeft: 70 }}>{cv.languages.join('   ·   ')}</div></div> })
      const ex = (t: string, items?: string[]) => { if (items?.length) { b.push({ key: `${t}-h`, node: <div style={{ marginBottom: 4 }}>{head(t)}</div> }); items.forEach((x, i) => b.push({ key: `${t}-${i}`, node: <ul style={{ margin: 0, paddingLeft: 86, marginBottom: 4, listStyleType: 'disc', listStylePosition: 'outside' }}><li style={{ fontSize: 11.5, lineHeight: 1.7, color: '#475569' }}>{x}</li></ul> })) } }
      ex('Publications', cv.publications); ex('Research', cv.research); ex('Teaching Experience', cv.teaching)
      if (cv.additionalInfo) b.push({ key: 'addl', node: <div>{addlSections(cv.additionalInfo, (t) => head(t))}</div> })
      return b
    },
    Header: ({ cv, A }) => {
      const first = cv.fullName.split(' ')[0], last = cv.fullName.split(' ').slice(1).join(' ')
      return (<>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div style={{ fontSize: 40, fontWeight: 300, color: '#0f172a', letterSpacing: 1 }}>{first} <strong style={{ fontWeight: 800 }}>{last}</strong></div>
          <div style={{ textAlign: 'right', fontSize: 10, color: '#94a3b8', lineHeight: 1.6, marginTop: 6 }}>{[cv.phone, cv.email, cv.location, cv.linkedin].filter(Boolean).map((x, i) => <div key={i}>{x}</div>)}</div>
        </div>
        {cv.jobTitle && <div style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: A, marginBottom: 24 }}>{cv.jobTitle}</div>}
      </>)
    },
    Frame: ({ cv, A, pageIndex, children }) => (
      <div style={{ ...pageBase, fontFamily: BODY_SERIF, color: '#1a1a1a', padding: '46px 50px' }}>
        {pageIndex === 0 && <TEMPLATES_CONFIG.atlas.Header cv={cv} A={A} />}
        {children}
      </div>
    ),
  },
  // ── VERTEX: colour rail + two inner columns (paginate the whole body) ──
  vertex: {
    design: 'vertex', font: BODY_SERIF, contentPadV: 46, mainPad: '46px', sidebarW: 0, sidebarSide: 'none', measureW: 664,
    buildBlocks: (cv, A) => commonBlocks(cv, A, 'dash', { skillsInline: true }),
    Header: ({ cv, A }) => {
      const first = cv.fullName.split(' ')[0], rest = cv.fullName.split(' ').slice(1).join(' ')
      return (<>
        <div style={{ marginBottom: 6 }}><span style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1, lineHeight: 0.95, color: '#1c1c1c', textTransform: 'uppercase' }}>{first} </span><span style={{ fontSize: 42, fontWeight: 300, letterSpacing: -1, color: '#1c1c1c', textTransform: 'uppercase' }}>{rest}</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}><div style={{ width: 40, height: 3, background: A }} /><span style={{ fontSize: 14, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: A }}>{cv.jobTitle}</span></div>
        <div style={{ fontSize: 11.5, color: '#777', marginBottom: 30 }}>{contact(cv)}</div>
      </>)
    },
    Frame: ({ cv, A, pageIndex, children }) => {
      const first = cv.fullName.split(' ')[0], rest = cv.fullName.split(' ').slice(1).join(' ')
      return (
        <div style={{ ...pageBase, fontFamily: BODY_SERIF, color: '#1a1a1a', display: 'grid', gridTemplateColumns: '38px 1fr', background: `linear-gradient(90deg, ${A} 0, ${A} 38px, #fff 38px, #fff 100%)`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <div />
          <div style={{ padding: '46px' }}>
            {pageIndex === 0 && <TEMPLATES_CONFIG.vertex.Header cv={cv} A={A} />}
            {children}
          </div>
        </div>
      )
    },
  },

  // ── SOVEREIGN: centered crest, single column body ──
  sovereign: {
    design: 'sovereign', font: BODY_SERIF, contentPadV: 46, mainPad: '46px 54px', sidebarW: 0, sidebarSide: 'none', measureW: 686,
    buildBlocks: (cv, A) => {
      const DARK = '#1a2238'
      const head = (t: string) => <div style={{ marginBottom: 14 }}><span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: DARK, borderBottom: `1px solid ${A}`, paddingBottom: 4 }}>{t}</span></div>
      const b: Block[] = []
      if (cv.summary) b.push({ key: 'summary', node: <div style={{ marginBottom: 24 }}>{head('Profile')}<p style={{ fontSize: 12.5, lineHeight: 1.85, color: '#444', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div> })
      if (cv.experience?.length) {
        b.push({ key: 'exp-h', node: <div style={{ marginBottom: 4 }}>{head('Experience')}</div> })
        cv.experience.forEach((e, i) => b.push({ key: `exp-${i}`, node: <div style={{ marginBottom: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 14, fontWeight: 700, color: DARK }}>{e.role}</span><span style={{ fontSize: 10.5, color: A, fontStyle: 'italic', fontFamily: BODY_SANS }}>{e.startDate} – {e.endDate}</span></div><div style={{ fontSize: 12, color: A, fontStyle: 'italic', marginBottom: 7 }}>{e.company}</div><ul style={{ margin: 0, paddingLeft: 18, listStyleType: 'disc', listStylePosition: 'outside' }}>{e.bullets.map((x, j) => <li key={j} style={{ fontSize: 11.8, lineHeight: 1.75, color: '#444', marginBottom: 5, fontFamily: BODY_SANS }}>{x}</li>)}</ul></div> }))
      }
      if (cv.education?.length) {
        b.push({ key: 'edu-h', node: <div style={{ marginBottom: 4 }}>{head('Education')}</div> })
        cv.education.forEach((e, i) => b.push({ key: `edu-${i}`, node: <div style={{ marginBottom: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div><div style={{ fontSize: 12.5, fontWeight: 700, color: DARK }}>{e.qualification} in {e.field}</div><div style={{ fontSize: 11.5, color: '#666', fontStyle: 'italic' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div></div><div style={{ fontSize: 10.5, color: A, fontStyle: 'italic', whiteSpace: 'nowrap', fontFamily: BODY_SANS }}>{e.startYear} – {e.endYear}</div></div> }))
      }
      if (cv.skills?.length) b.push({ key: 'skills', node: <div style={{ marginBottom: 20 }}>{head('Expertise')}<div style={{ fontSize: 11.5, lineHeight: 1.95, color: '#444', fontFamily: BODY_SANS }}>{cv.skills.join('   ·   ')}</div>{!!cv.languages?.length && <div style={{ fontSize: 11, color: '#666', marginTop: 8, fontFamily: BODY_SANS }}>{cv.languages.join('   ·   ')}</div>}</div> })
      if (cv.additionalInfo) b.push({ key: 'addl', node: <div>{addlSections(cv.additionalInfo, (t) => head(t))}</div> })
      return b
    },
    Header: ({ cv, A }) => {
      const DARK = '#1a2238'
      return (<>
        <div style={{ textAlign: 'center', paddingBottom: 22, borderBottom: `2px solid ${A}`, marginBottom: 8 }}>
          <div style={{ width: 60, height: 60, margin: '0 auto 14px', border: `2px solid ${A}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 22, fontWeight: 700, color: DARK, letterSpacing: 1 }}>{initials(cv.fullName)}</span></div>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: DARK, lineHeight: 1 }}>{cv.fullName}</div>
          {cv.jobTitle && <div style={{ fontSize: 13, letterSpacing: 5, textTransform: 'uppercase', color: A, marginTop: 10, fontWeight: 600 }}>{cv.jobTitle}</div>}
        </div>
        <div style={{ textAlign: 'center', fontSize: 10.5, letterSpacing: 1, color: '#888', marginBottom: 28, fontFamily: BODY_SANS }}>{contact(cv)}</div>
      </>)
    },
    Frame: ({ cv, A, pageIndex, children }) => {
      const DARK = '#1a2238'
      return (
        <div style={{ ...pageBase, background: '#fdfcfa', fontFamily: BODY_SERIF, color: '#22252b', padding: '46px 54px' }}>
          {pageIndex === 0 && <TEMPLATES_CONFIG.sovereign.Header cv={cv} A={A} />}
          {children}
        </div>
      )
    },
  },

  // ── ASCEND: single column, colour-bar headings ──
  ascend: {
    design: 'ascend', font: BODY_SERIF, contentPadV: 44, mainPad: '44px 46px', sidebarW: 0, sidebarSide: 'none', measureW: 702,
    buildBlocks: (cv, A) => commonBlocks(cv, A, 'bar', { skillsInline: true }),
    Header: ({ cv, A }) => (<>
      <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 0.5, color: '#1a1a1a', textTransform: 'uppercase', marginBottom: 6 }}>{cv.fullName}</div>
      {cv.jobTitle && <div style={{ fontSize: 15, color: A, fontWeight: 700, marginBottom: 8 }}>{cv.jobTitle}</div>}
      <div style={{ fontSize: 11.5, color: '#777', marginBottom: 24 }}>{contact(cv).replace(/•/g, '|')}</div>
    </>),
    Frame: ({ cv, A, pageIndex, children }) => (
      <div style={{ ...pageBase, fontFamily: BODY_SERIF, color: '#1a1a1a', padding: '44px 46px' }}>
        {pageIndex === 0 && <TEMPLATES_CONFIG.ascend.Header cv={cv} A={A} />}
        {children}
      </div>
    ),
  },

  // ── HARBOUR: single column, tick headings, editorial ──
  harbour: {
    design: 'harbour', font: BODY_SERIF, contentPadV: 46, mainPad: '46px 50px', sidebarW: 0, sidebarSide: 'none', measureW: 694,
    buildBlocks: (cv, A) => commonBlocks(cv, A, 'tick', { skillsInline: true }),
    Header: ({ cv, A }) => (<>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ width: 5, alignSelf: 'stretch', background: A, minHeight: 56 }} />
        <div><div style={{ fontSize: 38, fontWeight: 700, color: '#1a2a2a', lineHeight: 1 }}>{cv.fullName}</div>{cv.jobTitle && <div style={{ fontSize: 16, color: A, fontStyle: 'italic', marginTop: 6 }}>{cv.jobTitle}</div>}</div>
      </div>
      <div style={{ fontSize: 11.5, color: '#778080', marginBottom: 18 }}>{contact(cv).replace(/•/g, '   ')}</div>
      <div style={{ borderBottom: '1px solid #d8e0e0', marginBottom: 22 }} />
    </>),
    Frame: ({ cv, A, pageIndex, children }) => (
      <div style={{ ...pageBase, fontFamily: BODY_SERIF, color: '#1a2a2a', padding: '46px 50px' }}>
        {pageIndex === 0 && <TEMPLATES_CONFIG.harbour.Header cv={cv} A={A} />}
        {children}
      </div>
    ),
  },

  // ── CLASSIC: ATS single column ──
  classic: {
    design: 'classic', font: BODY_SERIF, contentPadV: 44, mainPad: '44px 48px', sidebarW: 0, sidebarSide: 'none', measureW: 698,
    buildBlocks: (cv, A) => commonBlocks(cv, A, 'rule', { skillsInline: true }),
    Header: ({ cv }) => (<div style={{ textAlign: 'center', marginBottom: 22 }}>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>{cv.fullName}</div>
      {cv.jobTitle && <div style={{ fontSize: 13.5, color: '#555', marginBottom: 8 }}>{cv.jobTitle}</div>}
      <div style={{ fontSize: 11, color: '#666' }}>{contact(cv)}</div>
    </div>),
    Frame: ({ cv, A, pageIndex, children }) => (
      <div style={{ ...pageBase, fontFamily: BODY_SERIF, color: '#1a1a1a', padding: '44px 48px' }}>
        {pageIndex === 0 && <TEMPLATES_CONFIG.classic.Header cv={cv} A={A} />}
        {children}
      </div>
    ),
  },
}

function SterlingSidebar({ cv, A }: { cv: GeneratedCV; A: string }) {
  const SH = ({ t }: { t: string }) => <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: A, marginBottom: 10 }}>{t}</div>
  return (
    <>
      <div style={{ width: 54, height: 54, border: `2px solid ${A}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <span style={{ fontSize: 20, color: A, fontWeight: 700 }}>{initials(cv.fullName)}</span>
      </div>
      <SH t="Contact" />
      <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, marginBottom: 18, wordBreak: 'break-word' }}>{[cv.phone, cv.email, cv.location, cv.linkedin].filter(Boolean).map((x, i) => <div key={i}>{x}</div>)}</div>
      {!!cv.education?.length && <><SH t="Education" />{cv.education.map((e, i) => <div key={i} style={{ marginBottom: 10 }}><div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>{e.qualification}{e.field ? ` in ${e.field}` : ''}</div><div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.8)' }}>{e.institution}</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.62)' }}>{e.startYear} – {e.endYear}{e.grade ? ` · ${e.grade}` : ''}</div></div>)}<div style={{ height: 18 }} /></>}
      {!!cv.skills?.length && <><SH t="Skills" />{cv.skills.map((s, i) => <div key={i} style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.85)', marginBottom: 5 }}>{s}</div>)}<div style={{ height: 18 }} /></>}
      {!!cv.languages?.length && <><SH t="Languages" />{cv.languages.map((l, i) => <div key={i} style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.85)', marginBottom: 5 }}>{l}</div>)}</>}
    </>
  )
}

// ── Cover letter (flows naturally, no columns) ──
function CoverLetter({ cv, A, font }: { cv: GeneratedCV; A: string; font: string }) {
  return (
    <div style={{ ...pageBase, fontFamily: font, color: '#1a1a1a', padding: '52px 56px' }}>
      <div style={{ borderBottom: `2px solid ${A}`, paddingBottom: 18, marginBottom: 28 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: A, marginBottom: 4 }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontSize: 13, color: '#666', fontStyle: 'italic', marginBottom: 8 }}>{cv.jobTitle}</div>}
        <div style={{ fontSize: 11, color: '#666', fontFamily: BODY_SANS }}>{contact(cv)}</div>
      </div>
      {(cv.coverLetterBody || '').split('\n\n').map((p, i) => <p key={i} style={{ fontSize: 13, lineHeight: 1.9, color: '#222', marginBottom: 16, textAlign: 'justify' }}>{p}</p>)}
    </div>
  )
}
