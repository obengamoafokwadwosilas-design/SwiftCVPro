'use client'

import { GeneratedCV, TemplateId } from '@/types'
import React, { useRef, useState, useLayoutEffect } from 'react'

// ════════════════════════════════════════════════════════════════
// CV PREVIEW — TRUE MULTI-PAGE PAGINATION ENGINE
// Measures content, packs into discrete A4 pages, each page gets its
// own full-height sidebar. Eliminates the white-gap problem entirely.
// Same paged DOM feeds both screen preview and PDF export.
// ════════════════════════════════════════════════════════════════

const TEMPLATE_MAP: Record<string, 'vertex' | 'sovereign' | 'meridian' | 'ascend' | 'harbour' | 'pulse' | 'classic'> = {
  vertex: 'vertex', atelier: 'vertex', editorial: 'vertex',
  sovereign: 'sovereign', newyork: 'sovereign', executive: 'sovereign',
  meridian: 'meridian', modern: 'meridian', europass: 'meridian', graduate: 'meridian',
  ascend: 'ascend',
  harbour: 'harbour', nordic: 'harbour',
  pulse: 'pulse', noir: 'pulse',
  classic: 'classic', academic: 'classic', london: 'classic',
}
const DEFAULT_ACCENT: Record<string, string> = {
  vertex: '#e0533d', sovereign: '#b08d3f', meridian: '#0d9488', ascend: '#1d4ed8', harbour: '#0f766e', pulse: '#6d4aff', classic: '#1a1a1a',
}
const BODY_SERIF = "'Cambria', Georgia, serif"
const BODY_SANS = "'Calibri', 'Segoe UI', sans-serif"

// A4 at 96dpi
const PAGE_W = 794
const PAGE_H = 1123

const contact = (cv: GeneratedCV) => [cv.location, cv.phone, cv.email, cv.linkedin].filter(Boolean).join('  •  ')
const isCL = (cv: GeneratedCV) => !!cv.coverLetterBody
const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

// ── A "block" is a measurable chunk of CV content ──
type Block = { key: string; node: React.ReactNode }

export default function CVPreview({ cv, templateId = 'meridian', accentColor }: { cv: GeneratedCV; templateId?: TemplateId; accentColor?: string | null }) {
  if (!cv) return null
  const design = TEMPLATE_MAP[templateId] || 'meridian'
  const A = accentColor ? `#${accentColor.replace('#', '')}` : DEFAULT_ACCENT[design]

  // Cover letters never paginate into columns — single flowing page(s)
  if (isCL(cv)) return <CoverLetter cv={cv} A={A} font={design === 'meridian' || design === 'ascend' || design === 'pulse' ? BODY_SANS : BODY_SERIF} />

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
          <ul style={{ margin: 0, paddingLeft: 18 }}>{e.bullets.map((b, j) => <li key={j} style={{ fontSize: 12, lineHeight: 1.7, color: '#333', marginBottom: 4 }}>{b}</li>)}</ul>
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
  const extra = (title: string, items?: string[]) => { if (items?.length) { blocks.push({ key: `${title}-h`, node: <div style={{ marginBottom: 4 }}>{sectionHeading(title, A, headStyle)}</div> }); items.forEach((x, i) => blocks.push({ key: `${title}-${i}`, node: <ul style={{ margin: 0, paddingLeft: 18, marginBottom: 4 }}><li style={{ fontSize: 11.5, lineHeight: 1.7, color: '#444' }}>{x}</li></ul> })) } }
  extra('Publications', cv.publications); extra('Research', cv.research); extra('Teaching Experience', cv.teaching)
  // skills + languages (single-column templates show inline here; sidebar templates put them in sidebar)
  if (opts?.skillsInline) {
    if (cv.skills?.length) blocks.push({ key: 'skills', node: <div style={{ marginBottom: 14 }}>{sectionHeading('Core Skills', A, headStyle)}<div style={{ fontSize: 12, color: '#333', lineHeight: 2 }}>{cv.skills.join('  •  ')}</div></div> })
    if (cv.languages?.length) blocks.push({ key: 'langs', node: <div style={{ marginBottom: 14 }}>{sectionHeading('Languages', A, headStyle)}<div style={{ fontSize: 12, color: '#333' }}>{cv.languages.join('  •  ')}</div></div> })
  }
  if (cv.additionalInfo) blocks.push({ key: 'addl', node: <div style={{ marginBottom: 14 }}>{sectionHeading('Additional Information', A, headStyle)}<p style={{ fontSize: 12, lineHeight: 1.75, color: '#333', margin: 0, whiteSpace: 'pre-line' }}>{cv.additionalInfo}</p></div> })
  return blocks
}

