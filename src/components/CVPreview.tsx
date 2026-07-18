'use client'

import { GeneratedCV, TemplateId, ExtraSection } from '@/types'
import React, { useRef, useState, useLayoutEffect } from 'react'

// ── Extra sections (Publications, Leadership, Certifications, References, …) ──
// The model returns cv.extraSections: [{ heading, items[] }]. Each becomes its
// own heading with bulleted items. References render as tight lines (no bullets)
// for a dense block. Legacy cv.additionalInfo (labelled string) is converted so
// older sessions still render.
const SIDEBAR_HEADS = ['certifications', 'certification', 'memberships', 'membership', 'references', 'reference', 'awards', 'awards & recognition', 'licences', 'licenses', 'professional memberships']
function isSidebarHead(h: string) { return SIDEBAR_HEADS.includes((h || '').trim().toLowerCase()) }
function isRefsHead(h: string) { const t = (h || '').trim().toLowerCase(); return t === 'references' || t === 'reference' }

function legacyToSections(text?: string): ExtraSection[] {
  if (!text) return []
  const lines = String(text).split('\n').map(l => l.trim()).filter(Boolean)
  const out: ExtraSection[] = []
  lines.forEach(line => {
    const ci = line.indexOf(':')
    if (ci > 0 && ci <= 32) out.push({ heading: line.slice(0, ci).trim(), items: [line.slice(ci + 1).trim()].filter(Boolean) })
    else if (out.length) out[out.length - 1].items.push(line)
    else out.push({ heading: 'Additional Information', items: [line] })
  })
  return out
}
function getSections(cv: GeneratedCV): ExtraSection[] {
  const raw = cv as any
  return (raw.extraSections && raw.extraSections.length) ? raw.extraSections : legacyToSections(raw.additionalInfo)
}

// Interleave items with a bolder, accent-coloured separator dot (more visible than a plain ·).
function dotList(items: string[], color: string) {
  return (items || []).map((it, i) => <React.Fragment key={i}>{it}{i < items.length - 1 && <span style={{ color: color, fontWeight: 700, padding: '0 7px' }}>·</span>}</React.Fragment>)
}


// Render one section's body: tight lines for References, bullets otherwise.
function sectionBody(sec: ExtraSection, color: string) {
  if (isRefsHead(sec.heading)) {
    return <div style={{ fontSize: 13.5, lineHeight: 1.5, color }}>{sec.items.map((it, j) => <div key={j} style={{ marginBottom: 2 }}>{it}</div>)}</div>
  }
  return <ul style={{ margin: 0, paddingLeft: 18, listStyleType: 'disc', listStylePosition: 'outside' }}>{sec.items.map((it, j) => <li key={j} style={{ fontSize: 13.5, lineHeight: 1.5, color, marginBottom: 3 }}>{it}</li>)}</ul>
}

// MAIN-column blocks. When routeSidebar is true (two-column templates), short
// sections (certs/memberships/refs/awards) are skipped here — they go in the sidebar.
function extraMainBlocks(cv: GeneratedCV, headFn: (t: string) => React.ReactNode, routeSidebar: boolean, color?: string): Block[] {
  const out: Block[] = []
  getSections(cv).forEach((sec, i) => {
    if (!sec || !sec.items || !sec.items.length) return
    if (routeSidebar && isSidebarHead(sec.heading)) return
    out.push({ key: `extra-${i}-h`, node: <div style={{ marginBottom: 4 }}>{headFn(sec.heading)}</div> })
    sec.items.forEach((it, j) => {
      if (isRefsHead(sec.heading)) {
        out.push({ key: `extra-${i}-${j}`, node: <div style={{ fontSize: 13.5, lineHeight: 1.5, color: color || '#444', marginBottom: j === sec.items.length - 1 ? 12 : 2 }}>{it}</div> })
      } else {
        out.push({ key: `extra-${i}-${j}`, node: <ul style={{ margin: 0, paddingLeft: 18, marginBottom: j === sec.items.length - 1 ? 12 : 3, listStyleType: 'disc', listStylePosition: 'outside' }}><li style={{ fontSize: 13.5, lineHeight: 1.5, color: color || '#444' }}>{it}</li></ul> })
      }
    })
  })
  return out
}

// Short sections destined for a two-column sidebar.
// Sidebar routing: short factual sections live in the sidebar. The sidebar is
// now PAGINATED (it flows onto page 2's sidebar), so nothing can be clipped and
// no capacity budget is needed.
function extraSidebarSections(cv: GeneratedCV): ExtraSection[] {
  return getSections(cv).filter(sec => sec && sec.items && sec.items.length && isSidebarHead(sec.heading))
}// ════════════════════════════════════════════════════════════════
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
// Webfonts FIRST: they render identically in the user's browser (measurement)
// and in server-side headless Chrome (PDF). System fonts like Cambria don't exist
// on the Linux PDF server, which made PDF line-wrapping differ from what the
// paginator measured — the root cause of the gap/clip drift across templates.
const BODY_SERIF = "'Crimson Text', 'Cambria', Georgia, serif"
const BODY_SANS = "'Source Sans 3', 'Calibri', 'Segoe UI', sans-serif"

// A4 at 96dpi
const PAGE_W = 794
const PAGE_H = 1122

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

// ═══ SHARED PACKING ALGORITHM ═══════════════════════════════════════
// Extracted so it can run twice: once with hidden-measure-pass heights
// (fast first paint), then again with GROUND-TRUTH heights measured from
// the real on-screen document. If the two renders disagree about any
// block's height — whatever the cause — the second pass self-corrects
// the page plan, so pages fill the way the real render actually flows.
// Raised from 18 to 32 to match the safety margin ChatGPT set explicitly on
// vertex/sovereign/harbour/classic (34 on ascend). Templates without their own
// packBottomSafety override — meridian, sterling, slate, atlas — were still on
// the old 18px default, which left too little runway to absorb the small
// rendering differences between the browser (where pagination is measured)
// and Api2Pdf's separate remote Chrome instance (where the PDF is actually
// rendered) — the direct cause of text clipping at a page's bottom edge.
const PACK_BOTTOM_SAFETY = 32
// Fitting is strict: a block either fits inside the printable area or moves
// intact to the next page. Positive overflow tolerance was the reason a final
// line could be visible only halfway before the page frame clipped it.
const PACK_TOLERANCE = 0
// The screen preview and the remote PDF renderer can differ by a few pixels
// after font rasterisation. The final correction pass reserves this guard so
// the exported PDF never cuts through a sentence or skill line. Raised from
// 10 to 18 after a heading was still clipped at a page's bottom edge with
// the old value — that specific shape is now also closed structurally (see
// the heading/first-item pairing in packMainPlan), but the extra margin
// stays as a hedge against the underlying client-vs-remote-renderer drift.
const FINAL_RENDER_GUARD = 18

