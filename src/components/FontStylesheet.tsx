'use client'

import { useEffect } from 'react'
import { UI_FONTS_HREF } from '@/lib/fonts'

// Applies the Google Fonts stylesheet after hydration instead of letting it
// block the first paint: on a slow Ghanaian line that third-party stylesheet
// needs its own connection and was holding every app page blank for 1.4-2.4s.
// The layout preloads it, so by now it is usually already downloaded. It is
// added after hydration rather than by an inline script because React 18's
// hydration of <head> can drop nodes it didn't render.
export default function FontStylesheet() {
  useEffect(() => {
    if (document.querySelector(`link[rel="stylesheet"][href="${UI_FONTS_HREF}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = UI_FONTS_HREF
    document.head.appendChild(link)
  }, [])
  return null
}
