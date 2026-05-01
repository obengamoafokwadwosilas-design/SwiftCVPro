'use client'

import { useEffect, useState } from 'react'
import CVPreview from '@/components/CVPreview'
import { GeneratedCV, TemplateId } from '@/types'

const allowedTemplates: TemplateId[] = [
  'bold-header',
  'classic',
  'minimal',
  'accent',
  'academic',
  'clean',
  'editorial',
  'executive',
  'modern'
]

export default function PreviewPage() {
  const [cv, setCv] = useState<GeneratedCV | null>(null)
  const [template, setTemplate] = useState<TemplateId>('classic')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)

      const urlData = params.get('data')
      const urlTemplate = params.get('template')

      if (urlTemplate && allowedTemplates.includes(urlTemplate as TemplateId)) {
        setTemplate(urlTemplate as TemplateId)
      }

      if (urlData) {
        const parsed = JSON.parse(decodeURIComponent(urlData))
        setCv(parsed)
        localStorage.setItem('swiftcv_generated_cv', JSON.stringify(parsed))
        return
      }

      const saved =
        localStorage.getItem('swiftcv_generated_cv') ||
        sessionStorage.getItem('swiftcv_generated_cv') ||
        localStorage.getItem('generatedCV') ||
        sessionStorage.getItem('generatedCV') ||
        localStorage.getItem('cv') ||
        sessionStorage.getItem('cv')

      if (saved) {
        setCv(JSON.parse(saved))
      }
    } catch (err) {
      console.error('Preview load error:', err)
    } finally {
      setLoaded(true)
    }
  }, [])

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        Loading CV...
      </div>
    )
  }

  if (!cv) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-center">
        <div>
          <h1 className="text-xl font-semibold mb-2">No CV Data Found</h1>
          <p className="text-gray-500">Please generate a CV first.</p>
        </div>
      </div>
    )
  }

  return <CVPreview cv={cv} templateId={template} />
}
