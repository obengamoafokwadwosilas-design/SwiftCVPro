import CVPreview from '@/components/CVPreview'

export default function PreviewPage({ searchParams }: any) {
  let cv = null

  try {
    cv = searchParams?.data
      ? JSON.parse(decodeURIComponent(searchParams.data))
      : null
  } catch (err) {
    console.error('Invalid CV data:', err)
  }

  if (!cv) {
    return (
      <div className="flex items-center justify-center h-screen text-center">
        <div>
          <h1 className="text-xl font-semibold mb-2">
            No CV Data Found
          </h1>
          <p className="text-gray-500">
            Please generate a CV first.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <CVPreview cv={cv} />
    </div>
  )
}