const packMainPlan = (keys: string[], heights: number[], page1Usable: number, usable: number, tolerance = PACK_TOLERANCE): number[][] => {
  const result: number[][] = []
  let current: number[] = []
  let used = 0
  let limit = page1Usable
  const isHeading = (i: number) => keys[i].endsWith('-h')

  // Flow every block independently. Headings are orphan-protected below, so an
  // experience header stays with its first bullet, but the entire role is never
  // pushed wholesale to a fresh page. That wholesale move was the main source
  // of large, avoidable white gaps.
  for (let i = 0; i < keys.length; i++) {
    const h = heights[i] || 0
    // A heading is checked together with its first following item, not in
    // isolation. Checking the heading alone let it be placed as the very
    // first thing on a fresh page even when its first item had no room to
    // follow — the post-hoc rescue below only ever fires when a heading
    // lands AFTER other content on the same page (current.length > 1), so a
    // heading starting a fresh page with nothing before it slipped through
    // uncaught, leaving it sitting alone with nothing under it. Pairing the
    // heading with its first item at placement time closes that gap by
    // construction, and also adds real headroom before a heading is ever
    // allowed to start a page, which cushions it against the small
    // client-vs-remote-renderer drift a heading's own height alone would not.
    const pairedH = (isHeading(i) && i + 1 < keys.length) ? h + (heights[i + 1] || 0) : h
    if (current.length > 0 && used + pairedH > limit + tolerance) {
      result.push(current); current = []; used = 0; limit = usable
    }
    current.push(i)
    used += h

    // Never leave a section/role heading alone at the bottom of a page.
    // Kept as a secondary safety net for cases the placement-time pairing
    // above doesn't cover (e.g. a heading with no following item at all).
    if (isHeading(i) && i + 1 < keys.length) {
      const nextH = heights[i + 1] || 0
      if (used + nextH > limit + tolerance && current.length > 1) {
        current.pop()
        used -= h
        result.push(current)
        current = [i]
        used = h
        limit = usable
      }
    }
  }
  if (current.length) result.push(current)

  // Widow-tail fix (capacity-checked, both directions) — GENERAL, not experience-only.
  // Recognizes any section built as "{group}-h" heading + "{group}-N" or
  // "{group}-bN" items (experience roles, skills chunks, summary chunks, and
  // any future section following the same convention all qualify automatically).
  const groupOf = (key: string) => {
    const bm = key.match(/^(.+)-b\d+$/)
    if (bm) return bm[1]
    const nm = key.match(/^(.+)-\d+$/)
    if (nm) return nm[1]
    return null
  }
  const roleOf = groupOf
  const pageLimit = (p: number) => (p === 0 ? page1Usable : usable)
  const pageUsed = result.map(pg => pg.reduce((t, i) => t + (heights[i] || 0), 0))

  for (let p = 0; p < result.length - 1; p++) {
    const prevPage = result[p]
    const nextPage = result[p + 1]
    if (!prevPage.length || !nextPage.length) continue
    const firstIdx = nextPage[0]
    const rk = roleOf(keys[firstIdx])
    if (!rk) continue
    const prevKey = keys[prevPage[prevPage.length - 1]]
    const sameRole = prevKey === `${rk}-h` || roleOf(prevKey) === rk
    if (!sameRole) continue
    let tailLen = 0
    while (tailLen < nextPage.length && roleOf(keys[nextPage[tailLen]]) === rk) tailLen++
    if (tailLen <= 2) {
      const tailH = nextPage.slice(0, tailLen).reduce((t, i) => t + (heights[i] || 0), 0)
      if (pageUsed[p] + tailH <= pageLimit(p) + tolerance) {
        for (let k = 0; k < tailLen; k++) prevPage.push(nextPage.shift() as number)
        pageUsed[p] += tailH; pageUsed[p + 1] -= tailH
        continue
      }
    }
    // Push-forward is the SAME rescue idea as pull-back, just in the other
    // direction — so it must be gated the same way: only for a genuinely
    // SMALL stranding (≤2 items), never for a long list (like several Skills
    // chunks) that is correctly, normally spanning two pages. Without this
    // gate, push-forward fired unconditionally whenever a boundary fell
    // inside ANY grouped section — even a large one with nothing wrong —
    // and kept yanking extra items off the previous page for zero benefit,
    // which is exactly what produced the large unnecessary gap.
    if (tailLen > 2) continue
    let moved = 0
    while (moved < 2) {
      const lastIdx = prevPage[prevPage.length - 1]
      if (roleOf(keys[lastIdx]) !== rk) break
      const beforeIdx = prevPage[prevPage.length - 2]
      const beforeKey = beforeIdx !== undefined ? keys[beforeIdx] : ''
      if (roleOf(beforeKey) !== rk) break
      const h = heights[lastIdx] || 0
      if (pageUsed[p + 1] + h > usable + tolerance) break
      prevPage.pop(); nextPage.unshift(lastIdx)
      pageUsed[p] -= h; pageUsed[p + 1] += h
      moved++
    }
  }
  // Balance compact list-style sections across a page break. A single final
  // education/skills/attribute item stranded at the top of the next page looks
  // accidental even when it is technically valid. Move one sibling item forward
  // so the continuation contains at least two items. This never changes the order
  // and only runs when the destination page still has room.
  const compactGroupOf = (key: string) => {
    if (/^edu-\d+$/.test(key)) return 'edu'
    if (/^skills-\d+$/.test(key)) return 'skills'
    if (/^attributes-\d+$/.test(key)) return 'attributes'
    const extra = key.match(/^(extra-\d+)-\d+$/)
    if (extra) return extra[1]
    const named = key.match(/^(Publications|Research|Teaching Experience)-\d+$/)
    return named ? named[1] : null
  }
  for (let p = 0; p < result.length - 1; p++) {
    const left = result[p]
    const right = result[p + 1]
    if (!left.length || !right.length) continue
    const group = compactGroupOf(keys[right[0]])
    if (!group || compactGroupOf(keys[left[left.length - 1]]) !== group) continue
    let rightCount = 0
    while (rightCount < right.length && compactGroupOf(keys[right[rightCount]]) === group) rightCount++
    if (rightCount !== 1) continue
    const moveIdx = left[left.length - 1]
    const beforeIdx = left[left.length - 2]
    // Keep at least one item with the section heading on the preceding page.
    if (beforeIdx === undefined || compactGroupOf(keys[beforeIdx]) !== group) continue
    const moveH = heights[moveIdx] || 0
    if (pageUsed[p + 1] + moveH > usable + tolerance) continue
    left.pop(); right.unshift(moveIdx)
    pageUsed[p] -= moveH; pageUsed[p + 1] += moveH
  }

  for (let p = result.length - 1; p >= 0; p--) { if (result[p].length === 0) result.splice(p, 1) }
  return result
}

const packSidePlan = (keys: string[], heights: number[], sLimit: number, tolerance = PACK_TOLERANCE): number[][] => {
  const sIsHeading = (i: number) => keys[i].endsWith('-h')
  const sideResult: number[][] = []
  let sCur: number[] = []; let sUsed = 0
  for (let i = 0; i < keys.length; i++) {
    const h = heights[i] || 0
    if (sCur.length > 0 && sUsed + h > sLimit + tolerance) { sideResult.push(sCur); sCur = []; sUsed = 0 }
    sCur.push(i); sUsed += h
    if (sIsHeading(i) && i + 1 < keys.length) {
      const nextH = heights[i + 1] || 0
      if (sUsed + nextH > sLimit && sCur.length > 1) { sCur.pop(); sideResult.push(sCur); sCur = [i]; sUsed = h }
    }
  }
  if (sCur.length) sideResult.push(sCur)
  return sideResult
}

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
  // OPTIONAL sidebar pagination: when provided, sidebar content is measured and
  // packed per page exactly like the main column, flowing onto page 2's sidebar
  // instead of clipping. sidebarMeasureW = inner width, sidebarPadV = top+bottom padding.
  buildSidebarBlocks?: (cv: GeneratedCV, A: string) => Block[]
  sidebarMeasureW?: number
  sidebarPadV?: number
  // Exact usable height for page 2+ (when contentPadV*2 doesn't match the actual rendered padding+borders)
  pageUsable?: number
  // For templates that wrap Header in an extra coloured banner div (onyx,
  // verde, crimson) — that wrapper's own padding is invisible to a measurement
  // that only measures the Header component itself, so page1Usable gets
  // over-estimated by exactly that padding. This makes the measure pass
  // apply the SAME padding, so headerH reflects the real space consumed.
  headerBannerPad?: string
  // Optional template-specific packing controls. Defaults preserve all existing templates.
  packTolerance?: number
  packBottomSafety?: number
  // ── RENDERER-OWNED PAGINATION (flow mode) ──────────────────────────────
  // When true, the PDF export renders this template as a SINGLE continuous
  // document and lets the PDF renderer itself choose the page breaks via CSS
  // (break-inside/break-after), instead of pre-packing blocks into fixed-height
  // sheets that can clip. Because the engine that decides the break is now the
  // same engine that draws it, the browser-vs-remote-renderer height drift that
  // clipped bottom-edge content becomes impossible — a block that doesn't fit is
  // flowed to the next sheet, never sliced. Only valid for single-column,
  // plain-background templates whose Frame is "header (page 1) + padded body"
  // with no per-page decoration (rails, borders, colour bands) and no sidebar.
  // The on-screen preview and the packer are unaffected — this only changes the
  // PDF path for flagged templates.
  flowPaginate?: boolean
  // Body text colour for the flow document wrapper (defaults to #1a1a1a).
  flowBodyColor?: string
  // render the page frame: header (page 1 only), children = packed main blocks,
  // sidebarChildren = this page's slice of the paginated sidebar (if enabled)
  Frame: (p: { cv: GeneratedCV; A: string; pageIndex: number; children: React.ReactNode; sidebarChildren?: React.ReactNode }) => React.ReactElement
  // build the ordered list of content blocks (main column)
  buildBlocks: (cv: GeneratedCV, A: string) => Block[]
  // page-1 header (name/title block) — used in Frame AND measured for accurate pagination
  Header: (p: { cv: GeneratedCV; A: string }) => React.ReactElement
}

// shared block builders for single-column-ish bodies
function sectionHeading(text: string, A: string, style: 'rule' | 'bar' | 'tick' | 'dash' | 'plain' = 'rule') {
  if (style === 'bar') return <div style={{ background: A, color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', padding: '7px 16px', marginBottom: 12 }}>{text}</div>
  if (style === 'tick') return <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#1a2a2a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ display: 'inline-block', width: 4, height: 16, background: A }} />{text}</div>
  if (style === 'dash') return <div style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#1c1c1c', marginBottom: 12 }}>— {text}</div>
  if (style === 'plain') return <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: A, marginBottom: 12 }}>{text}</div>
  return <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: A, borderBottom: `2px solid ${A}`, paddingBottom: 4, marginBottom: 10 }}>{text}</div>
}

// Pagination-safe body builder used by the curated template library.
// Every item that may wrap is its own measurable block. This prevents a page
// boundary from cutting through a bullet, skill row, qualification or reference.
function summaryChunks(text: string, maxChars = 320): string[] {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return []
  const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(s => s.trim()).filter(Boolean) || [cleaned]
  const chunks: string[] = []
  let current = ''
  sentences.forEach(sentence => {
    const candidate = current ? `${current} ${sentence}` : sentence
    if (current && candidate.length > maxChars) {
      chunks.push(current)
      current = sentence
    } else {
      current = candidate
    }
  })
  if (current) chunks.push(current)
  return chunks
}

function safeBullet(text: string, color = '#333') {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13.5, lineHeight: 1.68, color, marginBottom: 5, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <span aria-hidden="true" style={{ flex: '0 0 auto', lineHeight: 1.68 }}>•</span>
      <span style={{ flex: 1, minWidth: 0 }}>{text}</span>
    </div>
  )
}

