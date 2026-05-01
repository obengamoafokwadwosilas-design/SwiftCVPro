import CVPreview from '@/components/CVPreview'
import { TemplateId } from '@/types'

export default function PreviewPage({ searchParams }: any) {
  let cv = null
  let template: TemplateId = 'classic'

  try {
    cv = searchParams?.data
      ? JSON.parse(decodeURIComponent(searchParams.data))
      : null

    const requestedTemplate = searchParams?.template as string

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

    if (allowedTemplates.includes(requestedTemplate as TemplateId)) {
      template = requestedTemplate as TemplateId
    }
  } catch (err) {
    console.error('Preview page error:', err)
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
