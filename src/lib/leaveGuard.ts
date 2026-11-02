'use client'

import { useEffect } from 'react'

// Asks "are you sure?" before the phone's Back key (or the browser's Back)
// takes someone off a page they would lose their place on. Refresh and closing
// the tab are covered separately by each page's own beforeunload warning;
// onLeave lets the page switch that warning off once Back has been confirmed,
// so nobody is asked twice.
//
// A history entry is added so Back can be caught: the first Back lands on the
// page's own entry, where we ask. "Stay" puts the entry back; "leave" goes back
// once more for real. Next's own history state is copied into the entry, since
// its router reloads the page on an entry that lacks it.
export function useBackGuard(active: boolean, message: string, onLeave?: () => void) {
  useEffect(() => {
    if (!active) return
    let leaving = false
    const push = () => window.history.pushState({ ...window.history.state, scvGuard: true }, '')
    push()
    const onPop = () => {
      if (leaving) return
      if (window.confirm(message)) { leaving = true; onLeave?.(); window.history.back() } else push()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [active, message]) // eslint-disable-line react-hooks/exhaustive-deps
}
