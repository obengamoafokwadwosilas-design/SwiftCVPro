import { CVType } from '@/types'

// A serialisable snapshot of everything a user typed into the builder.
// Two unrelated features both need "leave the builder and come back with
// everything still filled in", so they share one shape and one mechanism:
//
//   1. In-app-browser Paystack checkout — WhatsApp/Facebook/Instagram
//      webviews can't reliably run the popup, so payment happens on a
//      real hosted page and the browser navigates away and back. The seed
//      is what survives that round trip.
//   2. "Rewrite for another job" on a saved CV — the exact same shape is what
//      gets stored as cv_history.raw_input at generation time, so rewriting a
//      past CV re-enters the builder pre-filled the same way. (That path drops
//      the old job-targeting fields first; see CVHistoryModal.handleOpen.)
export interface BuildSeed {
  cvType: CVType
  inputMethod: 'paste' | 'form'
  phoneNumber?: string
  // paste path
  pasteContent?: string
  clarifyNotes?: string
  // Name of the CV file the user uploaded. A File object itself can't be
  // serialised, so an upload is remembered as this name plus the text already
  // extracted from it (kept in pasteContent) — enough to put the "Ready"
  // upload card back on screen instead of silently swapping it for a paste
  // box, which reads as "my document was deleted".
  uploadedFileName?: string
  // guided-form path
  form?: {
    fullName?: string; phone?: string; email?: string; location?: string
    dob?: string; nationality?: string; linkedin?: string
    education?: string; gpa?: string; thesis?: string; research?: string
    experience?: string; publications?: string; teaching?: string; conferences?: string
    extras?: string; grants?: string; supervision?: string; orcid?: string
    jobTitle?: string; company?: string
  }
  // shared job-targeting fields
  jobDescription?: string
  whyRole?: string
  // where to land once restored: 'summary' resumes an in-flight payment
  // (the user was already on the review screen when they hit Generate);
  // 'type' starts a deliberate fresh pass (duplication from history).
  landingScreen: 'summary' | 'type'
}

const KEY = 'swiftcv_build_seed'

export function saveBuildSeed(seed: BuildSeed) {
  try { sessionStorage.setItem(KEY, JSON.stringify(seed)) } catch { /* storage unavailable — non-fatal */ }
}

export function loadBuildSeed(): BuildSeed | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearBuildSeed() {
  try { sessionStorage.removeItem(KEY) } catch { /* non-fatal */ }
}

// ── Remembering a returning user's own info across visits ──────────────
// Separate from the one-shot seed above on purpose: that one is consumed and
// cleared the moment it's read (built for a single round trip). This one is
// never auto-cleared — it persists in localStorage so someone on the same
// phone/laptop doesn't have to retype their number or re-paste their CV
// every single visit. Only cleared if the user explicitly asks (see
// clearLastInput, wired to a "Not you?" control in the builder UI).
const LAST_INPUT_KEY = 'swiftcv_last_input'

export function saveLastInput(seed: BuildSeed) {
  try { localStorage.setItem(LAST_INPUT_KEY, JSON.stringify(seed)) } catch { /* storage unavailable — non-fatal */ }
}

export function loadLastInput(): BuildSeed | null {
  try {
    const raw = localStorage.getItem(LAST_INPUT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearLastInput() {
  try { localStorage.removeItem(LAST_INPUT_KEY) } catch { /* non-fatal */ }
}

// A cover letter belongs to the CV it was written from, but it lives in
// sessionStorage under its own key and nothing used to clear it — so
// generating a second CV (or opening an older one from history) carried the
// previous letter across and showed it attached to the wrong document. Call
// this wherever a NEW primary document is put into sessionStorage. Clears the
// letter's saved-document id too, so it can't be mistaken for the new one's
// when deciding whether a download has already been paid for.
export function clearPreviousCoverLetter() {
  try {
    sessionStorage.removeItem('swiftcv_coverletter')
    sessionStorage.removeItem('swiftcv_cover_history_id')
  } catch { /* storage unavailable — non-fatal */ }
}
