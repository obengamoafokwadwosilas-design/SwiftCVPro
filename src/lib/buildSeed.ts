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