function commonBlocks(cv: GeneratedCV, A: string, headStyle: any, opts?: { skillsInline?: boolean }): Block[] {
  const blocks: Block[] = []

  if (cv.summary) {
    blocks.push({ key: 'summary-h', node: <div style={{ marginBottom: 4 }}>{sectionHeading('Profile', A, headStyle)}</div> })
    blocks.push({
      key: 'summary',
      node: <p style={{ fontSize: 14, lineHeight: 1.78, color: '#333', textAlign: 'justify', margin: 0, marginBottom: 18 }}>{cv.summary}</p>
    })
  }

  if (cv.experience?.length) {
    blocks.push({ key: 'exp-h', node: <div style={{ marginBottom: 4 }}>{sectionHeading('Professional Experience', A, headStyle)}</div> })
    cv.experience.forEach((e, i) => {
      const dates = [e.startDate, e.endDate].filter(Boolean).join(' – ')
      blocks.push({
        key: `exp${i}-h`,
        node: (
          <div style={{ marginBottom: 6, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, minWidth: 0 }}>{e.role}</div>
              {dates && <div style={{ fontSize: 12.5, color: '#777', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{dates}</div>}
            </div>
            {e.company && <div style={{ fontSize: 13.5, color: A, fontWeight: 600, fontStyle: 'italic' }}>{e.company}</div>}
          </div>
        )
      })
      ;(e.bullets || []).forEach((x, j) => blocks.push({
        key: `exp${i}-b${j}`,
        node: <div style={{ marginBottom: j === e.bullets.length - 1 ? 12 : 0 }}>{safeBullet(x)}</div>
      }))
    })
  }

  if (cv.education?.length) {
    blocks.push({ key: 'edu-h', node: <div style={{ marginBottom: 4 }}>{sectionHeading('Education', A, headStyle)}</div> })
    cv.education.forEach((e, i) => {
      const dates = [e.startYear, e.endYear].filter(Boolean).join(' – ')
      const qualification = `${e.qualification || ''}${e.field ? ` in ${e.field}` : ''}`.trim()
      blocks.push({
        key: `edu-${i}`,
        node: (
          <div style={{ marginBottom: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{qualification}</div>
              <div style={{ fontSize: 13.5, color: '#666', fontStyle: 'italic' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div>
            </div>
            {dates && <div style={{ fontSize: 12.5, color: '#777', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{dates}</div>}
          </div>
        )
      })
    })
  }

  const addNamedList = (title: string, items?: string[]) => {
    if (!items?.length) return
    blocks.push({ key: `${title}-h`, node: <div style={{ marginBottom: 4 }}>{sectionHeading(title, A, headStyle)}</div> })
    items.forEach((x, i) => blocks.push({ key: `${title}-${i}`, node: <div style={{ marginBottom: i === items.length - 1 ? 12 : 0 }}>{safeBullet(x, '#444')}</div> }))
  }
  addNamedList('Publications', cv.publications)
  addNamedList('Research', cv.research)
  addNamedList('Teaching Experience', cv.teaching)

  if (opts?.skillsInline) {
    if (cv.skills?.length) {
      blocks.push({ key: 'skills-h', node: <div style={{ marginBottom: 4 }}>{sectionHeading('Core Skills', A, headStyle)}</div> })
      for (let i = 0; i < cv.skills.length; i += 3) {
        const chunk = cv.skills.slice(i, i + 3)
        blocks.push({
          key: `skills-${i / 3}`,
          node: <div style={{ fontSize: 13.5, color: '#333', lineHeight: 1.85, marginBottom: i + 3 >= cv.skills.length ? 13 : 2, breakInside: 'avoid', pageBreakInside: 'avoid' }}>{dotList(chunk, A)}</div>
        })
      }
    }

    if (cv.attributes?.length) {
      blocks.push({ key: 'attributes-h', node: <div style={{ marginBottom: 4 }}>{sectionHeading('Professional Attributes', A, headStyle)}</div> })
      cv.attributes.forEach((a, i) => blocks.push({
        key: `attributes-${i}`,
        node: <div style={{ marginBottom: i === cv.attributes!.length - 1 ? 12 : 0 }}>{safeBullet(a)}</div>
      }))
    }

    if (cv.languages?.length) {
      blocks.push({ key: 'langs-h', node: <div style={{ marginBottom: 4 }}>{sectionHeading('Languages', A, headStyle)}</div> })
      for (let i = 0; i < cv.languages.length; i += 4) {
        const chunk = cv.languages.slice(i, i + 4)
        blocks.push({
          key: `langs-${i / 4}`,
          node: <div style={{ fontSize: 13.5, color: '#333', lineHeight: 1.75, marginBottom: i + 4 >= cv.languages.length ? 13 : 2, breakInside: 'avoid', pageBreakInside: 'avoid' }}>{dotList(chunk, A)}</div>
        })
      }
    }
  }

  getSections(cv).forEach((sec, i) => {
    if (!sec?.items?.length) return
    blocks.push({ key: `extra-${i}-h`, node: <div style={{ marginBottom: 4 }}>{sectionHeading(sec.heading, A, headStyle)}</div> })
    sec.items.forEach((item, j) => blocks.push({
      key: `extra-${i}-${j}`,
      node: isRefsHead(sec.heading)
        ? <div style={{ fontSize: 13.5, lineHeight: 1.55, color: '#333', marginBottom: j === sec.items.length - 1 ? 12 : 4, breakInside: 'avoid', pageBreakInside: 'avoid' }}>{item}</div>
        : <div style={{ marginBottom: j === sec.items.length - 1 ? 12 : 0 }}>{safeBullet(item)}</div>
    }))
  })

  return blocks
}

// ════════════════════════════════════════════════════════════════
// THE PAGINATION ENGINE
// ════════════════════════════════════════════════════════════════
function Paginated({ cv, A, config }: { cv: GeneratedCV; A: string; config: TemplateConfig }) {
  const blocks = config.buildBlocks(cv, A)
  const sideBlocks = config.buildSidebarBlocks ? config.buildSidebarBlocks(cv, A) : []
  const measureRef = useRef<HTMLDivElement>(null)
  const sideMeasureRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<number[][] | null>(null)
  const screenDocRef = useRef<HTMLDivElement>(null)
  const limitsRef = useRef<{ page1Usable: number; usable: number; sLimit: number } | null>(null)
  const correctionsRef = useRef(0)
  const [sidePages, setSidePages] = useState<number[][] | null>(null)
  // Signals to the PDF export flow (app/preview/page.tsx) that the ground-truth
  // self-correction pass below has finished — either it converged (the plan
  // matches the real render) or it exhausted its 2-round budget. Export waits
  // for this attribute instead of guessing a fixed number of frames, which is
  // what let the conservative first-pass plan (see measurePass comment further
  // down) leak into exported PDFs as unnecessary early page breaks.
  const wrapperRef = useRef<HTMLDivElement>(null)
  const markPaginationReady = () => { if (wrapperRef.current) wrapperRef.current.setAttribute('data-pagination-ready', 'true') }

  useLayoutEffect(() => {
    let cancelled = false
    let raf = 0
    correctionsRef.current = 0
    if (wrapperRef.current) wrapperRef.current.removeAttribute('data-pagination-ready')

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
        // Extra breathing room beyond the page's own padding, so content never packs
        // to the literal edge of the printable area — reads like a real printed page.
        const bottomSafety = config.packBottomSafety ?? PACK_BOTTOM_SAFETY
        const tolerance = Math.min(0, config.packTolerance ?? PACK_TOLERANCE)
        const usable = (config.pageUsable ?? (PAGE_H - config.contentPadV * 2)) - bottomSafety
        const page1Usable = Math.max(160, usable - headerH)
        limitsRef.current = { page1Usable, usable, sLimit: PAGE_H - (config.sidebarPadV ?? config.contentPadV) * 2 - bottomSafety }
        const result = packMainPlan(blocks.map(b => b.key), heights, page1Usable, usable, tolerance)

        // ── Sidebar pagination (shared algorithm, sidebar heights/budget) ──
        let sideResult: number[][] | null = null
        const sEl = sideMeasureRef.current
        if (config.buildSidebarBlocks && sEl) {
          const sChildren = Array.from(sEl.children) as HTMLElement[]
          if (sChildren.length === sideBlocks.length && sideBlocks.length > 0) {
            const sHeights = sChildren.map(c => {
              const r = c.getBoundingClientRect()
              let m = 0
              try { const cs = window.getComputedStyle(c); m = (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0) } catch { m = 0 }
              return r.height + m
            })
            const sLimit = PAGE_H - (config.sidebarPadV ?? config.contentPadV) * 2 - bottomSafety
            sideResult = packSidePlan(sideBlocks.map(b => b.key), sHeights, sLimit, tolerance)
          }
        }
        if (result.length === 0) result.push(blocks.map((_, i) => i))
        if (!cancelled) setPages(result)
        if (!cancelled) setSidePages(sideResult)
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

  // ═══ GROUND-TRUTH SELF-CORRECTION ═══════════════════════════════
  // The hidden measure pass gives a fast first plan, but it is a SEPARATE
  // render — if it disagrees with the real document about any block's height
  // (fonts, inheritance, wrapping…), pages break in the wrong place: early
  // (big gaps) or late (clipping). This pass measures the REAL on-screen
  // document — the same nodes the reader sees — using sibling strides
  // (nextTop − selfTop), which capture true rendered spacing including
  // collapsed margins. It re-packs with those truths and corrects the plan
  // if it differs. Runs at most twice per CV to guarantee no update loops.
  useLayoutEffect(() => {
    if (!pages || !limitsRef.current) return
    if (correctionsRef.current >= 2) { markPaginationReady(); return }
    const root = screenDocRef.current
    if (!root) { markPaginationReady(); return }
    try {
      const els = Array.from(root.querySelectorAll('[data-bk]')) as HTMLElement[]
      if (els.length !== blocks.length || blocks.length === 0) { markPaginationReady(); return }
      const trueHeights = els.map((el, i) => {
        const r = el.getBoundingClientRect()
        if (i + 1 < els.length) {
          const stride = els[i + 1].getBoundingClientRect().top - r.top
          // strides can be 0 during odd intermediate layouts; fall back to rect
          return stride > 0 ? stride : r.height
        }
        return r.height
      })
      const { page1Usable, usable, sLimit } = limitsRef.current
      // Final pass is deliberately stricter than the first measurement pass.
      // It uses the real rendered block heights, permits no positive overflow,
      // and keeps a small renderer guard. Therefore a complete bullet/chunk is
      // moved to the next page instead of being clipped halfway in the PDF.
      const correctionTolerance = Math.min(0, config.packTolerance ?? PACK_TOLERANCE)
      const strictPage1Usable = Math.max(120, page1Usable - FINAL_RENDER_GUARD)
      const strictUsable = Math.max(120, usable - FINAL_RENDER_GUARD)
      const newMain = packMainPlan(blocks.map(b => b.key), trueHeights, strictPage1Usable, strictUsable, correctionTolerance)

      let newSide: number[][] | null = null
      if (config.buildSidebarBlocks && sideBlocks.length) {
        const sEls = Array.from(root.querySelectorAll('[data-sbk]')) as HTMLElement[]
        if (sEls.length === sideBlocks.length) {
          const sTrue = sEls.map((el, i) => {
            const r = el.getBoundingClientRect()
            if (i + 1 < sEls.length) {
              const stride = sEls[i + 1].getBoundingClientRect().top - r.top
              return stride > 0 ? stride : r.height
            }
            return r.height
          })
          newSide = packSidePlan(sideBlocks.map(b => b.key), sTrue, Math.max(120, sLimit - FINAL_RENDER_GUARD), correctionTolerance)
        }
      }

      const mainChanged = JSON.stringify(newMain) !== JSON.stringify(pages)
      const sideChanged = newSide !== null && JSON.stringify(newSide) !== JSON.stringify(sidePages)
      if (mainChanged || sideChanged) {
        correctionsRef.current++
        if (mainChanged) setPages(newMain)
        if (sideChanged) setSidePages(newSide)
        // not settled yet — the state update above re-triggers this effect,
        // which will mark ready once it converges or hits the round cap
      } else {
        markPaginationReady()
      }
    } catch {
      // correction is best-effort; the first-pass plan still stands, but the
      // export flow must never wait forever for a signal that will never come
      markPaginationReady()
    }
  }, [pages, sidePages]) // eslint-disable-line

  // Hidden measure pass — renders real header + all blocks at exact column width
  const measurePass = (
    <div data-measure-pass aria-hidden="true" style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', left: -99999, top: 0, width: config.measureW, fontFamily: config.font }}>
      <div ref={headerRef} style={{ width: '100%', boxSizing: 'border-box', padding: config.headerBannerPad ?? 0 }}><config.Header cv={cv} A={A} /></div>
      {/* flow-root wrappers CONTAIN inner margins, so measured heights include the
          spacing that would otherwise margin-collapse through and be invisible to the
          packer (the cause of sidebar bottom-edge clipping). Real render collapses
          adjacent margins to the max ≤ our counted sum, so we only ever break EARLIER
          than strictly needed — never later. Safe by construction. */}
      <div ref={measureRef}>
        {blocks.map(b => <div key={b.key} style={{ display: 'flow-root' }}>{b.node}</div>)}
      </div>
      {config.buildSidebarBlocks && (
        <div style={{ width: config.sidebarMeasureW ?? 200 }}>
          <div ref={sideMeasureRef}>
            {sideBlocks.map(b => <div key={b.key} style={{ display: 'flow-root' }}>{b.node}</div>)}
          </div>
        </div>
      )}
    </div>
  )

  // Until pagination resolves, render everything on page 1 (correct for 1-page CVs, no flash)
  let pagePlan = (pages && pages.length > 0) ? pages : [blocks.map((_, i) => i)]
  const sidePlan: number[][] = (sidePages && sidePages.length > 0) ? sidePages : (sideBlocks.length ? [sideBlocks.map((_, i) => i)] : [])
  // If the sidebar needs more pages than the main column, add empty main pages so nothing is lost.
  if (sidePlan.length > pagePlan.length) {
    pagePlan = [...pagePlan, ...Array.from({ length: sidePlan.length - pagePlan.length }, () => [] as number[])]
  }
  const sideSlice = (pageIndex: number): React.ReactNode =>
    config.buildSidebarBlocks
      ? (sidePlan[pageIndex] || []).map(i => sideBlocks[i] ? <div key={sideBlocks[i].key}>{sideBlocks[i].node}</div> : null)
      : undefined

  return (
    <div ref={wrapperRef}>
      {/* On screen, hide the paged frames and show only the continuous doc.
          In print/PDF (buildPdfHtml uses print media) this rule does NOT apply,
          so the real pages render — the download is unchanged. */}
      <style>{`@media screen { #cv-print-area > div > div:not([data-screen-doc]):not([data-measure-pass]) { display: none !important; } }`}</style>
      {measurePass}
      {/* SCREEN: one continuous document — every block in a single frame, so there
          are no inter-page padding/margin seams and no trailing empty space. */}
      <div data-screen-doc ref={screenDocRef}>
        <config.Frame cv={cv} A={A} pageIndex={0} sidebarChildren={config.buildSidebarBlocks ? sideBlocks.map(b => <div key={b.key} data-sbk={b.key}>{b.node}</div>) : undefined}>
          {blocks.map(b => <div key={b.key} data-bk={b.key}>{b.node}</div>)}
        </config.Frame>
      </div>
      {/* PRINT/PDF: the real A4 pages. Captured by buildPdfHtml, hidden on screen. */}
      {pagePlan.map((blockIdxs, pageIndex) => (
        <config.Frame key={pageIndex} cv={cv} A={A} pageIndex={pageIndex} sidebarChildren={sideSlice(pageIndex)}>
          {blockIdxs.map(i => blocks[i] ? <div key={blocks[i].key}>{blocks[i].node}</div> : null)}
        </config.Frame>
      ))}
      {/* PRINT/PDF (flow templates only): a single continuous document the PDF
          renderer paginates itself via CSS break rules. buildPdfHtml shows this
          and hides the packed frames above for flow templates; on screen it is
          hidden by the same rule that hides the packed frames. Vertical page
          spacing comes from @page margins in buildPdfHtml, so this wrapper only
          carries the horizontal padding — hence no vertical padding here. */}
      {config.flowPaginate && (
        <div data-flow-doc style={{ width: '100%', background: '#fff', fontFamily: config.font, color: config.flowBodyColor ?? '#1a1a1a' }}>
          <config.Header cv={cv} A={A} />
          {blocks.map(b => (
            <div key={b.key} data-flow-block="" data-flow-head={b.key.endsWith('-h') ? '' : undefined}>
              {b.node}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Flow-pagination export config ────────────────────────────────
// Read by app/preview/page.tsx's buildPdfHtml to decide, per template, whether
// to emit the renderer-owned (flow) PDF layout instead of the packed fixed-page
// layout, and with what @page margins. Returns null for every template still on
// the packer, so those PDFs are byte-for-byte unchanged.
export function getFlowPdfConfig(templateId: TemplateId): { padTop: number; padBottom: number; padSide: number } | null {
  const design = TEMPLATE_MAP[templateId] || 'meridian'
  const config = TEMPLATES_CONFIG[design]
  if (!config?.flowPaginate) return null
  const parts = config.mainPad.split(/\s+/).map(p => parseFloat(p) || 0)
  const padSide = parts.length >= 2 ? parts[1] : (parts[0] || 0)
  return { padTop: config.contentPadV, padBottom: config.contentPadV, padSide }
}


// ── Paginated sidebar block builders ─────────────────────────────
// Same content as the old monolithic sidebars, split into measurable blocks
// (headings keyed "-h" so the packer keeps them with their first item).
function meridianSidebarBlocks(cv: GeneratedCV, A: string): Block[] {
  const head = (t: string) => <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' as const, borderBottom: '1px solid rgba(255,255,255,0.35)', paddingBottom: 6, marginBottom: 12 }}>{t}</div>
  const b: Block[] = []
  b.push({ key: 'sb-contact-h', node: head('Contact') })
  ;[cv.phone, cv.email, cv.location, cv.linkedin].filter(Boolean).forEach((c, i) => b.push({ key: `sb-contact-${i}`, node: <div style={{ fontSize: 13.5, marginBottom: 7, opacity: 0.95, wordBreak: 'break-word' as const, lineHeight: 1.5 }}>{c}</div> }))
  b.push({ key: 'sb-sp1', node: <div style={{ height: 14 }} /> })
  if (cv.education?.length) {
    b.push({ key: 'sb-edu-h', node: head('Education') })
    cv.education.forEach((e, i) => b.push({ key: `sb-edu-${i}`, node: <div style={{ marginBottom: 11, fontSize: 13.5, opacity: 0.95, lineHeight: 1.45 }}><div style={{ fontWeight: 700 }}>{e.qualification}{e.field ? ` in ${e.field}` : ''}</div><div style={{ opacity: 0.85 }}>{e.institution}</div><div style={{ opacity: 0.7, fontSize: 12 }}>{e.startYear} – {e.endYear}{e.grade ? ` · ${e.grade}` : ''}</div></div> }))
    b.push({ key: 'sb-sp2', node: <div style={{ height: 14 }} /> })
  }
  if (cv.skills?.length) {
    b.push({ key: 'sb-skills-h', node: head('Skills') })
    cv.skills.forEach((sk, i) => b.push({ key: `sb-skill-${i}`, node: <div style={{ fontSize: 13.5, marginBottom: 7, opacity: 0.95, display: 'flex', gap: 7 }}><span style={{ opacity: 0.7 }}>›</span><span>{sk}</span></div> }))
    b.push({ key: 'sb-sp3', node: <div style={{ height: 14 }} /> })
  }
  if (cv.languages?.length) {
    b.push({ key: 'sb-lang-h', node: head('Languages') })
    cv.languages.forEach((l, i) => b.push({ key: `sb-lang-${i}`, node: <div style={{ fontSize: 13.5, marginBottom: 7, opacity: 0.95 }}>{l}</div> }))
    b.push({ key: 'sb-sp4', node: <div style={{ height: 14 }} /> })
  }
  extraSidebarSections(cv).forEach((sec, i) => {
    b.push({ key: `sb-x${i}-h`, node: head(sec.heading) })
    sec.items.forEach((it, j) => b.push({ key: `sb-x${i}-${j}`, node: <div style={{ fontSize: 13.5, marginBottom: 7, opacity: 0.95, lineHeight: 1.45 }}>{it}</div> }))
    b.push({ key: `sb-x${i}-sp`, node: <div style={{ height: 14 }} /> })
  })
  return b
}

function sterlingSidebarBlocks(cv: GeneratedCV, A: string): Block[] {
  const SH = (t: string) => <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: 5, marginBottom: 10 }}>{t}</div>
  const b: Block[] = []
  b.push({ key: 'sb-contact-h', node: SH('Contact') })
  b.push({ key: 'sb-contact', node: <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, wordBreak: 'break-word' as const }}>{[cv.phone, cv.email, cv.location, cv.linkedin].filter(Boolean).map((x, i) => <div key={i}>{x}</div>)}</div> })
  b.push({ key: 'sb-sp1', node: <div style={{ height: 18 }} /> })
  if (cv.education?.length) {
    b.push({ key: 'sb-edu-h', node: SH('Education') })
    cv.education.forEach((e, i) => b.push({ key: `sb-edu-${i}`, node: <div style={{ marginBottom: 10 }}><div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>{e.qualification}{e.field ? ` in ${e.field}` : ''}</div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{e.institution}</div><div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.62)' }}>{e.startYear} – {e.endYear}{e.grade ? ` · ${e.grade}` : ''}</div></div> }))
    b.push({ key: 'sb-sp2', node: <div style={{ height: 18 }} /> })
  }
  if (cv.skills?.length) {
    b.push({ key: 'sb-skills-h', node: SH('Skills') })
    cv.skills.forEach((sk, i) => b.push({ key: `sb-skill-${i}`, node: <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 5 }}>{sk}</div> }))
    b.push({ key: 'sb-sp3', node: <div style={{ height: 18 }} /> })
  }
  if (cv.languages?.length) {
    b.push({ key: 'sb-lang-h', node: SH('Languages') })
    cv.languages.forEach((l, i) => b.push({ key: `sb-lang-${i}`, node: <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 5 }}>{l}</div> }))
    b.push({ key: 'sb-sp4', node: <div style={{ height: 18 }} /> })
  }
  extraSidebarSections(cv).forEach((sec, i) => {
    b.push({ key: `sb-x${i}-h`, node: SH(sec.heading) })
    sec.items.forEach((it, j) => b.push({ key: `sb-x${i}-${j}`, node: <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 5, lineHeight: 1.5 }}>{it}</div> }))
    b.push({ key: `sb-x${i}-sp`, node: <div style={{ height: 18 }} /> })
  })
  return b
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
    design: 'meridian', font: BODY_SERIF, contentPadV: 40, mainPad: '40px 32px', sidebarW: 262, sidebarSide: 'left', measureW: 468, buildSidebarBlocks: meridianSidebarBlocks, sidebarMeasureW: 210, sidebarPadV: 40,
    buildBlocks: (cv, A) => {
      const head = (t: string) => <div style={{ fontSize: 14.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: A, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>{t}<span style={{ flex: 1, height: 2, background: A, opacity: 0.25 }} /></div>
      const b: Block[] = []
      if (cv.summary) b.push({ key: 'summary', node: <div style={{ marginBottom: 22 }}>{head('Profile')}<p style={{ fontSize: 14, lineHeight: 1.8, color: '#333', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div> })
      if (cv.experience?.length) {
        b.push({ key: 'exp-h', node: <div style={{ marginBottom: 4 }}>{head('Experience')}</div> })
        cv.experience.forEach((e, i) => {
          // role header keyed "-h" → the packer keeps it with its first bullet;
          // bullets are separate blocks so a long role FLOWS across pages instead
          // of jumping wholesale and leaving a large gap.
          b.push({ key: `exp${i}-h`, node: <div style={{ marginBottom: 6 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div style={{ fontSize: 15, fontWeight: 700 }}>{e.role}</div><div style={{ fontSize: 12, color: '#888', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</div></div><div style={{ fontSize: 13.5, color: A, fontWeight: 600 }}>{e.company}</div></div> })
          e.bullets.forEach((x, j) => b.push({ key: `exp${i}-b${j}`, node: <ul style={{ margin: 0, paddingLeft: 16, marginBottom: j === e.bullets.length - 1 ? 14 : 0, listStyleType: 'disc', listStylePosition: 'outside' }}><li style={{ fontSize: 13.5, lineHeight: 1.7, color: '#333', marginBottom: 5 }}>{x}</li></ul> }))
        })
      }
      // Education is rendered in the sidebar for this two-column template.
      const ex = (t: string, items?: string[]) => { if (items?.length) { b.push({ key: `${t}-h`, node: <div style={{ marginBottom: 4 }}>{head(t)}</div> }); items.forEach((x, i) => b.push({ key: `${t}-${i}`, node: <ul style={{ margin: 0, paddingLeft: 16, marginBottom: 4, listStyleType: 'disc', listStylePosition: 'outside' }}><li style={{ fontSize: 13.5, lineHeight: 1.7, color: '#333' }}>{x}</li></ul> })) } }
      ex('Publications', cv.publications); ex('Research', cv.research); ex('Teaching Experience', cv.teaching)
      if (cv.attributes?.length) b.push({ key: 'attributes', node: <div style={{ marginBottom: 14 }}>{head('Professional Attributes')}<ul style={{ margin: 0, paddingLeft: 18, listStyleType: 'disc', listStylePosition: 'outside' }}>{cv.attributes.map((a, i) => <li key={i} style={{ fontSize: 13.5, lineHeight: 1.55, color: '#444', marginBottom: 4 }}>{a}</li>)}</ul></div> })
      extraMainBlocks(cv, (t) => head(t), true, '#444').forEach(bl => b.push(bl))
      return b
    },
    Header: ({ cv, A }) => (<><div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1, color: '#1a1a1a', marginBottom: 4 }}>{cv.fullName}</div>{cv.jobTitle && <div style={{ fontSize: 15.5, color: A, fontWeight: 600, letterSpacing: 0.5, marginBottom: 22, textTransform: 'uppercase' }}>{cv.jobTitle}</div>}</>),
    Frame: ({ cv, A, pageIndex, children, sidebarChildren }) => (
      <div style={{ ...pageBase, display: 'grid', gridTemplateColumns: '262px 1fr', fontFamily: BODY_SERIF, color: '#1a1a1a', background: `linear-gradient(90deg, ${A} 0, ${A} 262px, #fff 262px, #fff 100%)`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        <div style={{ color: '#fff', padding: '40px 26px' }}>{sidebarChildren}</div>
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
    design: 'onyx', headerBannerPad: '38px 46px 30px', font: BODY_SERIF, contentPadV: 30, pageUsable: 1047, mainPad: '30px 46px', sidebarW: 0, sidebarSide: 'none', measureW: 702,
    buildBlocks: (cv, A) => {
      const head = (t: string) => <div style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: A, marginBottom: 10 }}>{t}</div>
      const b: Block[] = []
      if (cv.summary) b.push({ key: 'summary', node: <div style={{ marginBottom: 22 }}>{head('Profile')}<p style={{ fontSize: 14, lineHeight: 1.8, color: '#444', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div> })
      if (cv.experience?.length) {
        b.push({ key: 'exp-h', node: <div style={{ marginBottom: 4 }}>{head('Experience')}</div> })
        cv.experience.forEach((e, i) => {
          // split: header (-h, orphan-protected) + per-bullet blocks → roles FLOW across pages
          b.push({ key: `exp${i}-h`, node: <div style={{ marginBottom: 6 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><span style={{ fontWeight: 700, fontSize: 15, color: darken(A, 0.72) }}>{e.role}</span><span style={{ fontSize: 12, color: '#999', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</span></div><div style={{ fontSize: 13.5, color: A, fontWeight: 600, marginBottom: 6 }}>{e.company}</div></div> })
          e.bullets.forEach((x, j) => b.push({ key: `exp${i}-b${j}`, node: <ul style={{ margin: 0, paddingLeft: 16, listStyleType: 'disc', listStylePosition: 'outside', marginBottom: j === e.bullets.length - 1 ? 15 : 0 }}><li style={{ fontSize: 13.5, lineHeight: 1.7, color: '#444', marginBottom: 4 }}>{x}</li></ul> }))
        })
      }
      if (cv.education?.length) {
        b.push({ key: 'edu-h', node: <div style={{ marginBottom: 4 }}>{head('Education')}</div> })
        cv.education.forEach((e, i) => b.push({ key: `edu-${i}`, node: <div style={{ marginBottom: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div><div style={{ fontSize: 14, fontWeight: 700, color: darken(A, 0.72) }}>{e.qualification} in {e.field}</div><div style={{ fontSize: 13.5, color: '#666', fontStyle: 'italic' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div></div><div style={{ fontSize: 12, color: A, fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startYear} – {e.endYear}</div></div> }))
      }
      if (cv.skills?.length) b.push({ key: 'skills', node: <div style={{ marginBottom: 14 }}>{head('Core Skills')}<div style={{ fontSize: 13.5, color: '#444', lineHeight: 2 }}>{dotList(cv.skills, A)}</div></div> })
      if (cv.attributes?.length) b.push({ key: 'attributes', node: <div style={{ marginBottom: 14 }}>{head('Professional Attributes')}<ul style={{ margin: 0, paddingLeft: 18, listStyleType: 'disc', listStylePosition: 'outside' }}>{cv.attributes.map((a, i) => <li key={i} style={{ fontSize: 13.5, lineHeight: 1.55, color: '#444', marginBottom: 4 }}>{a}</li>)}</ul></div> })
      if (cv.languages?.length) b.push({ key: 'langs', node: <div style={{ marginBottom: 14 }}>{head('Languages')}<div style={{ fontSize: 13.5, color: '#444' }}>{dotList(cv.languages, A)}</div></div> })
      const ex = (t: string, items?: string[]) => { if (items?.length) { b.push({ key: `${t}-h`, node: <div style={{ marginBottom: 4 }}>{head(t)}</div> }); items.forEach((x, i) => b.push({ key: `${t}-${i}`, node: <ul style={{ margin: 0, paddingLeft: 16, marginBottom: 4, listStyleType: 'disc', listStylePosition: 'outside' }}><li style={{ fontSize: 13.5, lineHeight: 1.7, color: '#444' }}>{x}</li></ul> })) } }
      ex('Publications', cv.publications); ex('Research', cv.research); ex('Teaching Experience', cv.teaching)
      extraMainBlocks(cv, (t) => head(t), false, '#444').forEach(bl => b.push(bl))
      return b
    },
    Header: ({ cv, A }) => (<>
      <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1, color: '#fff' }}>{cv.fullName}</div>
      {cv.jobTitle && <div style={{ fontSize: 15.5, letterSpacing: 3, textTransform: 'uppercase', color: A, marginTop: 8 }}>{cv.jobTitle}</div>}
      <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', marginTop: 12 }}>{contact(cv)}</div>
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
    design: 'sterling', font: BODY_SERIF, contentPadV: 42, pageUsable: 1035, mainPad: '42px 30px 42px 46px', sidebarW: 240, sidebarSide: 'right', measureW: 478, buildSidebarBlocks: sterlingSidebarBlocks, sidebarMeasureW: 188, sidebarPadV: 42,
    buildBlocks: (cv, A) => {
      const DARK = darken(A, 0.74)
      const head = (t: string) => <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: DARK, borderBottom: `2px solid ${A}`, paddingBottom: 4, marginBottom: 12, display: 'inline-block' }}>{t}</div>
      const b: Block[] = []
      if (cv.summary) b.push({ key: 'summary', node: <div style={{ marginBottom: 20 }}>{head('Profile')}<p style={{ fontSize: 14, lineHeight: 1.8, color: '#444', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div> })
      if (cv.experience?.length) {
        b.push({ key: 'exp-h', node: <div style={{ marginBottom: 4 }}>{head('Experience')}</div> })
        cv.experience.forEach((e, i) => {
          b.push({ key: `exp${i}-h`, node: <div style={{ marginBottom: 6 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><span style={{ fontWeight: 700, fontSize: 15, color: DARK }}>{e.role}</span><span style={{ fontSize: 12, color: A, fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</span></div><div style={{ fontSize: 13.5, color: A, fontWeight: 600 }}>{e.company}</div></div> })
          e.bullets.forEach((x, j) => b.push({ key: `exp${i}-b${j}`, node: <ul style={{ margin: 0, paddingLeft: 16, marginBottom: j === e.bullets.length - 1 ? 13 : 0, listStyleType: 'disc', listStylePosition: 'outside' }}><li style={{ fontSize: 13.5, lineHeight: 1.7, color: '#3a3a3a', marginBottom: 5 }}>{x}</li></ul> }))
        })
      }
      // Education is rendered in the sidebar for this two-column template.
      const ex = (t: string, items?: string[]) => { if (items?.length) { b.push({ key: `${t}-h`, node: <div style={{ marginBottom: 4 }}>{head(t)}</div> }); items.forEach((x, i) => b.push({ key: `${t}-${i}`, node: <ul style={{ margin: 0, paddingLeft: 16, marginBottom: 4, listStyleType: 'disc', listStylePosition: 'outside' }}><li style={{ fontSize: 13.5, lineHeight: 1.7, color: '#444' }}>{x}</li></ul> })) } }
      ex('Publications', cv.publications); ex('Research', cv.research); ex('Teaching Experience', cv.teaching)
      if (cv.attributes?.length) b.push({ key: 'attributes', node: <div style={{ marginBottom: 14 }}>{head('Professional Attributes')}<ul style={{ margin: 0, paddingLeft: 18, listStyleType: 'disc', listStylePosition: 'outside' }}>{cv.attributes.map((a, i) => <li key={i} style={{ fontSize: 13.5, lineHeight: 1.55, color: '#444', marginBottom: 4 }}>{a}</li>)}</ul></div> })
      extraMainBlocks(cv, (t) => head(t), true, '#444').forEach(bl => b.push(bl))
      return b
    },
    Header: ({ cv, A }) => (<>
      <div style={{ fontSize: 34, fontWeight: 700, color: darken(A, 0.74), letterSpacing: 1 }}>{cv.fullName}</div>
      {cv.jobTitle && <div style={{ fontSize: 14.5, letterSpacing: 2, textTransform: 'uppercase', color: A, margin: '6px 0 20px' }}>{cv.jobTitle}</div>}
    </>),
    Frame: ({ cv, A, pageIndex, children, sidebarChildren }) => {
      const DARK = darken(A, 0.74)
      return (
        <div style={{ ...pageBase, fontFamily: BODY_SERIF, color: '#22252b', background: `linear-gradient(90deg, #fff 0, #fff 554px, ${DARK} 554px, ${DARK} 100%)`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px' }}>
            <div style={{ padding: pageIndex === 0 ? '42px 30px 42px 46px' : '46px 30px 42px 46px' }}>
              {pageIndex === 0 && <TEMPLATES_CONFIG.sterling.Header cv={cv} A={A} />}
              {children}
            </div>
            <div style={{ color: '#fff', padding: '42px 26px' }}>
              {sidebarChildren}
            </div>
          </div>
        </div>
      )
    },
  },

  // ── SLATE: minimalist mono, airy whitespace ──
  slate: {
    design: 'slate', font: BODY_SERIF, contentPadV: 54, mainPad: '54px 60px', sidebarW: 0, sidebarSide: 'none', measureW: 674, flowPaginate: true,
    buildBlocks: (cv, A) => {
      const head = (t: string) => <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: '#1a1a1a', marginBottom: 14 }}>{t}</div>
      const b: Block[] = []
      if (cv.summary) b.push({ key: 'summary', node: <div style={{ marginBottom: 26 }}>{head('Profile')}<p style={{ fontSize: 14, lineHeight: 1.9, color: '#555', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div> })
      if (cv.experience?.length) {
        b.push({ key: 'exp-h', node: <div style={{ marginBottom: 4 }}>{head('Experience')}</div> })
        cv.experience.forEach((e, i) => {
          // split: header (-h, orphan-protected) + per-bullet blocks → roles FLOW across pages
          b.push({ key: `exp${i}-h`, node: <div style={{ marginBottom: 6 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>{e.role}</span><span style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</span></div><div style={{ fontSize: 13.5, color: '#888', marginBottom: 6 }}>{e.company}</div></div> })
          e.bullets.forEach((x, j) => b.push({ key: `exp${i}-b${j}`, node: <ul style={{ margin: 0, paddingLeft: 16, listStyleType: 'disc', listStylePosition: 'outside', marginBottom: j === e.bullets.length - 1 ? 16 : 0 }}><li style={{ fontSize: 13.5, lineHeight: 1.75, color: '#555', marginBottom: 5 }}>{x}</li></ul> }))
        })
      }
      if (cv.education?.length) {
        b.push({ key: 'edu-h', node: <div style={{ marginBottom: 4 }}>{head('Education')}</div> })
        cv.education.forEach((e, i) => b.push({ key: `edu-${i}`, node: <div style={{ marginBottom: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div><div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{e.qualification} in {e.field}</div><div style={{ fontSize: 13.5, color: '#888' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div></div><div style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startYear} – {e.endYear}</div></div> }))
      }
      if (cv.skills?.length) b.push({ key: 'skills', node: <div style={{ marginBottom: 18 }}>{head('Skills')}<div style={{ fontSize: 13.5, color: '#555', lineHeight: 2 }}>{dotList(cv.skills, A)}</div></div> })
      if (cv.attributes?.length) b.push({ key: 'attributes', node: <div style={{ marginBottom: 14 }}>{head('Professional Attributes')}<ul style={{ margin: 0, paddingLeft: 18, listStyleType: 'disc', listStylePosition: 'outside' }}>{cv.attributes.map((a, i) => <li key={i} style={{ fontSize: 13.5, lineHeight: 1.55, color: '#444', marginBottom: 4 }}>{a}</li>)}</ul></div> })
      if (cv.languages?.length) b.push({ key: 'langs', node: <div style={{ marginBottom: 18 }}>{head('Languages')}<div style={{ fontSize: 13.5, color: '#555' }}>{dotList(cv.languages, A)}</div></div> })
      const ex = (t: string, items?: string[]) => { if (items?.length) { b.push({ key: `${t}-h`, node: <div style={{ marginBottom: 4 }}>{head(t)}</div> }); items.forEach((x, i) => b.push({ key: `${t}-${i}`, node: <ul style={{ margin: 0, paddingLeft: 16, marginBottom: 4, listStyleType: 'disc', listStylePosition: 'outside' }}><li style={{ fontSize: 13.5, lineHeight: 1.75, color: '#555' }}>{x}</li></ul> })) } }
      ex('Publications', cv.publications); ex('Research', cv.research); ex('Teaching Experience', cv.teaching)
      extraMainBlocks(cv, (t) => head(t), false, '#444').forEach(bl => b.push(bl))
      return b
    },
    Header: ({ cv }) => (<>
      <div style={{ fontSize: 30, fontWeight: 300, letterSpacing: 6, textTransform: 'uppercase', color: '#1a1a1a' }}>{cv.fullName}</div>
      {cv.jobTitle && <div style={{ fontSize: 12.5, letterSpacing: 4, textTransform: 'uppercase', color: '#888', margin: '10px 0 4px' }}>{cv.jobTitle}</div>}
      <div style={{ width: 36, height: 2, background: '#1a1a1a', margin: '16px 0 28px' }} />
      <div style={{ fontSize: 12, letterSpacing: 1, color: '#999', marginBottom: 30 }}>{contact(cv)}</div>
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
    design: 'verde', font: BODY_SERIF, contentPadV: 36, pageUsable: 1037, headerBannerPad: '36px 50px 30px', mainPad: '36px 50px', sidebarW: 0, sidebarSide: 'none', measureW: 694,
    buildBlocks: (cv, A) => {
      const head = (t: string) => <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: darken(A, 0.5), marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: A }} />{t}<span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${A}40, transparent)` }} /></div>
      const b: Block[] = []
      if (cv.summary) b.push({ key: 'summary', node: <div style={{ marginBottom: 22 }}>{head('About Me')}<p style={{ fontSize: 14, lineHeight: 1.8, color: '#444', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div> })
      if (cv.experience?.length) {
        b.push({ key: 'exp-h', node: <div style={{ marginBottom: 4 }}>{head('Experience')}</div> })
        cv.experience.forEach((e, i) => {
          // split: header (-h, orphan-protected) + per-bullet blocks → roles FLOW across pages
          b.push({ key: `exp${i}-h`, node: <div style={{ background: '#f4f7f4', borderRadius: '10px 10px 0 0', padding: '16px 18px 4px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><span style={{ fontWeight: 700, fontSize: 15, color: darken(A, 0.5) }}>{e.role}</span><span style={{ fontSize: 12, color: '#7a8a7a', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</span></div><div style={{ fontSize: 13.5, color: A, fontWeight: 600 }}>{e.company}</div></div> })
          e.bullets.forEach((x, j) => b.push({ key: `exp${i}-b${j}`, node: <ul style={{ margin: 0, paddingLeft: 34, listStyleType: 'disc', listStylePosition: 'outside', background: '#f4f7f4', paddingRight: 18, paddingTop: 2, paddingBottom: j === e.bullets.length - 1 ? 14 : 2, borderRadius: j === e.bullets.length - 1 ? '0 0 10px 10px' : 0, marginBottom: j === e.bullets.length - 1 ? 12 : 0 }}><li style={{ fontSize: 13.5, lineHeight: 1.7, color: '#444', marginBottom: 4 }}>{x}</li></ul> }))
        })
      }
      if (cv.education?.length) {
        b.push({ key: 'edu-h', node: <div style={{ marginBottom: 4 }}>{head('Education')}</div> })
        cv.education.forEach((e, i) => b.push({ key: `edu-${i}`, node: <div style={{ marginBottom: 9, paddingLeft: 14, borderLeft: `3px solid ${A}` }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div style={{ fontSize: 14, fontWeight: 700, color: darken(A, 0.5) }}>{e.qualification} in {e.field}</div><div style={{ fontSize: 12, color: '#7a8a7a', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startYear} – {e.endYear}</div></div><div style={{ fontSize: 13.5, color: '#666' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div></div> }))
      }
      if (cv.skills?.length) b.push({ key: 'skills', node: <div style={{ marginBottom: 14 }}>{head('Skills')}<div style={{ fontSize: 13.5, color: '#444', lineHeight: 2 }}>{dotList(cv.skills, A)}</div></div> })
      if (cv.attributes?.length) b.push({ key: 'attributes', node: <div style={{ marginBottom: 14 }}>{head('Professional Attributes')}<ul style={{ margin: 0, paddingLeft: 18, listStyleType: 'disc', listStylePosition: 'outside' }}>{cv.attributes.map((a, i) => <li key={i} style={{ fontSize: 13.5, lineHeight: 1.55, color: '#444', marginBottom: 4 }}>{a}</li>)}</ul></div> })
      if (cv.languages?.length) b.push({ key: 'langs', node: <div style={{ marginBottom: 14 }}>{head('Languages')}<div style={{ fontSize: 13.5, color: '#444' }}>{dotList(cv.languages, A)}</div></div> })
      const ex = (t: string, items?: string[]) => { if (items?.length) { b.push({ key: `${t}-h`, node: <div style={{ marginBottom: 4 }}>{head(t)}</div> }); items.forEach((x, i) => b.push({ key: `${t}-${i}`, node: <ul style={{ margin: 0, paddingLeft: 16, marginBottom: 4, listStyleType: 'disc', listStylePosition: 'outside' }}><li style={{ fontSize: 13.5, lineHeight: 1.7, color: '#444' }}>{x}</li></ul> })) } }
      ex('Publications', cv.publications); ex('Research', cv.research); ex('Teaching Experience', cv.teaching)
      extraMainBlocks(cv, (t) => head(t), false, '#444').forEach(bl => b.push(bl))
      return b
    },
    Header: ({ cv, A }) => (<>
      <div style={{ fontSize: 34, fontWeight: 700, color: '#fff' }}>{cv.fullName}</div>
      {cv.jobTitle && <div style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.85)', fontWeight: 600, marginTop: 4 }}>{cv.jobTitle}</div>}
      <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', marginTop: 10 }}>{contact(cv)}</div>
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
    design: 'crimson', font: BODY_SERIF, contentPadV: 40, pageUsable: 1029, headerBannerPad: '34px 50px 0px', mainPad: '40px 50px', sidebarW: 0, sidebarSide: 'none', measureW: 694,
    buildBlocks: (cv, A) => {
      const head = (t: string) => <div style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: A, borderBottom: `2px solid ${A}`, paddingBottom: 4, marginBottom: 12 }}>{t}</div>
      const b: Block[] = []
      if (cv.summary) b.push({ key: 'summary', node: <div style={{ marginBottom: 22 }}>{head('Profile')}<p style={{ fontSize: 14, lineHeight: 1.8, color: '#444', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div> })
      if (cv.experience?.length) {
        b.push({ key: 'exp-h', node: <div style={{ marginBottom: 4 }}>{head('Experience')}</div> })
        cv.experience.forEach((e, i) => {
          // split: header (-h, orphan-protected) + per-bullet blocks → roles FLOW across pages
          b.push({ key: `exp${i}-h`, node: <div style={{ marginBottom: 6 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>{e.role}</span><span style={{ fontSize: 12, color: A, fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</span></div><div style={{ fontSize: 13.5, color: A, fontWeight: 600, marginBottom: 6 }}>{e.company}</div></div> })
          e.bullets.forEach((x, j) => b.push({ key: `exp${i}-b${j}`, node: <ul style={{ margin: 0, paddingLeft: 16, listStyleType: 'disc', listStylePosition: 'outside', marginBottom: j === e.bullets.length - 1 ? 15 : 0 }}><li style={{ fontSize: 13.5, lineHeight: 1.7, color: '#444', marginBottom: 4 }}>{x}</li></ul> }))
        })
      }
      if (cv.education?.length) {
        b.push({ key: 'edu-h', node: <div style={{ marginBottom: 4 }}>{head('Education')}</div> })
        cv.education.forEach((e, i) => b.push({ key: `edu-${i}`, node: <div style={{ marginBottom: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div><div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{e.qualification} in {e.field}</div><div style={{ fontSize: 13.5, color: '#666', fontStyle: 'italic' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div></div><div style={{ fontSize: 12, color: A, fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startYear} – {e.endYear}</div></div> }))
      }
      // Crimson-only pagination refinement: split dense sections into measurable
      // chunks so they can use remaining page space without moving wholesale.
      if (cv.skills?.length) {
        b.push({ key: 'skills-h', node: <div style={{ marginBottom: 4 }}>{head('Core Skills')}</div> })
        for (let i = 0; i < cv.skills.length; i += 5) {
          const chunk = cv.skills.slice(i, i + 5)
          b.push({ key: `skills-${i / 5}`, node: <div style={{ fontSize: 13.5, color: '#444', lineHeight: 2, marginBottom: i + 5 >= cv.skills.length ? 14 : 0 }}>{dotList(chunk, A)}</div> })
        }
      }
      if (cv.attributes?.length) {
        const attributes = cv.attributes
        b.push({ key: 'attributes-h', node: <div style={{ marginBottom: 4 }}>{head('Professional Attributes')}</div> })
        attributes.forEach((a, i) => b.push({ key: `attributes-${i}`, node: <ul style={{ margin: 0, paddingLeft: 18, marginBottom: i === attributes.length - 1 ? 14 : 4, listStyleType: 'disc', listStylePosition: 'outside' }}><li style={{ fontSize: 13.5, lineHeight: 1.55, color: '#444' }}>{a}</li></ul> }))
      }
      if (cv.languages?.length) {
        b.push({ key: 'langs-h', node: <div style={{ marginBottom: 4 }}>{head('Languages')}</div> })
        b.push({ key: 'langs-0', node: <div style={{ fontSize: 13.5, color: '#444', marginBottom: 14 }}>{dotList(cv.languages, A)}</div> })
      }
      const ex = (t: string, items?: string[]) => { if (items?.length) { b.push({ key: `${t}-h`, node: <div style={{ marginBottom: 4 }}>{head(t)}</div> }); items.forEach((x, i) => b.push({ key: `${t}-${i}`, node: <ul style={{ margin: 0, paddingLeft: 16, marginBottom: 4, listStyleType: 'disc', listStylePosition: 'outside' }}><li style={{ fontSize: 13.5, lineHeight: 1.7, color: '#444' }}>{x}</li></ul> })) } }
      ex('Publications', cv.publications); ex('Research', cv.research); ex('Teaching Experience', cv.teaching)
      extraMainBlocks(cv, (t) => head(t), false, '#444').forEach(bl => b.push(bl))
      return b
    },
    Header: ({ cv, A }) => (<>
      <div style={{ fontSize: 38, fontWeight: 800, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: 1 }}>{cv.fullName}</div>
      {cv.jobTitle && <div style={{ display: 'inline-block', background: A, color: '#fff', fontSize: 12.5, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', padding: '4px 14px', margin: '10px 0 6px' }}>{cv.jobTitle}</div>}
      <div style={{ fontSize: 12.5, color: '#888', marginBottom: 4 }}>{contact(cv)}</div>
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
    design: 'atlas', font: BODY_SERIF, contentPadV: 46, mainPad: '46px 50px', sidebarW: 0, sidebarSide: 'none', measureW: 694, flowPaginate: true,
    buildBlocks: (cv, A) => {
      const head = (t: string) => <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#0f172a', marginBottom: 16 }}>{t}</div>
      const b: Block[] = []
      if (cv.summary) b.push({ key: 'summary', node: <div style={{ marginBottom: 26 }}><p style={{ fontSize: 14, lineHeight: 1.8, color: '#475569', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div> })
      if (cv.experience?.length) {
        b.push({ key: 'exp-h', node: <div style={{ marginBottom: 4 }}>{head('Experience')}</div> })
        cv.experience.forEach((e, i) => {
          // split with a CONTINUOUS timeline rail: header carries the date + dot;
          // each bullet block repeats the grid + left border so the rail runs on unbroken.
          b.push({ key: `exp${i}-h`, node: (
            <div style={{ display: 'grid', gridTemplateColumns: '54px 1fr', gap: 16 }}>
              <div style={{ textAlign: 'right', paddingTop: 2 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>{e.endDate}</div>
                <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{e.startDate}</div>
              </div>
              <div style={{ borderLeft: `2px solid #e2e8f0`, paddingLeft: 16, position: 'relative', paddingBottom: 4 }}>
                <div style={{ position: 'absolute', left: -5, top: 4, width: 8, height: 8, borderRadius: '50%', background: A }} />
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{e.role}</div>
                <div style={{ fontSize: 13.5, color: A, fontWeight: 700 }}>{e.company}</div>
              </div>
            </div>
          ) })
          e.bullets.forEach((x, j) => b.push({ key: `exp${i}-b${j}`, node: (
            <div style={{ display: 'grid', gridTemplateColumns: '54px 1fr', gap: 16, marginBottom: j === e.bullets.length - 1 ? 18 : 0 }}>
              <div />
              <div style={{ borderLeft: `2px solid #e2e8f0`, paddingLeft: 16, paddingBottom: j === e.bullets.length - 1 ? 4 : 0 }}>
                <ul style={{ margin: 0, paddingLeft: 16, listStyleType: 'disc', listStylePosition: 'outside' }}><li style={{ fontSize: 13.5, lineHeight: 1.7, color: '#475569', marginBottom: 4 }}>{x}</li></ul>
              </div>
            </div>
          ) }))
        })
      }
      if (cv.education?.length) {
        b.push({ key: 'edu-h', node: <div style={{ marginBottom: 4 }}>{head('Education')}</div> })
        cv.education.forEach((e, i) => b.push({ key: `edu-${i}`, node: (
          <div style={{ display: 'grid', gridTemplateColumns: '54px 1fr', gap: 16, marginBottom: 12 }}>
            <div style={{ textAlign: 'right', paddingTop: 2 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>{e.endYear}</div>
              <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{e.startYear}</div>
            </div>
            <div style={{ borderLeft: `2px solid #e2e8f0`, paddingLeft: 16, position: 'relative' }}>
              <div style={{ position: 'absolute', left: -5, top: 4, width: 8, height: 8, borderRadius: '50%', background: A }} />
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{e.qualification} in {e.field}</div>
              <div style={{ fontSize: 13.5, color: '#64748b' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div>
            </div>
          </div>
        ) }))
      }
      if (cv.skills?.length) b.push({ key: 'skills', node: <div style={{ marginBottom: 16 }}>{head('Skills')}<div style={{ fontSize: 13.5, color: '#475569', lineHeight: 2, paddingLeft: 70 }}>{dotList(cv.skills, A)}</div></div> })
      if (cv.attributes?.length) b.push({ key: 'attributes', node: <div style={{ marginBottom: 14 }}>{head('Professional Attributes')}<ul style={{ margin: 0, paddingLeft: 18, listStyleType: 'disc', listStylePosition: 'outside' }}>{cv.attributes.map((a, i) => <li key={i} style={{ fontSize: 13.5, lineHeight: 1.55, color: '#444', marginBottom: 4 }}>{a}</li>)}</ul></div> })
      if (cv.languages?.length) b.push({ key: 'langs', node: <div style={{ marginBottom: 16 }}>{head('Languages')}<div style={{ fontSize: 13.5, color: '#475569', paddingLeft: 70 }}>{dotList(cv.languages, A)}</div></div> })
      const ex = (t: string, items?: string[]) => { if (items?.length) { b.push({ key: `${t}-h`, node: <div style={{ marginBottom: 4 }}>{head(t)}</div> }); items.forEach((x, i) => b.push({ key: `${t}-${i}`, node: <ul style={{ margin: 0, paddingLeft: 86, marginBottom: 4, listStyleType: 'disc', listStylePosition: 'outside' }}><li style={{ fontSize: 13.5, lineHeight: 1.7, color: '#475569' }}>{x}</li></ul> })) } }
      ex('Publications', cv.publications); ex('Research', cv.research); ex('Teaching Experience', cv.teaching)
      extraMainBlocks(cv, (t) => head(t), false, '#444').forEach(bl => b.push(bl))
      return b
    },
    Header: ({ cv, A }) => {
      const first = cv.fullName.split(' ')[0], last = cv.fullName.split(' ').slice(1).join(' ')
      return (<>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div style={{ fontSize: 40, fontWeight: 300, color: '#0f172a', letterSpacing: 1 }}>{first} <strong style={{ fontWeight: 800 }}>{last}</strong></div>
          <div style={{ textAlign: 'right', fontSize: 11.5, color: '#94a3b8', lineHeight: 1.6, marginTop: 6 }}>{[cv.phone, cv.email, cv.location, cv.linkedin].filter(Boolean).map((x, i) => <div key={i}>{x}</div>)}</div>
        </div>
        {cv.jobTitle && <div style={{ fontSize: 14.5, letterSpacing: 3, textTransform: 'uppercase', color: A, marginBottom: 24 }}>{cv.jobTitle}</div>}
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
    design: 'vertex', font: BODY_SERIF, contentPadV: 46, mainPad: '46px', sidebarW: 0, sidebarSide: 'none', measureW: 664, packTolerance: 0, packBottomSafety: 32,
    buildBlocks: (cv, A) => commonBlocks(cv, A, 'dash', { skillsInline: true }),
    Header: ({ cv, A }) => {
      const first = cv.fullName.split(' ')[0], rest = cv.fullName.split(' ').slice(1).join(' ')
      return (<>
        <div style={{ marginBottom: 6 }}><span style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1, lineHeight: 0.95, color: '#1c1c1c', textTransform: 'uppercase' }}>{first} </span><span style={{ fontSize: 42, fontWeight: 300, letterSpacing: -1, color: '#1c1c1c', textTransform: 'uppercase' }}>{rest}</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}><div style={{ width: 40, height: 3, background: A }} /><span style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: A }}>{cv.jobTitle}</span></div>
        <div style={{ fontSize: 13.5, color: '#777', marginBottom: 30 }}>{contact(cv)}</div>
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
    design: 'sovereign', font: BODY_SERIF, contentPadV: 46, mainPad: '46px 54px', sidebarW: 0, sidebarSide: 'none', measureW: 686, packTolerance: 0, packBottomSafety: 32,
    buildBlocks: (cv, A) => commonBlocks(cv, A, 'plain', { skillsInline: true }),
    Header: ({ cv, A }) => {
      const DARK = '#1a2238'
      return (<>
        <div style={{ textAlign: 'center', paddingBottom: 22, borderBottom: `2px solid ${A}`, marginBottom: 8 }}>
          <div style={{ width: 60, height: 60, margin: '0 auto 14px', border: `2px solid ${A}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 22, fontWeight: 700, color: DARK, letterSpacing: 1 }}>{initials(cv.fullName)}</span></div>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: DARK, lineHeight: 1 }}>{cv.fullName}</div>
          {cv.jobTitle && <div style={{ fontSize: 14.5, letterSpacing: 5, textTransform: 'uppercase', color: A, marginTop: 10, fontWeight: 600 }}>{cv.jobTitle}</div>}
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, letterSpacing: 1, color: '#888', marginBottom: 28, fontFamily: BODY_SANS }}>{contact(cv)}</div>
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
    design: 'ascend', font: BODY_SERIF, contentPadV: 44, mainPad: '44px 46px', sidebarW: 0, sidebarSide: 'none', measureW: 702, packTolerance: 0, packBottomSafety: 34, flowPaginate: true,
    buildBlocks: (cv, A) => commonBlocks(cv, A, 'bar', { skillsInline: true }),
    Header: ({ cv, A }) => (<>
      <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 0.5, color: '#1a1a1a', textTransform: 'uppercase', marginBottom: 6 }}>{cv.fullName}</div>
      {cv.jobTitle && <div style={{ fontSize: 16, color: A, fontWeight: 700, marginBottom: 8 }}>{cv.jobTitle}</div>}
      <div style={{ fontSize: 13.5, color: '#777', marginBottom: 24 }}>{contact(cv).replace(/•/g, '|')}</div>
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
    design: 'harbour', font: BODY_SERIF, contentPadV: 46, mainPad: '46px 50px', sidebarW: 0, sidebarSide: 'none', measureW: 694, packTolerance: 0, packBottomSafety: 32, flowPaginate: true, flowBodyColor: '#1a2a2a',
    buildBlocks: (cv, A) => commonBlocks(cv, A, 'tick', { skillsInline: true }),
    Header: ({ cv, A }) => (<>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ width: 5, alignSelf: 'stretch', background: A, minHeight: 56 }} />
        <div><div style={{ fontSize: 38, fontWeight: 700, color: '#1a2a2a', lineHeight: 1 }}>{cv.fullName}</div>{cv.jobTitle && <div style={{ fontSize: 17, color: A, fontStyle: 'italic', marginTop: 6 }}>{cv.jobTitle}</div>}</div>
      </div>
      <div style={{ fontSize: 13.5, color: '#778080', marginBottom: 18 }}>{contact(cv).replace(/•/g, '   ')}</div>
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
    design: 'classic', font: BODY_SERIF, contentPadV: 44, mainPad: '44px 48px', sidebarW: 0, sidebarSide: 'none', measureW: 698, packTolerance: 0, packBottomSafety: 32, flowPaginate: true,
    buildBlocks: (cv, A) => commonBlocks(cv, A, 'rule', { skillsInline: true }),
    Header: ({ cv }) => (<div style={{ textAlign: 'center', marginBottom: 22 }}>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>{cv.fullName}</div>
      {cv.jobTitle && <div style={{ fontSize: 15, color: '#555', marginBottom: 8 }}>{cv.jobTitle}</div>}
      <div style={{ fontSize: 12.5, color: '#666' }}>{contact(cv)}</div>
    </div>),
    Frame: ({ cv, A, pageIndex, children }) => (
      <div style={{ ...pageBase, fontFamily: BODY_SERIF, color: '#1a1a1a', padding: '44px 48px' }}>
        {pageIndex === 0 && <TEMPLATES_CONFIG.classic.Header cv={cv} A={A} />}
        {children}
      </div>
    ),
  },
}

// ── Cover letter (flows naturally, no columns) ──
function CoverLetter({ cv, A, font }: { cv: GeneratedCV; A: string; font: string }) {
  return (
    <div data-pagination-ready="true" style={{ ...pageBase, fontFamily: font, color: '#1a1a1a', padding: '52px 56px' }}>
      <div style={{ borderBottom: `2px solid ${A}`, paddingBottom: 18, marginBottom: 28 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: A, marginBottom: 4 }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontSize: 14.5, color: '#666', fontStyle: 'italic', marginBottom: 8 }}>{cv.jobTitle}</div>}
        <div style={{ fontSize: 12.5, color: '#666', fontFamily: BODY_SANS }}>{contact(cv)}</div>
      </div>
      {(cv.coverLetterBody || '').split('\n\n').map((p, i) => <p key={i} style={{ fontSize: 14.5, lineHeight: 1.9, color: '#222', marginBottom: 16, textAlign: 'justify' }}>{p}</p>)}
    </div>
  )
}
