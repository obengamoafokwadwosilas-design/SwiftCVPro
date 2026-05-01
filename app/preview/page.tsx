import CVPreview from '@/components/CVPreview'

export default function PreviewPage({ searchParams }: any) {
  let cv = null
  let template = 'classic'

  try {
    cv = searchParams?.data
      ? JSON.parse(decodeURIComponent(searchParams.data))
      : null

    template = searchParams?.template || 'classic'
  } catch (err) {
    console.error(err)
  }

  if (!cv) {
    return <div>No CV Data</div>
  }

  return <CVPreview cv={cv} templateId={template} />
}