// ── Sidebar content (page 1 only) for sidebar templates ──
function SidebarContent({ cv, light }: { cv: GeneratedCV; light?: boolean }) {
  const head = (t: string) => <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.3)' }}>{t}</div>
  return (
    <>
      <div style={{ marginBottom: 26 }}>{head('Contact')}{[cv.phone, cv.email, cv.location, cv.linkedin].filter(Boolean).map((c, i) => <div key={i} style={{ fontSize: 11.5, marginBottom: 7, opacity: 0.95, wordBreak: 'break-word', lineHeight: 1.5 }}>{c}</div>)}</div>
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
  const [pages, setPages] = useState<number[][] | null>(null)

  useLayoutEffect(() => {
    let cancelled = false
    let raf = 0
    function paginate() {
      const el = measureRef.current
      if (!el) return
      const children = Array.from(el.children) as HTMLElement[]
      if (children.length !== blocks.length) return

      // accurate per-block height including vertical margins
      const heights = children.map(c => {
        const r = c.getBoundingClientRect()
        const cs = window.getComputedStyle(c)
        return r.height + parseFloat(cs.marginTop || '0') + parseFloat(cs.marginBottom || '0')
      })

      // real header height (page 1 only)
      const headerEl = el.parentElement?.querySelector('[data-measure-header]') as HTMLElement | null
      const headerH = headerEl ? headerEl.getBoundingClientRect().height : 0

      const usable = PAGE_H - config.contentPadV * 2
      const page1Usable = Math.max(120, usable - headerH)
      const result: number[][] = []
      let current: number[] = []
      let used = 0
      let limit = page1Usable
      const isHeading = (i: number) => blocks[i].key.endsWith('-h')

      for (let i = 0; i < blocks.length; i++) {
        const h = heights[i]
        // start a new page only if this page already has content AND the block won't fit
        if (current.length > 0 && used + h > limit) {
          result.push(current); current = []; used = 0; limit = usable
        }
        current.push(i)
        used += h
        // orphan protection: a heading must not be the last item if its first child won't fit
        if (isHeading(i) && i + 1 < blocks.length) {
          const nextH = heights[i + 1]
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
      if (!cancelled) setPages(result)
    }
    // measure ONCE after fonts are ready (heights are wrong before fonts load)
    const run = () => { raf = requestAnimationFrame(() => { if (!cancelled) paginate() }) }
    if ((document as any).fonts?.ready) {
      (document as any).fonts.ready.then(run)
    } else {
      run()
    }
    return () => { cancelled = true; cancelAnimationFrame(raf) }
  }, [cv, A, config.design]) // eslint-disable-line

  // ── MEASURE PASS (hidden) ──
  const measurePass = (
    <div data-measure-pass style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', left: -99999, top: 0, width: config.measureW }}>
      <div data-measure-header style={{ width: '100%' }}><config.Header cv={cv} A={A} /></div>
      <div ref={measureRef}>
        {blocks.map(b => <div key={b.key}>{b.node}</div>)}
      </div>
    </div>
  )

  // Before pagination resolves, render page 1 with everything (avoids flash of empty)
  const pagePlan = pages || [blocks.map((_, i) => i)]

  return (
    <div>
      {measurePass}
      {pagePlan.map((blockIdxs, pageIndex) => (
        <config.Frame key={pageIndex} cv={cv} A={A} pageIndex={pageIndex}>
          {blockIdxs.map(i => <div key={blocks[i].key}>{blocks[i].node}</div>)}
        </config.Frame>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// TEMPLATE CONFIGS
// ════════════════════════════════════════════════════════════════
const pageBase: React.CSSProperties = { width: PAGE_W, minHeight: PAGE_H, background: '#fff', margin: '0 auto 24px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden', pageBreakAfter: 'always' }

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
        cv.experience.forEach((e, i) => b.push({ key: `exp-${i}`, node: <div style={{ marginBottom: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{e.role}</div><div style={{ fontSize: 10.5, color: '#888', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</div></div><div style={{ fontSize: 12, color: A, fontWeight: 600, marginBottom: 6 }}>{e.company}</div><ul style={{ margin: 0, paddingLeft: 16 }}>{e.bullets.map((x, j) => <li key={j} style={{ fontSize: 12, lineHeight: 1.7, color: '#333', marginBottom: 5 }}>{x}</li>)}</ul></div> }))
      }
      if (cv.education?.length) {
        b.push({ key: 'edu-h', node: <div style={{ marginBottom: 4 }}>{head('Education')}</div> })
        cv.education.forEach((e, i) => b.push({ key: `edu-${i}`, node: <div style={{ marginBottom: 10 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div style={{ fontSize: 12.5, fontWeight: 700 }}>{e.qualification} in {e.field}</div><div style={{ fontSize: 10.5, color: '#888', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startYear} – {e.endYear}</div></div><div style={{ fontSize: 11.5, color: '#666' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div></div> }))
      }
      const ex = (t: string, items?: string[]) => { if (items?.length) { b.push({ key: `${t}-h`, node: <div style={{ marginBottom: 4 }}>{head(t)}</div> }); items.forEach((x, i) => b.push({ key: `${t}-${i}`, node: <ul style={{ margin: 0, paddingLeft: 16, marginBottom: 4 }}><li style={{ fontSize: 11.5, lineHeight: 1.7, color: '#333' }}>{x}</li></ul> })) } }
      ex('Publications', cv.publications); ex('Research', cv.research); ex('Teaching Experience', cv.teaching)
      if (cv.additionalInfo) b.push({ key: 'addl', node: <div>{head('Additional Information')}<p style={{ fontSize: 12, lineHeight: 1.75, color: '#333', margin: 0, whiteSpace: 'pre-line' }}>{cv.additionalInfo}</p></div> })
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
  pulse: {
    design: 'pulse', font: BODY_SERIF, contentPadV: 40, mainPad: '0 30px 40px 46px', sidebarW: 240, sidebarSide: 'right', measureW: 478,
    buildBlocks: (cv, A) => {
      const head = (t: string) => <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: A, marginBottom: 12 }}>{t}</div>
      const b: Block[] = []
      if (cv.summary) b.push({ key: 'summary', node: <div style={{ marginBottom: 24 }}>{head('Profile')}<p style={{ fontSize: 12.3, lineHeight: 1.8, color: '#444', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div> })
      if (cv.experience?.length) {
        b.push({ key: 'exp-h', node: <div style={{ marginBottom: 4 }}>{head('Experience')}</div> })
        cv.experience.forEach((e, i) => b.push({ key: `exp-${i}`, node: <div style={{ marginBottom: 17, paddingLeft: 16, borderLeft: `3px solid ${A}` }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}><span style={{ fontSize: 13.5, fontWeight: 700, color: '#15131f' }}>{e.role}</span><span style={{ fontSize: 10, color: '#999', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</span></div><div style={{ fontSize: 11.5, color: A, fontWeight: 700, margin: '2px 0 7px' }}>{e.company}</div><ul style={{ margin: 0, paddingLeft: 15 }}>{e.bullets.map((x, j) => <li key={j} style={{ fontSize: 11.5, lineHeight: 1.7, color: '#444', marginBottom: 4 }}>{x}</li>)}</ul></div> }))
      }
      const ex = (t: string, items?: string[]) => { if (items?.length) { b.push({ key: `${t}-h`, node: <div style={{ marginBottom: 4 }}>{head(t)}</div> }); items.forEach((x, i) => b.push({ key: `${t}-${i}`, node: <ul style={{ margin: 0, paddingLeft: 15, marginBottom: 4 }}><li style={{ fontSize: 11.5, lineHeight: 1.7, color: '#444' }}>{x}</li></ul> })) } }
      ex('Publications', cv.publications); ex('Research', cv.research); ex('Teaching Experience', cv.teaching)
      return b
    },
    Header: ({ cv, A }) => {
      const DARK = '#15131f'
      return (<>
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1, color: DARK }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ display: 'inline-block', background: A, color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', padding: '5px 16px', borderRadius: 20, margin: '10px 0 16px' }}>{cv.jobTitle}</div>}
        <div style={{ fontSize: 11.5, color: '#777', marginBottom: 8 }}>{contact(cv)}</div>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${A}, transparent)`, marginBottom: 26 }} />
      </>)
    },
    Frame: ({ cv, A, pageIndex, children }) => {
      const DARK = '#15131f'
      return (
        <div style={{ ...pageBase, fontFamily: BODY_SERIF, color: '#1a1a1a', background: `linear-gradient(90deg, #fff 0, #fff 554px, ${DARK} 554px, ${DARK} 100%)`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          {pageIndex === 0 && <div style={{ padding: '46px 46px 0' }}><TEMPLATES_CONFIG.pulse.Header cv={cv} A={A} /></div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px' }}>
            <div style={{ padding: pageIndex === 0 ? '0 30px 40px 46px' : '46px 30px 40px 46px' }}>{children}</div>
            <div style={{ color: '#fff', padding: '34px 26px' }}>
              {pageIndex === 0 && <PulseSidebar cv={cv} A={A} />}
            </div>
          </div>
        </div>
      )
    },
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
      const head = (t: string) => <div style={{ textAlign: 'center', marginBottom: 14 }}><span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: DARK, borderBottom: `1px solid ${A}`, paddingBottom: 4 }}>{t}</span></div>
      const b: Block[] = []
      if (cv.summary) b.push({ key: 'summary', node: <div style={{ marginBottom: 24 }}>{head('Profile')}<p style={{ fontSize: 12.5, lineHeight: 1.85, color: '#444', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div> })
      if (cv.experience?.length) {
        b.push({ key: 'exp-h', node: <div style={{ marginBottom: 4 }}>{head('Experience')}</div> })
        cv.experience.forEach((e, i) => b.push({ key: `exp-${i}`, node: <div style={{ marginBottom: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 14, fontWeight: 700, color: DARK }}>{e.role}</span><span style={{ fontSize: 10.5, color: A, fontStyle: 'italic', fontFamily: BODY_SANS }}>{e.startDate} – {e.endDate}</span></div><div style={{ fontSize: 12, color: A, fontStyle: 'italic', marginBottom: 7 }}>{e.company}</div><ul style={{ margin: 0, paddingLeft: 18 }}>{e.bullets.map((x, j) => <li key={j} style={{ fontSize: 11.8, lineHeight: 1.75, color: '#444', marginBottom: 5, fontFamily: BODY_SANS }}>{x}</li>)}</ul></div> }))
      }
      if (cv.education?.length) {
        b.push({ key: 'edu-h', node: <div style={{ marginBottom: 4 }}>{head('Education')}</div> })
        cv.education.forEach((e, i) => b.push({ key: `edu-${i}`, node: <div style={{ marginBottom: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div><div style={{ fontSize: 12.5, fontWeight: 700, color: DARK }}>{e.qualification} in {e.field}</div><div style={{ fontSize: 11.5, color: '#666', fontStyle: 'italic' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div></div><div style={{ fontSize: 10.5, color: A, fontStyle: 'italic', whiteSpace: 'nowrap', fontFamily: BODY_SANS }}>{e.startYear} – {e.endYear}</div></div> }))
      }
      if (cv.skills?.length) b.push({ key: 'skills', node: <div style={{ marginBottom: 20 }}>{head('Expertise')}<div style={{ textAlign: 'center', fontSize: 11.5, lineHeight: 1.95, color: '#444', fontFamily: BODY_SANS }}>{cv.skills.join('   ·   ')}</div>{!!cv.languages?.length && <div style={{ textAlign: 'center', fontSize: 11, color: '#666', marginTop: 8, fontFamily: BODY_SANS }}>{cv.languages.join('   ·   ')}</div>}</div> })
      if (cv.additionalInfo) b.push({ key: 'addl', node: <div>{head('Additional Information')}<p style={{ fontSize: 11.5, lineHeight: 1.75, color: '#444', margin: 0, textAlign: 'center', fontFamily: BODY_SANS, whiteSpace: 'pre-line' }}>{cv.additionalInfo}</p></div> })
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

function PulseSidebar({ cv, A }: { cv: GeneratedCV; A: string }) {
  const SH = ({ t }: { t: string }) => <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: A, marginBottom: 13 }}>{t}</div>
  return (
    <>
      {!!cv.skills?.length && <div style={{ marginBottom: 26 }}><SH t="Skills" /><ul style={{ margin: 0, paddingLeft: 14 }}>{cv.skills.map((s, i) => <li key={i} style={{ fontSize: 11.5, lineHeight: 1.9, color: 'rgba(255,255,255,0.85)' }}>{s}</li>)}</ul></div>}
      {!!cv.education?.length && <div style={{ marginBottom: 26 }}><SH t="Education" />{cv.education.map((e, i) => <div key={i} style={{ marginBottom: 9 }}><div style={{ fontSize: 11.8, fontWeight: 700, color: '#fff' }}>{e.qualification} {e.field}</div><div style={{ fontSize: 10.8, color: 'rgba(255,255,255,0.7)' }}>{e.institution}</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{e.startYear}–{e.endYear}{e.grade ? ` · ${e.grade}` : ''}</div></div>)}</div>}
      {!!cv.languages?.length && <div style={{ marginBottom: 26 }}><SH t="Languages" /><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{cv.languages.map((l, i) => <span key={i} style={{ fontSize: 10.5, background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '3px 11px', borderRadius: 14 }}>{l}</span>)}</div></div>}
      {cv.additionalInfo && <div><SH t="Certifications" /><div style={{ fontSize: 10.8, lineHeight: 1.7, color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-line' }}>{cv.additionalInfo}</div></div>}
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
