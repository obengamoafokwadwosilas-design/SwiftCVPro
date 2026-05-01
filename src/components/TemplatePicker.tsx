'use client'

const templates = [
  {
    id: 'classic',
    name: 'Classic ATS',
    desc: 'Safe for all jobs'
  },
  {
    id: 'modern',
    name: 'Modern Sidebar',
    desc: 'Clean and stylish'
  },
  {
    id: 'executive',
    name: 'Executive',
    desc: 'Premium corporate look'
  },
  {
    id: 'editorial',
    name: 'Editorial',
    desc: 'Magazine-style layout'
  }
]

export default function TemplatePicker({
  selected,
  onSelect
}: any) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {templates.map((t) => (
        <div
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`cursor-pointer border rounded-xl p-4 hover:shadow-lg transition ${
            selected === t.id ? 'border-black' : ''
          }`}
        >
          <div className="h-40 bg-gray-200 rounded mb-3" />

          <h3 className="font-semibold">{t.name}</h3>
          <p className="text-sm text-gray-500">{t.desc}</p>
        </div>
      ))}
    </div>
  )
}
